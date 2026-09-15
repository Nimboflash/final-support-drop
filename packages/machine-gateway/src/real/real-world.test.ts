import { describe, expect, it } from "vitest";
import { panelSnapshotSchema } from "@drop/panel-domain";
import { machineSession as MACHINE_SESSION } from "@drop/panel-domain/fixtures";
import { GatewayError, isGatewayError } from "../errors";
import type { MachineHttpPort, MachineHttpResult } from "./machine-http-port";
import type { MachineReviewPort } from "./review-store";
import { createRealWorld } from "./real-world";

/**
 * The read-only real adapter (ticket P10, slice 1).
 *
 * The port is a stub rather than a live service on purpose: what is under test
 * is the ADAPTER's behaviour at the boundary — what it does with a 404, with a
 * shape it does not recognise, with no answer at all — and a running service
 * cannot be made to produce those on demand. The projection itself is already
 * proven against a real captured session in `machine-session.test.ts`.
 */
const SESSION_ID = "c18c18e12aea";
const NOW = "2026-09-10T09:00:00Z";

/**
 * A port that answers each call from a script, so failures are reproducible.
 *
 * Every write answers with the same result as the read. That is enough for the
 * cases here, which are about how a STATUS becomes a reason; a write's own
 * behaviour is proven against the real service in `tests/integration/`.
 */
function portReturning(result: MachineHttpResult): MachineHttpPort {
  const answer = (): Promise<MachineHttpResult> => Promise.resolve(result);
  return {
    getSession: answer,
    createSession: answer,
    generateConcepts: answer,
    respondToConcepts: answer,
    approveConcept: answer,
    buildPortfolio: answer,
  };
}

function worldOver(port: MachineHttpPort, review?: MachineReviewPort) {
  return createRealWorld({
    sessionId: SESSION_ID,
    port,
    now: () => NOW,
    workspaceId: "drop-demo",
    ownerId: "actor-guardian",
    // The identity renderer, matching the composition root: ADR-0021 D7 is open
    // and this adapter must not quietly decide it.
    text: { toFa: (value: string) => value, toEn: (value: string) => value },
    review,
  });
}

/** An in-memory review store, so a decision can be made and then read back. */
function memoryReviewStore(): MachineReviewPort {
  const held = new Map<string, string>();
  return {
    read: (sessionId) => held.get(sessionId) ?? null,
    write: (sessionId, payload) => {
      held.set(sessionId, payload);
    },
  };
}

const OK = { status: 200, body: MACHINE_SESSION as unknown };

describe("reading a live session", () => {
  it("projects it into a snapshot the panel accepts", async () => {
    const snapshot = await worldOver(portReturning(OK)).panelCommandGateway.getSnapshot();
    expect(() => panelSnapshotSchema.parse(snapshot)).not.toThrow();
    expect(snapshot.snapshotKind).toBe("drop.panel.machine.v1");
    expect(snapshot.clock).toBe(NOW);
  });

  it("refuses a session id that is not the machine's twelve-hex form", () => {
    // The service uses the id as a filesystem path segment and validates
    // nothing, so the world will not even be constructed around a bad one.
    expect(() =>
      createRealWorld({
        sessionId: "../../etc/passwd",
        port: portReturning(OK),
        now: () => NOW,
        workspaceId: "drop-demo",
        ownerId: "actor-guardian",
        text: { toFa: (value: string) => value },
      }),
    ).toThrow(GatewayError);
  });
});

describe("what the adapter does when the machine does not cooperate", () => {
  /*
    Every one of these must surface as a GatewayError. `states.tsx` reaches the
    degraded branch — content stays on screen under a banner — only for that
    class; a raw TypeError or a ZodError escaping this adapter would wipe the
    surface instead of degrading it. That is the whole reason these cases exist.
  */
  it("turns no answer at all into a disconnected error, not a TypeError", async () => {
    const error = await worldOver(portReturning({ status: 0, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect(isGatewayError(error)).toBe(true);
    expect((error as GatewayError).reason).toBe("MACHINE_SYSTEM_DISCONNECTED");
    expect((error as GatewayError).retryable).toBe(true);
  });

  it("reports an unknown session as UNKNOWN_ID and does not invite a retry", async () => {
    const error = await worldOver(portReturning({ status: 404, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).reason).toBe("UNKNOWN_ID");
    expect((error as GatewayError).retryable).toBe(false);
  });

  it("treats the service's 400-for-a-missing-session as UNKNOWN_ID too", async () => {
    // Not a guess about REST convention: `api.py` returns 400 for a missing
    // session on every POST and 404 only on the GET.
    const error = await worldOver(portReturning({ status: 400, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).reason).toBe("UNKNOWN_ID");
  });

  it("turns an unrecognised shape into a schema failure rather than a ZodError", async () => {
    const error = await worldOver(portReturning({ status: 200, body: { nope: true } }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect(isGatewayError(error)).toBe(true);
    expect((error as GatewayError).reason).toBe("SCHEMA_VALIDATION_FAILED");
  });

  it("never lets the service's own error text reach the message", async () => {
    const leaky = {
      status: 500,
      body: { detail: "OPENROUTER_API_KEY was not found in the environment." },
    };
    const error = await worldOver(portReturning(leaky))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).message).not.toContain("OPENROUTER");
  });
});

describe("what the machine cannot do still refuses, and says something true", () => {
  /*
    The refusals that REMAIN are about the machine's surface rather than about
    permission, and slice 2 is what makes that distinction load-bearing. The
    world used to declare `policy.forbidden`, which made every refusal read as
    «با نقش فعلی، اجازهٔ این کار را ندارید» — true when nothing could be written
    at all. It is false now: generate, refine, approve and build all work.

    So the policy is open, and what is left refused is the set of things the
    machine genuinely has no notion of. It has no calendar, no comments, no
    output plan and no event stream. UNAUTHORIZED is still the closest of the
    eight recorded reasons — ADR-0021 D6 forbids inventing a ninth — and it is
    still the honest answer to "can I do this here": no, and not because of who
    you are.
  */
  const world = worldOver(portReturning(OK));

  it("no longer claims the person may not act, because now they may", () => {
    expect(world.policy.forbidden).toBe(false);
  });

  it.each([
    ["addComment", () => world.panelCommandGateway.addComment({} as never)],
    ["selectConcepts", () => world.panelCommandGateway.selectConcepts({} as never)],
    ["amendOutputPlan", () => world.panelCommandGateway.amendOutputPlan({} as never)],
    ["updateCalendarPackage", () => world.panelCommandGateway.updateCalendarPackage({} as never)],
    ["subscribe", () => world.panelCommandGateway.subscribe(() => {})],
    ["submitApproval", () => world.machineGateway.submitApproval({} as never)],
  ])("%s refuses with a typed error rather than a plausible success", (_name, call) => {
    let thrown: unknown;
    try {
      call();
    } catch (error) {
      thrown = error;
    }
    expect(isGatewayError(thrown)).toBe(true);
    expect((thrown as GatewayError).reason).toBe("UNAUTHORIZED");
  });

  it("a revision route the machine cannot serve refuses rather than guessing", async () => {
    /*
      Only the CONCEPT route maps. The machine builds content and outputs in one
      shot from an approved concept and cannot revise either in place, so a
      content revision has nothing to call — and silently doing nothing, or
      quietly refining the concept instead, would both be worse than refusing.
    */
    await expect(
      world.revisionGateway.requestRevision({ route: "CONTENT_REVISION" } as never),
    ).rejects.toMatchObject({ reason: "UNAUTHORIZED" });
  });

  it("rejecting a CONCEPT refuses, because the machine records no such decision", async () => {
    // `approve_concept` is the machine's only review verb for a concept. There
    // is no reject and no changes-requested, so the panel must not pretend.
    await expect(
      world.review.reviewItem({
        outcome: "REJECTED",
        target: { type: "CONCEPT", id: "mc-x", versionId: "mc-x-v1" },
      } as never),
    ).rejects.toMatchObject({ reason: "UNAUTHORIZED" });
  });

  it("scheduling refuses only when there is nowhere to keep the date", async () => {
    /*
      The machine has no calendar, so a date is the panel's to keep — and a
      world built without somewhere to keep it must say so rather than accept
      the date and lose it. A world WITH a store schedules; that is covered in
      the notes suite below.
    */
    await expect(
      world.panelCommandGateway.updateCalendar({ entry: { id: "cal-1" } } as never),
    ).rejects.toMatchObject({ reason: "UNAUTHORIZED" });
  });

  it("a review command with no target is a schema failure, never a raw TypeError", async () => {
    /*
      A `TypeError` escaping this layer is not a cosmetic difference. Only a
      GatewayError carries a reason, and `states.tsx` reaches its degraded
      branch — content kept on screen under a banner — for a GatewayError alone.
      Anything else falls through to the generic error state and WIPES the
      surface the person was working on.
    */
    await expect(world.review.reviewItem({ outcome: "APPROVED" } as never)).rejects.toMatchObject({
      reason: "SCHEMA_VALIDATION_FAILED",
    });
  });

  it("exportPackage rejects rather than throwing, matching the mock", async () => {
    // An async member that throws synchronously is a different failure mode for
    // the caller than one that rejects; `mock-world.ts` makes the same choice.
    await expect(world.panelCommandGateway.exportPackage("pv-1")).rejects.toBeInstanceOf(
      GatewayError,
    );
  });
});

describe("reviewing machine content, which the machine itself cannot record", () => {
  /*
    The machine builds its portfolio in ONE call and has no per-item write, so
    "I have read this track and it is fine" has nowhere to live on its side.
    That is not a reason to refuse the decision — an output assembles when its
    content is approved, so refusing it strands the work at content with every
    item permanently «آماده بررسی». The decision is the person's, and it is kept
    beside the session.
  */
  it("records an approval and shows it on the next snapshot", async () => {
    const store = memoryReviewStore();
    const world = worldOver(portReturning(OK), store);

    const before = await world.panelCommandGateway.getSnapshot();
    const item = before.content[0];
    expect(item, "the fixture must carry content to review").toBeDefined();
    expect(item!.reviewStatus).not.toBe("APPROVED");

    await world.review.reviewItem({
      commandId: "c-1",
      idempotencyKey: "idem-c-1",
      outcome: "APPROVED",
      reasonFa: "محتوا تأیید شد.",
      target: { type: "CONTENT", id: item!.id, versionId: item!.activeVersionId },
    } as never);

    const after = await world.panelCommandGateway.getSnapshot();
    const reviewed = after.content.find((row) => row.id === item!.id);
    expect(reviewed?.reviewStatus).toBe("APPROVED");
    // Both axes, or `contentStateOf` reads it as approved-but-stale and the
    // output never assembles.
    expect(reviewed?.freshness).toBe("CURRENT");
  });

  it("leaves every other item untouched", async () => {
    const store = memoryReviewStore();
    const world = worldOver(portReturning(OK), store);
    const before = await world.panelCommandGateway.getSnapshot();
    const [first, second] = before.content;
    expect(second, "needs at least two content rows").toBeDefined();

    await world.review.reviewItem({
      commandId: "c-2",
      idempotencyKey: "idem-c-2",
      outcome: "APPROVED",
      reasonFa: null,
      target: { type: "CONTENT", id: first!.id, versionId: first!.activeVersionId },
    } as never);

    const after = await world.panelCommandGateway.getSnapshot();
    const other = after.content.find((row) => row.id === second!.id);
    expect(other?.reviewStatus).toBe(second!.reviewStatus);
  });

  it("refuses when there is nowhere to record it, rather than dropping it", async () => {
    // A world built without a review store is still a correct read-only world.
    // What it must not do is accept the decision and quietly lose it.
    const world = worldOver(portReturning(OK));
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const item = snapshot.content[0];
    await expect(
      world.review.reviewItem({
        commandId: "c-3",
        idempotencyKey: "idem-c-3",
        outcome: "APPROVED",
        reasonFa: null,
        target: { type: "CONTENT", id: item!.id, versionId: item!.activeVersionId },
      } as never),
    ).rejects.toMatchObject({ reason: "UNAUTHORIZED" });
  });

  it("keeps a chosen date and shows it on the next snapshot", async () => {
    // The last step of the work. Without somewhere to keep this, a person could
    // approve their content, watch the output assemble, and then have nowhere
    // to put it.
    const store = memoryReviewStore();
    const world = worldOver(portReturning(OK), store);
    const before = await world.panelCommandGateway.getSnapshot();
    expect(before.calendar, "the machine itself keeps no calendar").toEqual([]);

    const entry = {
      id: "cal-mpk-1",
      projectId: before.projects[0]!.id,
      packageFamilyId: "mpk-1",
      packageVersionId: "mpk-1-v1",
      titleFa: "خروجی آزمایشی",
      status: "PLANNED" as const,
      date: null,
      endDate: null,
      startsAt: null,
      timezone: "Asia/Tehran" as const,
      ownerId: "actor-guardian",
      noteFa: "",
      rowVersion: 0,
    };
    await world.panelCommandGateway.updateCalendar({
      commandId: "c-cal",
      idempotencyKey: "idem-c-cal",
      entry,
    } as never);

    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.calendar).toHaveLength(1);
    expect(after.calendar[0]!.id).toBe("cal-mpk-1");
  });

  it("keeps decisions and dates in the same store without losing either", async () => {
    // One key holds both, so writing one must not clear the other.
    const store = memoryReviewStore();
    const world = worldOver(portReturning(OK), store);
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const item = snapshot.content[0]!;

    await world.review.reviewItem({
      commandId: "c-a",
      idempotencyKey: "idem-c-a",
      outcome: "APPROVED",
      reasonFa: null,
      target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
    } as never);
    await world.panelCommandGateway.updateCalendar({
      commandId: "c-b",
      idempotencyKey: "idem-c-b",
      entry: {
        id: "cal-x",
        projectId: snapshot.projects[0]!.id,
        packageFamilyId: "mpk-1",
        packageVersionId: "mpk-1-v1",
        titleFa: "خروجی",
        status: "PLANNED" as const,
        date: null,
        endDate: null,
        startsAt: null,
        timezone: "Asia/Tehran" as const,
        ownerId: "actor-guardian",
        noteFa: "",
        rowVersion: 0,
      },
    } as never);

    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.calendar).toHaveLength(1);
    expect(after.content.find((row) => row.id === item.id)?.reviewStatus).toBe("APPROVED");
  });

  it("survives a corrupt store by reading as undecided", async () => {
    // Stored state is untrusted input. A hand-edited key must not throw on a
    // surface someone is trying to use.
    const broken: MachineReviewPort = { read: () => "{not json", write: () => undefined };
    const snapshot = await worldOver(portReturning(OK), broken).panelCommandGateway.getSnapshot();
    expect(() => panelSnapshotSchema.parse(snapshot)).not.toThrow();
  });
});
