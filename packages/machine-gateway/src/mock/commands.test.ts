import { describe, expect, it } from "vitest";
import { createFixedClock } from "@drop/mock-data";
import { createMockWorld } from "./mock-world";
import { GatewayError } from "../errors";
import type { CommandEnvelope, Target } from "@drop/panel-domain";

/**
 * Ticket P6, adapter-contract seam — the command behaviours the acceptance
 * journeys name, exercised against the real mock world.
 */
const ENV: CommandEnvelope = {
  commandId: "cmd_p6_01",
  workspaceId: "drop-demo",
  actorId: "actor-guardian",
  actedAsRole: "DROP_GUARDIAN",
  idempotencyKey: "idem_p6_0001",
};

function world(scenarioId: string) {
  return createMockWorld({ scenarioId, clock: createFixedClock() });
}

describe("A05 — a comment never changes an approval status", () => {
  it("leaves the card's review status exactly as it was", async () => {
    const w = world("S05");
    const target: Target = { type: "CONCEPT", id: "c2", versionId: "c2-v2" };
    const before = (await w.panelCommandGateway.getSnapshot()).concepts.find((c) => c.id === "c2");

    await w.panelCommandGateway.addComment({ ...ENV, target, bodyFa: "پیشنهاد اصلاح روایت." });

    const after = (await w.panelCommandGateway.getSnapshot()).concepts.find((c) => c.id === "c2");
    expect(after?.reviewStatus).toBe(before?.reviewStatus);
    // ...and the comment really landed, so this is not vacuous.
    expect((await w.panelCommandGateway.getSnapshot()).comments.some((c) => c.target.id === "c2")).toBe(true);
  });
});

describe("A07 / S18 — a targeted revision touches only its own item", () => {
  it("creates a new version for o4 and leaves o1 and o3 byte-identical", async () => {
    const w = world("S18");
    const before = await w.panelCommandGateway.getSnapshot();
    const siblingsBefore = JSON.stringify(
      before.contentVersions.filter((v) => v.contentId === "o1" || v.contentId === "o3"),
    );
    const o4Before = before.contentVersions.filter((v) => v.contentId === "o4").length;

    await w.revisionGateway.requestRevision({
      ...ENV,
      target: { type: "CONTENT", id: "o4", versionId: "o4-v1" },
      feedbackFa: "لطفاً پیوند با Taste را صریح‌تر کنید.",
      route: "CONTENT_REWRITE",
    });

    const after = await w.panelCommandGateway.getSnapshot();
    expect(after.contentVersions.filter((v) => v.contentId === "o4").length).toBe(o4Before + 1);
    // "Regenerating one film recommendation must not replace music, article or
    // other approved content" (V2 01 §5).
    expect(
      JSON.stringify(after.contentVersions.filter((v) => v.contentId === "o1" || v.contentId === "o3")),
    ).toBe(siblingsBefore);
  });

  it("RESEARCH_REFRESH lifts a block, because supplying the source is what unblocks", async () => {
    // The panel offers «افزودن منبع» beside a blocked item. If this route left
    // the item blocked, that action would change nothing on screen and the
    // person would rightly conclude the panel is broken. Recording the
    // reference is the whole effect: nothing is fetched or extracted
    // (ADR-0019 D2).
    const w = world("S08");
    const before = await w.panelCommandGateway.getSnapshot();
    const blocked = before.content.find((c) => c.generationState === "BLOCKED");
    expect(blocked, "S08 is the blocked-content world").toBeDefined();

    await w.revisionGateway.requestRevision({
      ...ENV,
      target: { type: "CONTENT", id: blocked!.id, versionId: blocked!.activeVersionId },
      feedbackFa: "منبع افزوده شد: https://example.invalid/reference",
      route: "RESEARCH_REFRESH",
    });

    const after = await w.panelCommandGateway.getSnapshot();
    const item = after.content.find((c) => c.id === blocked!.id)!;
    expect(item.generationState).not.toBe("BLOCKED");
    expect(item.blockedReasonFa).toBeNull();
    // The block lifting does not approve anything — it returns the item to
    // review, where a person still decides.
    expect(item.reviewStatus).toBe("REVISION_REQUESTED");
  });

  it("a different route leaves a blocked item blocked", async () => {
    // The unblock is specific to the route that means "the source arrived".
    // A rewrite request is not that, and must not smuggle a state change.
    const w = world("S08");
    const before = await w.panelCommandGateway.getSnapshot();
    const blocked = before.content.find((c) => c.generationState === "BLOCKED")!;

    await w.revisionGateway.requestRevision({
      ...ENV,
      target: { type: "CONTENT", id: blocked.id, versionId: blocked.activeVersionId },
      feedbackFa: "لحن را عوض کن.",
      route: "CONTENT_REWRITE",
    });

    const after = await w.panelCommandGateway.getSnapshot();
    expect(after.content.find((c) => c.id === blocked.id)!.generationState).toBe("BLOCKED");
  });

  it("prior versions stay byte-identical — a revision appends, never overwrites", async () => {
    const w = world("S18");
    const target: Target = { type: "CONTENT", id: "o4", versionId: "o4-v1" };
    const before = (await w.panelCommandGateway.getSnapshot()).contentVersions.filter(
      (v) => v.contentId === "o4",
    );
    await w.revisionGateway.requestRevision({ ...ENV, target, feedbackFa: "بازنگری.", route: "CONTENT_REWRITE" });
    const after = (await w.panelCommandGateway.getSnapshot()).contentVersions.filter(
      (v) => v.contentId === "o4",
    );
    expect(JSON.stringify(after.slice(0, before.length))).toBe(JSON.stringify(before));
  });
});

describe("A15 / S22 — idempotency and conflict", () => {
  it("repeating a commandId returns the original receipt and repeats no effect", async () => {
    const w = world("S05");
    const target: Target = { type: "CONCEPT", id: "c2", versionId: "c2-v2" };
    const command = { ...ENV, expectedRowVersion: undefined, target, outcome: "APPROVED" as const, reasonFa: "تأیید." };

    const first = await w.review.reviewItem(command);
    const countAfterFirst = (await w.panelCommandGateway.getSnapshot()).decisions.length;
    const second = await w.review.reviewItem(command);
    const countAfterSecond = (await w.panelCommandGateway.getSnapshot()).decisions.length;

    expect(countAfterSecond).toBe(countAfterFirst);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("a stale expectedRowVersion is refused as REVISION_CONFLICT with state untouched", async () => {
    const w = world("S22");
    const before = await w.panelCommandGateway.getSnapshot();
    // S22 moved the PROJECT to revision 2 behind the UI's back, so the command
    // that carries a project-level expectedRowVersion is the one that conflicts.
    let thrown: unknown;
    try {
      await w.panelCommandGateway.selectConcepts({
        ...ENV,
        commandId: "cmd_p6_stale",
        expectedRowVersion: 1,
        projectId: "p1",
        conceptVersionIds: ["c1-v1"],
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GatewayError);
    expect((thrown as GatewayError).reason).toBe("REVISION_CONFLICT");
    // Refresh-then-resubmit, never a blind retry (ADR-0019 D10).
    expect((thrown as GatewayError).retryable).toBe(false);
    expect(JSON.stringify(await w.panelCommandGateway.getSnapshot())).toBe(JSON.stringify(before));
  });

  it("after refreshing to the current revision, the same command succeeds", async () => {
    const w = world("S22");
    const current = (await w.panelCommandGateway.getSnapshot()).projects.find((p) => p.id === "p1")!;
    const receipt = await w.panelCommandGateway.selectConcepts({
      ...ENV,
      commandId: "cmd_p6_fresh",
      expectedRowVersion: current.rowVersion,
      projectId: "p1",
      conceptVersionIds: ["c1-v1"],
    });
    expect((receipt as { accepted: boolean }).accepted).toBe(true);
  });
});

describe("A09 / S19 — automatic assembly and calendar idempotence", () => {
  it("the last required approval assembles exactly one package and one entry", async () => {
    const w = world("S19");
    const snapshot = await w.panelCommandGateway.getSnapshot();
    expect(snapshot.packages).toHaveLength(0);
    expect(snapshot.calendar).toHaveLength(0);

    const project = snapshot.projects[0]!;
    // Approve every required item; the last one triggers assembly.
    for (const [index, contentId] of project.outputPlan.requiredContentIds.entries()) {
      const item = snapshot.content.find((c) => c.id === contentId)!;
      await w.review.reviewItem({
        ...ENV,
        commandId: `cmd_assemble_${String(index)}`,
        expectedRowVersion: undefined,
        target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      });
    }

    const after = await w.panelCommandGateway.getSnapshot();
    expect(after.packages).toHaveLength(1);
    // S19 has no target date, so the entry lands in the unscheduled tray as
    // PLANNED with a null date — never on an invented day (ADR-0019 D7).
    expect(after.calendar).toHaveLength(1);
    expect(after.calendar[0]!.status).toBe("PLANNED");
    expect(after.calendar[0]!.date).toBeNull();
  });

  it("re-approving does not mint a second package family", async () => {
    const w = world("S19");
    const snapshot = await w.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0]!;
    for (const round of [0, 1]) {
      for (const [index, contentId] of project.outputPlan.requiredContentIds.entries()) {
        const item = snapshot.content.find((c) => c.id === contentId)!;
        await w.review.reviewItem({
          ...ENV,
          commandId: `cmd_round_${String(round)}_${String(index)}`,
          expectedRowVersion: undefined,
          target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
          outcome: "APPROVED",
          reasonFa: "تأیید.",
        });
      }
    }
    const after = await w.panelCommandGateway.getSnapshot();
    // The key is project + content versions + plan revision, so a retry is the
    // same package rather than a second family (AC-P6.8).
    expect(new Set(after.packages.map((p) => p.familyId)).size).toBe(1);
    expect(after.calendar).toHaveLength(1);
  });

  it("S20's target date places the entry rather than leaving it unscheduled", async () => {
    const w = world("S20");
    const snapshot = await w.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0]!;
    for (const [index, contentId] of project.outputPlan.requiredContentIds.entries()) {
      const item = snapshot.content.find((c) => c.id === contentId)!;
      await w.review.reviewItem({
        ...ENV,
        commandId: `cmd_dated_${String(index)}`,
        expectedRowVersion: undefined,
        target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      });
    }
    const after = await w.panelCommandGateway.getSnapshot();
    expect(after.calendar).toHaveLength(1);
    expect(after.calendar[0]!.date).toBe("2026-09-15");
    // Still PLANNED, never "published", because a date was chosen (V2 01 §7).
    expect(after.calendar[0]!.status).toBe("PLANNED");
  });
});

describe("A16 / S14 — a read-only actor's command is refused", () => {
  it("rejects the direct mock command, not merely the UI affordance", async () => {
    const w = world("S14");
    const before = await w.panelCommandGateway.getSnapshot();
    expect(() =>
      w.review.reviewItem({
        ...ENV,
        target: { type: "CONCEPT", id: "c1", versionId: "c1-v1" },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      }),
    ).toThrow(GatewayError);
    // 18 §4.2 — client-side visibility is never the boundary.
    expect(JSON.stringify(await w.panelCommandGateway.getSnapshot())).toBe(JSON.stringify(before));
  });
});

describe("AC-P6.7 — envelope and receipt discipline", () => {
  it("every receipt names its origin, occurredAt, idempotencyKey and status", async () => {
    const w = world("S05");
    const receipt = (await w.review.reviewItem({
      ...ENV,
      commandId: "cmd_receipt",
      expectedRowVersion: undefined,
      target: { type: "CONCEPT", id: "c2", versionId: "c2-v2" },
      outcome: "APPROVED",
      reasonFa: "تأیید.",
    })) as Record<string, unknown>;
    // 18 §12 — no UI state may claim a real machine operation occurred.
    expect(receipt.origin).toBe("MOCK");
    expect(receipt.occurredAt).toBeTruthy();
    expect(receipt.idempotencyKey).toBeTruthy();
    expect(["ACCEPTED", "SUCCEEDED", "REJECTED"]).toContain(receipt.status);
  });

  it("a null reason is refused before transport, never coerced", async () => {
    const w = world("S05");
    const before = await w.panelCommandGateway.getSnapshot();
    expect(() =>
      w.review.reviewItem({
        ...ENV,
        commandId: "cmd_null_reason",
        target: { type: "CONCEPT", id: "c2", versionId: "c2-v2" },
        outcome: "REJECTED",
        reasonFa: null,
      }),
    ).toThrow(GatewayError);
    expect(JSON.stringify(await w.panelCommandGateway.getSnapshot())).toBe(JSON.stringify(before));
  });
});
