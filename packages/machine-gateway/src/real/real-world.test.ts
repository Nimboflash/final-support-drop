import { describe, expect, it } from "vitest";
import { panelSnapshotSchema } from "@drop/panel-domain";
import { machineSession as MACHINE_SESSION } from "@drop/panel-domain/fixtures";
import { GatewayError, isGatewayError } from "../errors";
import type { MachineHttpPort, MachineHttpResult } from "./machine-http-port";
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

function worldOver(port: MachineHttpPort) {
  return createRealWorld({
    sessionId: SESSION_ID,
    port,
    now: () => NOW,
    workspaceId: "drop-demo",
    ownerId: "actor-guardian",
    // The identity renderer, matching the composition root: ADR-0021 D7 is open
    // and this adapter must not quietly decide it.
    text: { toFa: (value: string) => value, toEn: (value: string) => value },
  });
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
    ["updateCalendar", () => world.panelCommandGateway.updateCalendar({} as never)],
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

  it("a review decision other than approval refuses, because the machine records none", async () => {
    // `approve_concept` is the machine's only review verb. There is no reject
    // and no changes-requested, so the panel must not pretend to record one.
    await expect(
      world.review.reviewItem({ outcome: "REJECTED" } as never),
    ).rejects.toMatchObject({ reason: "UNAUTHORIZED" });
  });

  it("exportPackage rejects rather than throwing, matching the mock", async () => {
    // An async member that throws synchronously is a different failure mode for
    // the caller than one that rejects; `mock-world.ts` makes the same choice.
    await expect(world.panelCommandGateway.exportPackage("pv-1")).rejects.toBeInstanceOf(
      GatewayError,
    );
  });
});

