import {
  conceptSchema,
  conceptVersionSchema,
  contentItemSchema,
  contentVersionSchema,
  decodeOutputType,
  decodeProductStage,
  decodeReviewStatus,
  decodeTarget,
  packageSnapshotSchema,
  panelCalendarEntrySchema,
  panelCommentSchema,
  panelDecisionSchema,
  panelProjectSchema,
  panelSnapshotSchema,
  toStoredCode,
  type Concept,
  type ConceptVersion,
  type ContentItem,
  type ContentVersion,
  type PackageSnapshot,
  type PanelCalendarEntry,
  type PanelComment,
  type PanelDecision,
  type PanelProject,
  type PanelSnapshot,
} from "@drop/panel-domain";
import { WIRE_SEED } from "./wire-seed";
import { DEMO_EPOCH, DEMO_SNAPSHOT_KIND } from "../ports";

/**
 * The loader boundary (AC-P3.1; ADR-0019 D6).
 *
 * Every value crosses from V2's lowercase wire form to the repo's stored
 * UPPER_SNAKE codes exactly once, here, through P2's codec — this module
 * re-implements none of it. Anything that survives normalization is then parsed
 * by the P2 schemas before the world is usable, so a fixture that would not
 * satisfy a contract fails at load rather than at some surface three tickets
 * later.
 *
 * Where the pack's shape and the recorded shape genuinely differ, the
 * translation is spelled out and cited rather than smoothed over.
 */

export class SeedNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedNormalizationError";
  }
}

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new SeedNormalizationError(`${what} could not be normalized from the V2 wire form`);
  }
  return value;
}

/** The pack's `revision` is the recorded `rowVersion` (06 §1). */
function rowVersionOf(wire: { revision?: number }): number {
  return wire.revision ?? 1;
}

/**
 * V2's `input` is `null` for blank discovery, or `{ references: [...] }`.
 * `startInputSchema` makes the mode explicit instead, because "no input" and
 * "an empty reference list" are different things and the pack's `null` erases
 * that distinction (V2 01 §3).
 */
function normalizeStartInput(wire: unknown): PanelProject["input"] {
  if (wire === null || wire === undefined) return { mode: "BLANK" };
  const refs = (wire as { references?: readonly unknown[] }).references ?? [];
  return {
    mode: "REFERENCE",
    references: refs.map((ref) => {
      const r = ref as Record<string, unknown>;
      const kind = toStoredCode(String(r.kind));
      if (kind === "FILE") {
        return {
          kind: "FILE" as const,
          name: String(r.name),
          sizeBytes: Number(r.size ?? r.sizeBytes ?? 0),
          mimeType: String(r.mime ?? r.mimeType ?? "application/octet-stream"),
        };
      }
      if (kind === "URL") return { kind: "URL" as const, url: String(r.url) };
      return { kind: "TEXT" as const, text: String(r.text) };
    }),
  };
}

/**
 * The Program and Weekly Lens arms embed the recorded schemas, which carry
 * fields the V2 seed simply does not have (constitution version, source brief,
 * planned dates). The seed is a PANEL fixture, so those are synthesized here
 * deterministically rather than invented per-call — and every synthesized value
 * is a demo value, never a claim about real governance.
 */
function embeddedProgram(wire: Record<string, unknown>): PanelProject extends { program: infer P }
  ? P
  : never {
  return {
    summary: {
      id: `prg-${String(wire.id)}`,
      projectId: String(wire.id),
      title: String(wire.titleFa),
      status: "IN_PIPELINE",
      programType: "THEMATIC_PROGRAM",
      lensMode: "NONE",
      activePipelineRunId: `run-${String(wire.id)}`,
      updatedAt: DEMO_EPOCH,
      rowVersion: rowVersionOf(wire as { revision?: number }),
    },
    createdByActorId: String(wire.ownerId),
    createdAt: DEMO_EPOCH,
  } as never;
}

function embeddedLens(wire: Record<string, unknown>): unknown {
  return {
    summary: {
      id: `lns-${String(wire.id)}`,
      programId: String(wire.parentProgramId),
      title: String(wire.titleFa),
      // 06 §3.4 — an APPROVED lens needs a context artifact and its parent
      // Bible version, both of which the seed supplies for the lens project.
      status: "APPROVED",
      updatedAt: DEMO_EPOCH,
      rowVersion: rowVersionOf(wire as { revision?: number }),
    },
    conceptBibleVersionId: String(wire.parentBibleVersionId),
    currentContextArtifactId: `art-${String(wire.id)}`,
  };
}

export function normalizeProject(wire: Record<string, unknown>): PanelProject {
  const type = toStoredCode(String(wire.type));
  const common = {
    id: String(wire.id),
    workspaceId: String(wire.workspaceId),
    rowVersion: rowVersionOf(wire as { revision?: number }),
    titleFa: String(wire.titleFa),
    stage: required(decodeProductStage(String(wire.stage)), `project ${String(wire.id)} stage`),
    input: normalizeStartInput(wire.input),
    ownerId: String(wire.ownerId),
    selectedConceptVersionIds: (wire.selectedConceptVersionIds ?? []) as string[],
    outputPlan: wire.outputPlan as PanelProject["outputPlan"],
    targetDate: (wire.targetDate ?? null) as string | null,
    createdAt: DEMO_EPOCH,
    updatedAt: DEMO_EPOCH,
  };
  const candidate =
    type === "WEEKLY_LENS"
      ? {
          ...common,
          type: "WEEKLY_LENS" as const,
          lens: embeddedLens(wire),
          parentProgramId: String(wire.parentProgramId),
          parentBibleVersionId: String(wire.parentBibleVersionId),
        }
      : { ...common, type: "PROGRAM" as const, program: embeddedProgram(wire) };
  return panelProjectSchema.parse(candidate);
}

export function normalizeConcept(wire: Record<string, unknown>): Concept {
  const reviewStatus = required(
    decodeReviewStatus(String(wire.reviewStatus)),
    `concept ${String(wire.id)} reviewStatus`,
  );
  return conceptSchema.parse({
    id: String(wire.id),
    projectId: String(wire.projectId),
    batchId: `batch-${String(wire.projectId)}-1`,
    activeVersionId: String(wire.activeVersionId),
    reviewStatus,
    freshness: toStoredCode(String(wire.freshness ?? "current")),
    pendingRevisionId: (wire.pendingRevisionId ?? null) as string | null,
    replacesConceptId: (wire.replacesConceptId ?? null) as string | null,
    // V2 01 §4 — a rejection always carries a reason. The seed keeps the reason
    // on the decision, so it is lifted onto the card here.
    rejectionReasonFa:
      reviewStatus === "REJECTED"
        ? ((wire.rejectionReasonFa as string | undefined) ?? "دلیل رد در تصمیم ثبت‌شده است.")
        : null,
    rowVersion: 1,
    updatedAt: DEMO_EPOCH,
  });
}

export function normalizeConceptVersion(wire: Record<string, unknown>): ConceptVersion {
  return conceptVersionSchema.parse({
    ...wire,
    directions: (wire.directions as string[]).map((d) =>
      required(decodeOutputType(d), `concept version ${String(wire.id)} direction "${d}"`),
    ),
    feedbackAppliedFa: (wire.feedbackAppliedFa ?? null) as string | null,
  });
}

export function normalizeContentItem(wire: Record<string, unknown>): ContentItem {
  const blockedFa = (wire.blockedReasonFa ?? null) as string | null;
  return contentItemSchema.parse({
    id: String(wire.id),
    projectId: String(wire.projectId),
    conceptId: String(wire.conceptId),
    type: required(decodeOutputType(String(wire.type)), `content ${String(wire.id)} type`),
    activeVersionId: String(wire.activeVersionId),
    reviewStatus: required(
      decodeReviewStatus(String(wire.reviewStatus)),
      `content ${String(wire.id)} reviewStatus`,
    ),
    freshness: toStoredCode(String(wire.freshness ?? "current")),
    editorialStatus: toStoredCode(String(wire.editorialStatus ?? "not_required")),
    // The seed carries no generation state; a blocked item is BLOCKED and
    // everything else has already produced its active version.
    generationState: blockedFa === null ? "SUCCEEDED" : "BLOCKED",
    // 10 §2 — Persian prose can never be a reason code, so a blocked item gets
    // both: a stable code to branch on and the seed's text to show.
    blockedReasonCode: blockedFa === null ? null : "SOURCE_ACCESS_BLOCKED",
    blockedReasonFa: blockedFa,
    pendingRevisionId: (wire.pendingRevisionId ?? null) as string | null,
    rowVersion: 1,
    updatedAt: DEMO_EPOCH,
  });
}

export function normalizeContentVersion(wire: Record<string, unknown>): ContentVersion {
  return contentVersionSchema.parse(wire);
}

export function normalizeComment(wire: Record<string, unknown>): PanelComment {
  return panelCommentSchema.parse({
    ...wire,
    target: required(
      decodeTarget(wire.target as { kind: string; id: string; versionId: string }),
      `comment ${String(wire.id)} target`,
    ),
  });
}

export function normalizeDecision(
  wire: Record<string, unknown>,
  roleFor: (demoRole: string) => string,
): PanelDecision {
  const outcome = toStoredCode(String(wire.outcome));
  return panelDecisionSchema.parse({
    ...wire,
    target: required(
      decodeTarget(wire.target as { kind: string; id: string; versionId: string }),
      `decision ${String(wire.id)} target`,
    ),
    activeRole: roleFor(String(wire.activeRole)),
    outcome,
    reasonFa: (wire.reasonFa ?? null) as string | null,
  });
}

export function normalizePackage(wire: Record<string, unknown>): PackageSnapshot {
  return packageSnapshotSchema.parse({
    ...wire,
    status: toStoredCode(String(wire.status)),
    // The V2 seed predates the plan-revision key; its single package was
    // assembled against plan revision 1.
    planRevision: (wire.planRevision as number | undefined) ?? 1,
  });
}

/**
 * The interface noun, applied to seeded titles (ADR-0020 D5).
 *
 * `wire-seed.ts` is a VERBATIM transcription of the owner's pack and must not be
 * edited — a fixture that can drift from what the tests validated is not a
 * fixture. But the pack predates the simplification brief, and its calendar
 * title reads «پکیج هفتگی», which a person sees. ADR-0020 D1 makes the brief the
 * later word on presentation, and the loader boundary is where this repository
 * already reconciles V2's vocabulary with the recorded one (ADR-0019 D6).
 *
 * Narrow on purpose: only the product noun, only as a whole word. It does not
 * touch prose, and the transcription stays byte-identical.
 */
function interfaceNounFa(title: string): string {
  return title.replace(/(?<![\u0600-\u06FF])(پکیج|بسته)(?![\u0600-\u06FF])/g, "خروجی");
}

export function normalizeCalendarEntry(wire: Record<string, unknown>): PanelCalendarEntry {
  // ADR-0019 D7 — V2's "unscheduled" and "planned" are both PLANNED; the date
  // is what distinguishes them. ADR-0015 D5's set is not amended.
  const date = (wire.date ?? null) as string | null;
  return panelCalendarEntrySchema.parse({
    id: String(wire.id),
    projectId: String(wire.projectId),
    packageFamilyId: String(wire.packageFamilyId),
    packageVersionId: String(wire.packageVersionId),
    titleFa: interfaceNounFa(String(wire.titleFa)),
    status: "PLANNED",
    date,
    endDate: (wire.endDate ?? null) as string | null,
    startsAt: null,
    timezone: "Asia/Tehran",
    ownerId: String(wire.ownerId),
    noteFa: String(wire.noteFa ?? ""),
    rowVersion: 1,
  });
}

/** Materializes the whole base world and validates it as one envelope. */
export function normalizeSeed(roleFor: (demoRole: string) => string): PanelSnapshot {
  // The generated module is `as const`, so its arrays are readonly tuples; this
  // widens them once rather than at nine call sites.
  const wire = WIRE_SEED as unknown as {
    projects: Record<string, unknown>[];
    concepts: Record<string, unknown>[];
    conceptVersions: Record<string, unknown>[];
    content: Record<string, unknown>[];
    contentVersions: Record<string, unknown>[];
    comments: Record<string, unknown>[];
    decisions: Record<string, unknown>[];
    packages: Record<string, unknown>[];
    calendar: Record<string, unknown>[];
  };
  return panelSnapshotSchema.parse({
    schemaVersion: "1.0.0",
    snapshotKind: DEMO_SNAPSHOT_KIND,
    revision: 1,
    clock: DEMO_EPOCH,
    discoverySeed: 1,
    projects: wire.projects.map(normalizeProject),
    concepts: wire.concepts.map(normalizeConcept),
    conceptVersions: wire.conceptVersions.map(normalizeConceptVersion),
    content: wire.content.map(normalizeContentItem),
    contentVersions: wire.contentVersions.map(normalizeContentVersion),
    comments: wire.comments.map(normalizeComment),
    decisions: wire.decisions.map((d) => normalizeDecision(d, roleFor)),
    packages: wire.packages.map(normalizePackage),
    calendar: wire.calendar.map(normalizeCalendarEntry),
  });
}
