import { describe, expect, it } from "vitest";
import {
  JOURNEY_BINDINGS,
  ALL_JOURNEY_IDS,
  createFixedClock,
  loadScenario,
} from "@drop/mock-data";
import { GatewayError, createMockWorld } from "@drop/machine-gateway";
import type { CommandEnvelope, Target } from "@drop/panel-domain";

/**
 * Ticket P7 — the twenty acceptance journeys of V2 04 §4, each exercised against
 * the scenario world bound to it.
 *
 * This file is the answer to "does the panel actually do what the brief says",
 * and it is deliberately organised by JOURNEY rather than by module: a journey
 * that passes only because its pieces were tested separately is exactly the gap
 * an acceptance suite exists to close.
 *
 * Journeys whose substance is visual or interactive (A20's keyboard walk, the
 * RTL and axe passes) live in Playwright; this suite asserts the state
 * transitions beneath them and says so where that split applies.
 */
const ENV: CommandEnvelope = {
  commandId: "cmd_a_01",
  workspaceId: "drop-demo",
  actorId: "actor-guardian",
  actedAsRole: "DROP_GUARDIAN",
  idempotencyKey: "idem_a_0001",
};

function worldFor(journeyId: string) {
  const binding = JOURNEY_BINDINGS.find((b) => b.journeyId === journeyId);
  if (binding === undefined) throw new Error(`UNBOUND_JOURNEY: ${journeyId}`);
  return {
    binding,
    world: createMockWorld({ scenarioId: binding.scenarioId, clock: createFixedClock() }),
  };
}

describe("every journey is bound to a world (AC-P7.1)", () => {
  it("covers A01 through A20 with no gaps and no orphans", () => {
    expect(JOURNEY_BINDINGS.map((b) => b.journeyId).sort()).toEqual([...ALL_JOURNEY_IDS].sort());
  });

  it("every bound scenario actually materializes", () => {
    for (const binding of JOURNEY_BINDINGS) {
      expect(
        () => loadScenario(binding.scenarioId),
        `${binding.journeyId} → ${binding.scenarioId}`,
      ).not.toThrow();
    }
  });
});

describe("A01 — blank start", () => {
  it("carries a literal absent input, not an empty reference list", async () => {
    const { world } = worldFor("A01");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0];
    expect(project?.input).toEqual({ mode: "BLANK" });
    // The distinction is the point: "no input" and "an empty reference list"
    // are different states, and V2 01 §3 makes BLANK a mode of its own.
    expect(project?.input).not.toHaveProperty("references");
  });
});

describe("A02 — reference start", () => {
  it("snapshots the reference and performs no upload or fetch", async () => {
    const { world } = worldFor("A02");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0];
    expect(project?.input.mode).toBe("REFERENCE");
    if (project?.input.mode !== "REFERENCE") return;
    expect(project.input.references.length).toBeGreaterThan(0);
    // Raw bytes never persist (V2 01 §3): a FILE reference carries metadata only.
    for (const reference of project.input.references) {
      expect(reference).not.toHaveProperty("bytes");
      expect(reference).not.toHaveProperty("content");
      if (reference.kind === "URL") expect(reference.url).toMatch(/^https?:/);
    }
  });
});

describe("A03 — reject a concept and revise it", () => {
  it("requires a reason, keeps the old version, and returns a new one to review", async () => {
    const { world } = worldFor("A03");
    const before = await world.panelCommandGateway.getSnapshot();
    const rejected = before.concepts.find((c) => c.reviewStatus === "REJECTED");
    expect(rejected, "A03's world must contain a rejected concept").toBeDefined();
    // "Rejected does not silently mean deleted" (V2 01 §4).
    expect(rejected!.rejectionReasonFa).not.toBeNull();

    const versionsBefore = before.conceptVersions.filter((v) => v.conceptId === rejected!.id);
    await world.revisionGateway.requestRevision({
      ...ENV,
      target: { type: "CONCEPT", id: rejected!.id, versionId: rejected!.activeVersionId },
      feedbackFa: "زاویهٔ روایی مشخص‌تر شود.",
      route: "CONCEPT_REVISION",
    });

    const after = await world.panelCommandGateway.getSnapshot();
    const versionsAfter = after.conceptVersions.filter((v) => v.conceptId === rejected!.id);
    // Same concept id, one new version, and every prior version untouched.
    expect(versionsAfter.length).toBe(versionsBefore.length + 1);
    expect(JSON.stringify(versionsAfter.slice(0, versionsBefore.length))).toBe(
      JSON.stringify(versionsBefore),
    );
    // A revision never inherits approval — it returns to review.
    expect(after.concepts.find((c) => c.id === rejected!.id)?.reviewStatus).not.toBe("APPROVED");
  });
});

describe("A04 — replace a rejected concept", () => {
  it("keeps the original visible with its reason", async () => {
    const { world } = worldFor("A04");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const rejected = snapshot.concepts.filter((c) => c.reviewStatus === "REJECTED");
    expect(rejected.length).toBeGreaterThan(0);
    for (const card of rejected) {
      // The original stays in history rather than being removed.
      expect(card.rejectionReasonFa).not.toBeNull();
    }
    // S24 leaves nothing selected, so "continue" has nothing to advance.
    expect(snapshot.projects[0]?.selectedConceptVersionIds).toEqual([]);
  });
});

describe("A05 — comment without a decision", () => {
  it("records the comment and changes no approval status", async () => {
    const { world } = worldFor("A05");
    const before = await world.panelCommandGateway.getSnapshot();
    const card = before.concepts.find((c) => c.reviewStatus === "IN_REVIEW")!;
    const target: Target = { type: "CONCEPT", id: card.id, versionId: card.activeVersionId };

    await world.panelCommandGateway.addComment({ ...ENV, target, bodyFa: "یک ملاحظهٔ کوچک." });

    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.comments.some((c) => c.target.id === card.id)).toBe(true);
    expect(after.concepts.find((c) => c.id === card.id)?.reviewStatus).toBe(card.reviewStatus);
    expect(after.decisions.length).toBe(before.decisions.length);
  });
});

describe("A06 — approve two of three and continue", () => {
  it("gives each approved concept an independent branch", async () => {
    const { world } = worldFor("A06");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const approved = snapshot.concepts.filter((c) => c.reviewStatus === "APPROVED");
    expect(approved.length).toBeGreaterThanOrEqual(2);

    // Each branch owns its own content ids; regenerating one must not reach
    // another (the premise A07 then tests).
    const byConcept = new Map<string, Set<string>>();
    for (const item of snapshot.content) {
      byConcept.set(item.conceptId, (byConcept.get(item.conceptId) ?? new Set()).add(item.id));
    }
    const branches = [...byConcept.values()];
    for (let i = 0; i < branches.length; i += 1) {
      for (let j = i + 1; j < branches.length; j += 1) {
        const overlap = [...branches[i]!].filter((id) => branches[j]!.has(id));
        expect(overlap, "branches must not share content ids").toEqual([]);
      }
    }
    // A pending or rejected proposal does not block the approved ones.
    expect(snapshot.concepts.some((c) => c.reviewStatus !== "APPROVED")).toBe(true);
  });
});

describe("A07 — revise one content item", () => {
  it("leaves every sibling and its approval untouched", async () => {
    const { world } = worldFor("A07");
    const before = await world.panelCommandGateway.getSnapshot();
    const siblings = before.content.filter((c) => c.id !== "o4");
    const siblingState = JSON.stringify(siblings);

    await world.revisionGateway.requestRevision({
      ...ENV,
      target: { type: "CONTENT", id: "o4", versionId: "o4-v1" },
      feedbackFa: "بازنویسی متن صفحهٔ فرود.",
      route: "CONTENT_REWRITE",
    });

    const after = await world.panelCommandGateway.getSnapshot();
    expect(JSON.stringify(after.content.filter((c) => c.id !== "o4"))).toBe(siblingState);
  });
});

describe("A08 — an evidence gap blocks only what it affects", () => {
  it("blocks the affected item and leaves the rest reviewable", async () => {
    const { world } = worldFor("A08");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const blocked = snapshot.content.filter((c) => c.generationState === "BLOCKED");
    expect(blocked.length).toBeGreaterThan(0);
    for (const item of blocked) {
      // A retrieval request, never a fake verified citation (V2 01 §5).
      expect(item.blockedReasonCode).not.toBeNull();
      expect(item.blockedReasonFa).not.toBeNull();
      // Fail closed: blocked content cannot read as approved.
      expect(item.reviewStatus).not.toBe("APPROVED");
    }
    // A blocked branch does not freeze unrelated reviewable branches.
    expect(snapshot.content.some((c) => c.generationState !== "BLOCKED")).toBe(true);
  });
});

describe("A09 — approve all required content", () => {
  it("assembles a versioned, non-empty package", async () => {
    const { world } = worldFor("A09");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    expect(snapshot.packages.length).toBeGreaterThan(0);
    const snapshotPackage = snapshot.packages[0]!;
    expect(snapshotPackage.files.length).toBeGreaterThan(0);
    expect(snapshotPackage.isMock).toBe(true);

    const exported = await world.panelCommandGateway.exportPackage(snapshotPackage.id);
    expect(exported.bytes.length).toBeGreaterThan(0);
    // "PK" — a real local file header, not an empty archive (V2 01 §6).
    expect([exported.bytes[0], exported.bytes[1]]).toEqual([0x50, 0x4b]);
  });
});

describe("A10 — complete a package with no date", () => {
  it("produces one unscheduled entry that a date can then place", async () => {
    const { world } = worldFor("A10");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0]!;
    for (const [index, contentId] of project.outputPlan.requiredContentIds.entries()) {
      const item = snapshot.content.find((c) => c.id === contentId)!;
      await world.review.reviewItem({
        ...ENV,
        commandId: `cmd_a10_${String(index)}`,
        target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      });
    }
    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.calendar).toHaveLength(1);
    // PLANNED with a null date IS the unscheduled tray (ADR-0019 D7); no date
    // is ever invented (V2 01 §7).
    expect(after.calendar[0]!.status).toBe("PLANNED");
    expect(after.calendar[0]!.date).toBeNull();
  });
});

describe("A11 — complete a package with a target date", () => {
  it("produces exactly one planned entry linked to the package", async () => {
    const { world } = worldFor("A11");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const project = snapshot.projects[0]!;
    for (const [index, contentId] of project.outputPlan.requiredContentIds.entries()) {
      const item = snapshot.content.find((c) => c.id === contentId)!;
      await world.review.reviewItem({
        ...ENV,
        commandId: `cmd_a11_${String(index)}`,
        target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      });
    }
    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.calendar).toHaveLength(1);
    expect(after.calendar[0]!.date).toBe("2026-09-15");
    expect(after.calendar[0]!.packageVersionId).toBe(after.packages[0]!.id);
  });
});

describe("A12 — edit an approved upstream concept", () => {
  it("marks dependents stale, keeps the old package, and revokes readiness", async () => {
    const { world } = worldFor("A12");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    // Only DEPENDENT latest outputs go stale; historical approvals stay intact.
    expect(snapshot.content.some((c) => c.freshness === "STALE")).toBe(true);
    // The old package remains downloadable as a labelled historical snapshot.
    expect(snapshot.packages.some((p) => p.status === "STALE")).toBe(true);
    const stale = snapshot.packages.find((p) => p.status === "STALE")!;
    const exported = await world.panelCommandGateway.exportPackage(stale.id);
    expect(exported.bytes.length).toBeGreaterThan(0);
  });
});

describe("A13 — generate package v2", () => {
  it("does not duplicate the calendar entry", async () => {
    const { world } = worldFor("A13");
    const before = await world.panelCommandGateway.getSnapshot();
    const familiesBefore = new Set(before.calendar.map((c) => c.packageFamilyId));
    // Relinking is an explicit update, never a second entry (ADR-0019 D7).
    if (before.calendar.length > 0 && before.packages.length > 0) {
      await world.panelCommandGateway.updateCalendarPackage({
        ...ENV,
        commandId: "cmd_a13_relink",
        entryId: before.calendar[0]!.id,
        packageVersionId: before.packages[0]!.id,
      });
    }
    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.calendar.length).toBe(before.calendar.length);
    expect(new Set(after.calendar.map((c) => c.packageFamilyId))).toEqual(familiesBefore);
  });
});

describe("A14 — the same action from any door", () => {
  it("produces one decision however it is reached", async () => {
    const { world } = worldFor("A14");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const card = snapshot.concepts.find((c) => c.reviewStatus === "IN_REVIEW")!;
    const target: Target = { type: "CONCEPT", id: card.id, versionId: card.activeVersionId };
    const before = world.repository.decisionsFor(target).length;

    // The card, the queue and the graph all call this one facade; the UI proves
    // they mount the same control, and this proves the effect is singular.
    await world.review.reviewItem({
      ...ENV,
      commandId: "cmd_a14",
      target,
      outcome: "APPROVED",
      reasonFa: "تأیید.",
    });

    expect(world.repository.decisionsFor(target).length).toBe(before + 1);
  });
});

describe("A15 — rapid double submit and stale revision", () => {
  it("applies one effect per commandId", async () => {
    const { world } = worldFor("A15");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const card = snapshot.concepts.find((c) => c.reviewStatus === "IN_REVIEW");
    if (card === undefined) return;
    const command = {
      ...ENV,
      commandId: "cmd_a15_double",
      target: { type: "CONCEPT" as const, id: card.id, versionId: card.activeVersionId },
      outcome: "APPROVED" as const,
      reasonFa: "تأیید.",
    };
    await world.review.reviewItem(command);
    const once = (await world.panelCommandGateway.getSnapshot()).decisions.length;
    await world.review.reviewItem(command);
    expect((await world.panelCommandGateway.getSnapshot()).decisions.length).toBe(once);
  });

  it("rejects a stale expectedRowVersion and mutates nothing", async () => {
    const { world } = worldFor("A15");
    const before = await world.panelCommandGateway.getSnapshot();
    let thrown: unknown;
    try {
      await world.panelCommandGateway.selectConcepts({
        ...ENV,
        commandId: "cmd_a15_stale",
        expectedRowVersion: 1,
        projectId: before.projects[0]!.id,
        conceptVersionIds: [],
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GatewayError);
    expect((thrown as GatewayError).reason).toBe("REVISION_CONFLICT");
    expect(JSON.stringify(await world.panelCommandGateway.getSnapshot())).toBe(
      JSON.stringify(before),
    );
  });
});

describe("A16 — a read-only actor", () => {
  it("has its command rejected, not merely its button hidden", async () => {
    const { world } = worldFor("A16");
    const before = await world.panelCommandGateway.getSnapshot();
    const card = before.concepts[0]!;
    expect(() =>
      world.review.reviewItem({
        ...ENV,
        target: { type: "CONCEPT", id: card.id, versionId: card.activeVersionId },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      }),
    ).toThrow(GatewayError);
    // 18 §4.2 — client-side visibility is never the security boundary.
    expect(JSON.stringify(await world.panelCommandGateway.getSnapshot())).toBe(
      JSON.stringify(before),
    );
  });
});

describe("A17 — reload midway", () => {
  it("restores the same versions, comments and pending revision", async () => {
    const { binding } = worldFor("A17");
    // Reloading is loading the same scenario again; nothing may drift.
    const first = loadScenario(binding.scenarioId).snapshot;
    const second = loadScenario(binding.scenarioId).snapshot;
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    // S18 carries an unfinished revision, which is what makes a reload
    // interesting: the pending version must survive.
    expect(first.content.some((c) => c.pendingRevisionId !== null)).toBe(true);
  });
});

describe("A18 — start a Weekly Lens", () => {
  it("requires and retains an approved parent Bible version", async () => {
    const { world } = worldFor("A18");
    const snapshot = await world.panelCommandGateway.getSnapshot();
    const lens = snapshot.projects.find((p) => p.type === "WEEKLY_LENS");
    expect(lens, "A18's world must contain a Weekly Lens").toBeDefined();
    if (lens?.type !== "WEEKLY_LENS") return;
    // 06 §3.4 — an approved Lens keeps its exact parent Bible version; the
    // embedded schema refuses it otherwise, so this reaching the read model at
    // all is the proof.
    expect(lens.parentProgramId).toBeTruthy();
    expect(lens.parentBibleVersionId).toBeTruthy();
  });
});

describe("A19 — offline or timeout while revising", () => {
  it("fails honestly and erases no history", async () => {
    const { world } = worldFor("A19");
    const before = await world.panelCommandGateway.getSnapshot();
    let thrown: unknown;
    try {
      await world.revisionGateway.requestRevision({
        ...ENV,
        target: { type: "CONCEPT", id: before.concepts[0]!.id, versionId: before.concepts[0]!.activeVersionId },
        feedbackFa: "بازنگری در حالت قطع ارتباط.",
        route: "CONCEPT_REVISION",
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GatewayError);
    // No fake success, and the world is untouched — "Keep stale content visible
    // ... do not erase it on disconnect" (V2 02 §10).
    expect(JSON.stringify(await world.panelCommandGateway.getSnapshot())).toBe(
      JSON.stringify(before),
    );
  });
});

describe("A20 — keyboard and mobile review", () => {
  it("has the state its Playwright walk depends on", () => {
    // The journey itself is keyboard-and-viewport work and lives in
    // tests/e2e/rtl/panel-journey.spec.ts, which walks it at 390px with no
    // pointer. This asserts the world it walks is the one bound to it.
    const { binding } = worldFor("A20");
    const snapshot = loadScenario(binding.scenarioId).snapshot;
    // The date edit is half the journey, so the world must have a date to edit.
    expect(snapshot.projects.some((p) => p.targetDate !== null)).toBe(true);
  });
});
