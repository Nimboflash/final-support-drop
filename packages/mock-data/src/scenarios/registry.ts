import { panelSnapshotSchema, type PanelSnapshot } from "@drop/panel-domain";
import { DEMO_EPOCH } from "../ports";
import type { Scenario } from "./types";
import {
  addConceptVersion,
  addContentVersion,
  asWorld,
  concept,
  content,
  keepOnlyProjects,
  project,
} from "./helpers";

/**
 * All twenty-four scenarios (AC-P3.5).
 *
 * **S01–S14 are the fourteen (18 §7.2) scenarios, 1:1 and in recorded order.**
 * ADR-0018 D4 makes them untrimmable, and `scenarios.test.ts` compares their
 * names and order against a committed copy of that list so a trim, insert or
 * renumber is a red check rather than a review catch. S15–S24 are the additive
 * ten ADR-0019 D15 permits.
 *
 * Each recipe carries the pack's `setup` and `action` lines verbatim, so the
 * English requirement and the code implementing it can be read against each
 * other without leaving the file.
 *
 * Every `apply` receives a FRESH deep copy and returns a re-parsed world: a
 * recipe that produces something the P2 schemas reject fails here, at load,
 * rather than at whichever surface first reads the broken row.
 */

function build(apply: (world: ReturnType<typeof asWorld>) => void) {
  return (snapshot: PanelSnapshot): PanelSnapshot => {
    const world = asWorld(snapshot);
    apply(world);
    return panelSnapshotSchema.parse(world);
  };
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "S01",
    name: "No Programs yet",
    acceptanceId: "A01",
    setup: "Clear all project-owned records, including packages and calendar.",
    action: "Start blank journey",
    apply: build((world) => {
      keepOnlyProjects(world, []);
    }),
  },
  {
    id: "S02",
    name: "Draft Program without run",
    acceptanceId: "A01",
    setup: "Create p4 draft with input=null, no selected concepts, empty output plan.",
    action: "Resume draft",
    // p4 is already this shape in the base world (density promotes S02's
    // definition, not S03's) — so this scenario narrows to it rather than
    // rebuilding it, and the two stay in step by construction.
    apply: build((world) => {
      keepOnlyProjects(world, ["p4"]);
      const p4 = project(world, "p4");
      p4.input = { mode: "BLANK" };
      p4.selectedConceptVersionIds = [];
      p4.outputPlan = {
        revision: 1,
        includedConceptIds: [],
        requiredContentIds: [],
        optionalContentIds: [],
      };
    }),
  },
  {
    id: "S03",
    name: "Ready to start",
    acceptanceId: "A02",
    setup: "Create p4 draft with valid text reference and empty output plan.",
    action: "Start once",
    // THE COLLISION (AC-P3.6). S02 and S03 define the SAME id incompatibly.
    // This variant exists only inside S03; the base keeps S02's, because S02 is
    // one of the untrimmable fourteen. Loading S03, mutating it, then loading
    // S02 must still yield `input.mode === "BLANK"` — which is only true if the
    // overlay really works on a fresh copy.
    apply: build((world) => {
      keepOnlyProjects(world, ["p4"]);
      const p4 = project(world, "p4");
      p4.input = {
        mode: "REFERENCE",
        references: [
          { kind: "TEXT", text: "نمونه رفرنس متنی برای شروع مسیر: توجه به رد دست در ساخت." },
        ],
      };
      p4.outputPlan = {
        revision: 1,
        includedConceptIds: [],
        requiredContentIds: [],
        optionalContentIds: [],
      };
    }),
  },
  {
    id: "S04",
    name: "Active machine stage",
    acceptanceId: "A06",
    setup:
      "Use p1; add repo-compatible run/stage attempt running; hide not-yet-generated outputs in its branch.",
    action: "Advance injected clock",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      // "Partial generation shows completed cards while others run" (V2 02 §7):
      // the still-running items are QUEUED, not absent, so the branch shows work
      // in progress rather than a hole.
      for (const item of world.content.filter((c) => c.reviewStatus === "IN_REVIEW")) {
        item.generationState = "RUNNING";
      }
    }),
  },
  {
    id: "S05",
    name: "Human concept review",
    acceptanceId: "A03",
    setup: "Use c2-v2 in_review with existing history.",
    action: "Approve current version",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const c2 = concept(world, "c2");
      c2.reviewStatus = "IN_REVIEW";
      c2.pendingRevisionId = null;
    }),
  },
  {
    id: "S06",
    name: "Rejection loop",
    acceptanceId: "A03",
    setup: "Use rejected c3-v1 with saved reason.",
    action: "Reject and revise, then complete revision",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const c3 = concept(world, "c3");
      c3.reviewStatus = "REJECTED";
      // V2 01 §4 — "Rejected does not silently mean deleted". The reason is
      // retained and shown, and the card stays visible in history.
      c3.rejectionReasonFa = "ایده به قلمرو DROP نزدیک نیست؛ زاویهٔ روایی مشخصی ندارد.";
    }),
  },
  {
    id: "S07",
    name: "Missing input",
    acceptanceId: "A18",
    setup: "Create draft Weekly Lens with no parent Bible and reference mode with empty references.",
    action: "Attempt start",
    // Fail closed (00 §4). Both halves are invalid on purpose: a Lens with no
    // approved parent Bible, and a REFERENCE start with nothing in it. The
    // schemas reject the second outright, so the world carries the first and the
    // UI must refuse the start rather than the loader crashing.
    apply: build((world) => {
      keepOnlyProjects(world, ["p3"]);
      const p3 = project(world, "p3");
      p3.input = { mode: "BLANK" };
      p3.selectedConceptVersionIds = [];
    }),
  },
  {
    id: "S08",
    name: "Unavailable external source",
    acceptanceId: "A08",
    setup: "Use o2 blocked by s3 with retrieval-s3.",
    action: "Open coverage and retry unavailable source",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const o2 = content(world, "o2");
      o2.generationState = "BLOCKED";
      o2.blockedReasonCode = "SOURCE_ACCESS_BLOCKED";
      o2.blockedReasonFa = "مرجع لازم در دسترس نیست؛ بازیابی انسانی لازم است.";
      // V2 01 §5 — "An unavailable source produces a gap/retrieval request,
      // never a fake verified citation", and retry must not mark it verified.
      o2.reviewStatus = "IN_REVIEW";
    }),
  },
  {
    id: "S09",
    name: "Retryable stage failure",
    acceptanceId: "A19",
    setup: "Add failed content attempt for o4 with retryable=true; keep other items unchanged.",
    action: "Retry same input",
    policy: { failure: { code: "GENERATION_FAILED", retryable: true } },
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const o4 = content(world, "o4");
      o4.generationState = "FAILED";
      // "keep other items unchanged" is the point: a failed branch must not
      // freeze unrelated reviewable branches (V2 01 §5).
    }),
  },
  {
    id: "S10",
    name: "Non-retryable failure",
    acceptanceId: "A19",
    setup: "Use failed run attempt with retryable=false and diagnostic code CONTRACT_INCOMPATIBLE.",
    action: "Inspect failure",
    policy: { failure: { code: "CONTRACT_INCOMPATIBLE", retryable: false } },
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const o4 = content(world, "o4");
      o4.generationState = "FAILED";
      o4.blockedReasonCode = "CONTRACT_INCOMPATIBLE";
      o4.blockedReasonFa = "قرارداد خروجی با نسخهٔ فعلی سازگار نیست؛ تلاش دوباره کمکی نمی‌کند.";
    }),
  },
  {
    id: "S11",
    name: "Completed approved artifacts",
    acceptanceId: "A09",
    setup: "Use p2, pkg-p2-v1 and matching calendar entry.",
    action: "Download package",
    apply: build((world) => {
      keepOnlyProjects(world, ["p2"]);
    }),
  },
  {
    id: "S12",
    name: "Approved-parent Weekly Lens",
    acceptanceId: "A18",
    setup: "Use p3 linked to p2/bible-p2-v1.",
    action: "Start with inherited Bible",
    apply: build((world) => {
      keepOnlyProjects(world, ["p2", "p3"]);
      const p3 = project(world, "p3");
      if (p3.type !== "WEEKLY_LENS") throw new Error("S12_EXPECTS_A_WEEKLY_LENS");
      // 06 §3.4 — an approved Lens keeps its exact parent Bible version and a
      // current context artifact; the embedded schema refuses it otherwise.
      p3.parentProgramId = "p2";
      p3.parentBibleVersionId = "bible-p2-v1";
    }),
  },
  {
    id: "S13",
    name: "Disconnected machine system",
    acceptanceId: "A19",
    setup: "Preserve snapshot; gateway reports disconnected and mutations unavailable.",
    action: "Refresh then restore scenario connection",
    // V2 02 §10 — "Keep stale content visible with last-sync timestamp; do not
    // erase it on disconnect." The world is untouched; only the policy changes.
    policy: { disconnected: true },
    apply: build(() => undefined),
  },
  {
    id: "S14",
    name: "Unauthorized actor",
    acceptanceId: "A16",
    setup: "Set actor-viewer; keep p1 data.",
    action: "Attempt approve via UI and direct mock command",
    // Journey A16 — the action is unavailable in the UI AND the direct mock
    // command is rejected. Client-side visibility is never the boundary
    // (18 §4.2), so both halves must hold.
    policy: { forbidden: true },
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
    }),
  },

  /* ---------------- S15–S24: additive (ADR-0019 D15) ---------------- */

  {
    id: "S15",
    name: "Blank discovery",
    acceptanceId: "A01",
    setup: "Create new Program with explicit null input, seed=1.",
    action: "Start and rotate seeded candidate batch",
    discoverySeed: 1,
    apply: build((world) => {
      keepOnlyProjects(world, ["p4"]);
      project(world, "p4").input = { mode: "BLANK" };
    }),
  },
  {
    id: "S16",
    name: "Reference discovery",
    acceptanceId: "A02",
    setup: "New Program with file metadata and URL reference, seed=2.",
    action: "Validate bad files then start valid input",
    // The one seed override in the pack: S16 advances to batch 2, which is what
    // makes "Advancing the seed yields a different predefined batch" checkable.
    discoverySeed: 2,
    apply: build((world) => {
      keepOnlyProjects(world, ["p4"]);
      project(world, "p4").input = {
        mode: "REFERENCE",
        references: [
          { kind: "FILE", name: "reference-notes.pdf", sizeBytes: 482_000, mimeType: "application/pdf" },
          { kind: "URL", url: "https://drop-demo.invalid/international/craft-essay" },
        ],
      };
    }),
  },
  {
    id: "S17",
    name: "Two approved branches",
    acceptanceId: "A06",
    setup:
      "Approve c2-v2 as a distinct decision; select c1-v1 and c2-v2; create four independent content IDs for c2.",
    action: "Continue with two approved concepts",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const c2 = concept(world, "c2");
      c2.reviewStatus = "APPROVED";
      const p1 = project(world, "p1");
      p1.selectedConceptVersionIds = ["c1-v1", "c2-v2"];
      p1.outputPlan = {
        revision: 2,
        includedConceptIds: ["c1", "c2"],
        requiredContentIds: ["o1", "o2", "o3", "o4", "o7", "o8", "o9", "o10"],
        optionalContentIds: [],
      };
      // Four INDEPENDENT content ids for c2: regenerating one of c1's items must
      // not touch these, which is the whole point of journey A07.
      const types = ["EDITORIAL", "FILM", "MUSIC", "LANDING"] as const;
      types.forEach((type, index) => {
        const id = `o${String(7 + index)}`;
        world.content.push({
          id,
          projectId: "p1",
          conceptId: "c2",
          type,
          activeVersionId: `${id}-v1`,
          reviewStatus: "IN_REVIEW",
          freshness: "CURRENT",
          editorialStatus: "PENDING",
          generationState: "SUCCEEDED",
          blockedReasonCode: null,
          blockedReasonFa: null,
          pendingRevisionId: null,
          rowVersion: 1,
          updatedAt: DEMO_EPOCH,
        });
        world.contentVersions.push({
          id: `${id}-v1`,
          contentId: id,
          conceptVersionId: "c2-v2",
          number: 1,
          titleFa: `خروجی نمونه برای کانسپت دوم (${String(index + 1)})`,
          bodyFa: "متن نمونهٔ فارسی برای شاخهٔ دوم؛ این محتوا واقعی نیست.",
          sourceIds: ["s2"],
          createdAt: DEMO_EPOCH,
        });
      });
    }),
  },
  {
    id: "S18",
    name: "Targeted content revision",
    acceptanceId: "A07",
    setup: "Use p1; request revision of o4, store feedback and pendingRevisionId.",
    action: "Complete o4-v2; do not touch o1/o3",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      const o4 = content(world, "o4");
      o4.reviewStatus = "REVISION_REQUESTED";
      // V2 01 §8 — "show pending revision on the old active version meanwhile":
      // the active version does NOT move until generation completes.
      const pending = addContentVersion(world, "o4", {
        titleFa: "نسخهٔ بازنگری‌شدهٔ صفحهٔ فرود",
        bodyFa: "متن بازنگری‌شده پس از بازخورد سردبیر؛ نمونهٔ نمایشی.",
      });
      o4.pendingRevisionId = pending;
    }),
  },
  {
    id: "S19",
    name: "Ready package without date",
    acceptanceId: "A10",
    setup:
      "Use p2 clone p5 with fresh consistent IDs, no calendar entry, targetDate=null; all required output approvals present.",
    action: "Complete package assembly twice with same commandId",
    apply: build((world) => {
      keepOnlyProjects(world, ["p5"]);
      const p5 = project(world, "p5");
      p5.targetDate = null;
      // No package and no calendar entry yet: assembly is what this scenario
      // exercises, and running it twice with one commandId must produce one.
      world.packages = [];
      world.calendar = [];
      for (const item of world.content) item.reviewStatus = "APPROVED";
    }),
  },
  {
    id: "S20",
    name: "Ready package with target date",
    acceptanceId: "A11",
    setup: "Use p2 clone p6 with fresh IDs, targetDate=2026-09-15, no existing package/calendar.",
    action: "Complete packaging and reschedule",
    apply: build((world) => {
      keepOnlyProjects(world, ["p6"]);
      project(world, "p6").targetDate = "2026-09-15";
      world.packages = [];
      world.calendar = [];
      for (const item of world.content) item.reviewStatus = "APPROVED";
    }),
  },
  {
    id: "S21",
    name: "Stale downstream package",
    acceptanceId: "A12",
    setup: "Use p2; explicitly revise c4-v1 to c4-v2, mark o5/o6 stale and pkg-p2-v1 stale.",
    action: "Review impacts and rebuild after affected reviews",
    apply: build((world) => {
      keepOnlyProjects(world, ["p2"]);
      // A new upstream concept version marks only DEPENDENT latest outputs
      // stale; historical approvals stay intact and the old package stays
      // downloadable as a labelled snapshot (V2 01 §6).
      addConceptVersion(world, "c4", {
        titleFa: "آیین مکث — نسخهٔ بازنگری‌شده",
        feedbackAppliedFa: "زاویهٔ روایی صریح‌تر شد.",
      });
      const c4 = concept(world, "c4");
      c4.activeVersionId = "c4-v2";
      c4.freshness = "CURRENT";
      for (const item of world.content) item.freshness = "STALE";
      for (const snapshot of world.packages) snapshot.status = "STALE";
    }),
  },
  {
    id: "S22",
    name: "Version conflict and double click",
    acceptanceId: "A15",
    setup: "Read project revision=1 then simulate competing mutation to revision=2.",
    action: "Submit expectedRevision=1; later repeat successful commandId",
    // The competing writer has already moved p1 on. A command carrying the
    // revision the UI read must be rejected as REVISION_CONFLICT, with the
    // user's typed feedback preserved (V2 03 §4).
    policy: { staleRevision: { aggregateId: "p1", actual: 2 } },
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      project(world, "p1").rowVersion = 2;
    }),
  },
  {
    id: "S23",
    name: "Packaging failure",
    acceptanceId: "A09",
    setup: "Use p2 clone p7, all required approved, assembly job failed with retryable=true.",
    action: "Retry assembly without rerunning content",
    // V2 01 §6 — "Assembly failure is retryable without regenerating content."
    // Every required item stays APPROVED so a retry has nothing to redo.
    policy: { failure: { code: "ASSEMBLY_FAILED", retryable: true } },
    apply: build((world) => {
      keepOnlyProjects(world, ["p7"]);
      world.packages = [];
      for (const item of world.content) {
        item.reviewStatus = "APPROVED";
        item.generationState = "SUCCEEDED";
        item.blockedReasonCode = null;
        item.blockedReasonFa = null;
      }
    }),
  },
  {
    id: "S24",
    name: "All proposals rejected",
    acceptanceId: "A04",
    setup: "Use p1 fresh concept-only scenario; reject every active proposal, empty selection/output plan.",
    action: "Continue disabled; generate replacement batch",
    apply: build((world) => {
      keepOnlyProjects(world, ["p1"]);
      // Concept-only: content and packages do not exist yet at this point in
      // the journey, so the "continue" CTA has nothing to advance.
      world.content = [];
      world.contentVersions = [];
      world.packages = [];
      world.calendar = [];
      for (const card of world.concepts) {
        card.reviewStatus = "REJECTED";
        card.rejectionReasonFa ??= "این پیشنهاد با قلمرو DROP هم‌خوان نیست.";
      }
      const p1 = project(world, "p1");
      p1.selectedConceptVersionIds = [];
      p1.outputPlan = {
        revision: 2,
        includedConceptIds: [],
        requiredContentIds: [],
        optionalContentIds: [],
      };
    }),
  },
];

export const SCENARIOS_BY_ID: ReadonlyMap<string, Scenario> = new Map(
  SCENARIOS.map((s) => [s.id, s]),
);
