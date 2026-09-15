import { z } from "zod";
import {
  EDITORIAL_GATE_STATES,
  FRESHNESS_STATES,
  GENERATION_JOB_STATES,
  OUTPUT_TYPES,
  PACKAGE_STATUSES,
  PRODUCT_STAGES,
  REVIEW_STATUSES,
} from "../vocabulary/index";
import { programSchema, weeklyLensSchema } from "./panel-entities";
import {
  calendarDateSchema,
  displayTextSchema,
  idSchema,
  instantSchema,
  rowVersionSchema,
  targetSchema,
} from "./common";

/**
 * The V2 product entities (ADR-0019 D11, D12).
 *
 * These model the owner's journey — start, concept cards, content items,
 * package, calendar entry — and sit ABOVE the recorded machine DTOs rather than
 * replacing them. Every value-level vocabulary is imported from
 * `../vocabulary/product`, and every lowercase V2 wire literal is normalized by
 * `../projection/wire-codec` before it reaches these schemas.
 *
 * `*Fa` suffixes appear only on fields carrying authored Persian CONTENT
 * (ADR-0019 D6). Codes stay UPPER_SNAKE and schema messages stay English.
 */

/* ------------------------------------------------------- graph join ----- */

/**
 * ADR-0019 D18 / AC-P2.24 — the join that lets P5 draw a product entity as a
 * node without React Flow ever becoming the contract.
 *
 * `nodeKey` is unique only WITHIN a definition version (the workflow schema
 * pins `NODE_KEYS_MUST_BE_UNIQUE_WITHIN_A_VERSION`), so a bare `nodeKey` does
 * not identify a node. The pair is therefore all-or-nothing: the V2 contracts
 * supply no join key at all, and half a key is worse than none.
 */
const graphJoinFields = {
  workflowDefinitionVersionId: idSchema.optional(),
  nodeKey: idSchema.optional(),
};

function refineGraphJoin(
  value: { workflowDefinitionVersionId?: string; nodeKey?: string },
  ctx: z.RefinementCtx,
): void {
  const hasVersion = value.workflowDefinitionVersionId !== undefined;
  const hasKey = value.nodeKey !== undefined;
  if (hasKey && !hasVersion) {
    ctx.addIssue({
      code: "custom",
      path: ["workflowDefinitionVersionId"],
      message: "NODE_KEY_REQUIRES_ITS_DEFINITION_VERSION",
    });
  }
  if (hasVersion && !hasKey) {
    ctx.addIssue({
      code: "custom",
      path: ["nodeKey"],
      message: "DEFINITION_VERSION_REQUIRES_ITS_NODE_KEY",
    });
  }
}

/* ------------------------------------------------------- start input ---- */

/**
 * V2 01 §3 — a tagged reference. Nothing is uploaded, fetched or extracted
 * (ADR-0019 D2): a FILE carries only the metadata the picker reported, a URL is
 * validated and never requested, and TEXT is plain text.
 *
 * "local reference metadata persists, raw file bytes do not" — so there is
 * deliberately no field here that could hold file content.
 */
export const referenceInputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("FILE"),
      name: displayTextSchema,
      /** Bytes as reported by the picker; the bytes themselves never persist. */
      sizeBytes: z
        .int()
        .nonnegative("SIZE_MUST_BE_NON_NEGATIVE")
        .max(20 * 1024 * 1024, "FILE_EXCEEDS_20MB_DEMO_LIMIT"),
      mimeType: z.string().min(1, "MIME_TYPE_MUST_NOT_BE_EMPTY"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("URL"),
      // V2 01 §3 — "URLs allow HTTP(S) only and are not fetched."
      url: z
        .string()
        .min(1, "URL_MUST_NOT_BE_EMPTY")
        .refine(
          (value) => value.startsWith("http://") || value.startsWith("https://"),
          "URL_MUST_BE_HTTP_OR_HTTPS",
        ),
    })
    .strict(),
  z.object({ kind: z.literal("TEXT"), text: displayTextSchema }).strict(),
]);
export type ReferenceInput = z.infer<typeof referenceInputSchema>;

/**
 * V2 01 §3 — the two start modes. `BLANK` carries no references at all: that is
 * the point of «بدون ورودی», and an empty reference list on a `REFERENCE` start
 * is rejected because the mode promises "at least one valid reference".
 */
export const startInputSchema = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("BLANK") }).strict(),
    z
      .object({
        mode: z.literal("REFERENCE"),
        references: z
          .array(referenceInputSchema)
          .min(1, "REFERENCE_START_REQUIRES_AT_LEAST_ONE_REFERENCE")
          .max(5, "TOO_MANY_REFERENCES"),
      })
      .strict(),
  ]);
export type StartInput = z.infer<typeof startInputSchema>;

/* ---------------------------------------------------------- project ----- */

/**
 * V2 01 §6 — the frozen output plan. `requiredContentIds` is the denominator
 * readiness is computed against; optional outputs may be omitted without
 * blocking, and a required item leaves only through an explicit amendment.
 */
export const outputPlanSchema = z
  .object({
    revision: rowVersionSchema,
    includedConceptIds: z.array(idSchema),
    requiredContentIds: z.array(idSchema),
    optionalContentIds: z.array(idSchema),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const overlap = plan.requiredContentIds.filter((id) =>
      plan.optionalContentIds.includes(id),
    );
    if (overlap.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["optionalContentIds"],
        message: "CONTENT_CANNOT_BE_BOTH_REQUIRED_AND_OPTIONAL",
      });
    }
  });
export type OutputPlan = z.infer<typeof outputPlanSchema>;

const panelProjectCommon = {
  id: idSchema,
  workspaceId: idSchema,
  rowVersion: rowVersionSchema,
  titleFa: displayTextSchema,
  /** ADR-0019 D12 — the product phase axis, orthogonal to run and stage state. */
  stage: z.enum(PRODUCT_STAGES),
  input: startInputSchema,
  ownerId: idSchema,
  selectedConceptVersionIds: z.array(idSchema),
  outputPlan: outputPlanSchema,
  /** V2 01 §7 — an all-day target date, or none. Never a formatted Persian date. */
  targetDate: calendarDateSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  ...graphJoinFields,
};

/**
 * ADR-0019 D11 — the V2 `Project` as `PanelProject`.
 *
 * The repo already owns the name `Project` for a container ABOVE programs
 * (`PROJECT_STATUSES`, `programSummarySchema.projectId`), and that container is
 * untouched. This is the V2 work item: the union of a Program and a Weekly
 * Lens with a product-stage axis.
 *
 * Each arm EMBEDS the recorded schema rather than restating its fields, so
 * every refine those schemas carry keeps firing through the union —
 * `IN_PIPELINE_PROGRAM_REQUIRES_AN_ACTIVE_RUN`, `LENS_END_MUST_BE_AFTER_START`,
 * `APPROVED_LENS_REQUIRES_A_CURRENT_CONTEXT_ARTIFACT` and
 * `APPROVED_LENS_REQUIRES_ITS_PARENT_BIBLE_VERSION`. Copying the fields instead
 * would silently drop all four.
 */
export const panelProjectSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        ...panelProjectCommon,
        type: z.literal("PROGRAM"),
        program: programSchema,
      })
      .strict(),
    z
      .object({
        ...panelProjectCommon,
        type: z.literal("WEEKLY_LENS"),
        lens: weeklyLensSchema,
        /**
         * V2 01 §2 — "A user may start a Program without reference input.
         * Selecting a Lens parent is lineage metadata, not a third input mode."
         * The parent is required here because lens creation requires it.
         */
        parentProgramId: idSchema,
        parentBibleVersionId: idSchema,
      })
      .strict(),
  ])
  .superRefine((project, ctx) => refineGraphJoin(project, ctx));
export type PanelProject = z.infer<typeof panelProjectSchema>;

/* ---------------------------------------------------------- concepts ---- */

/** V2 01 §4 — an immutable concept version. Content never changes in place. */
export const conceptVersionSchema = z
  .object({
    id: idSchema,
    conceptId: idSchema,
    /** Monotonic within a concept; version 1 is the first generated proposal. */
    number: z.int().positive("VERSION_NUMBER_MUST_BE_POSITIVE"),
    titleFa: displayTextSchema,
    titleEn: z.string().min(1).optional(),
    thesisFa: displayTextSchema,
    /** V2 01 §4 — "why it belongs at DROP". Supplied by the machine, never evaluated here. */
    dropRationaleFa: displayTextSchema,
    directions: z.array(z.enum(OUTPUT_TYPES)),
    /** The feedback this version was generated from; null on the first version. */
    feedbackAppliedFa: displayTextSchema.nullable(),
    createdAt: instantSchema,
  })
  .strict();
export type ConceptVersion = z.infer<typeof conceptVersionSchema>;

/**
 * V2 01 §4 — a concept card. Review status and freshness are separate axes, and
 * a pending revision is separate from the active version: "show pending revision
 * on the old active version meanwhile" (V2 01 §8).
 */
export const conceptSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    /** The batch this candidate was generated in (V2 01 §2). */
    batchId: idSchema,
    activeVersionId: idSchema,
    reviewStatus: z.enum(REVIEW_STATUSES),
    freshness: z.enum(FRESHNESS_STATES),
    pendingRevisionId: idSchema.nullable(),
    /**
     * V2 01 §4 — a replacement carries lineage to what it replaced, and "the
     * original stays visible in history". Null for an original proposal.
     */
    replacesConceptId: idSchema.nullable(),
    /** V2 01 §4 — a rejection always has a reason; null unless rejected. */
    rejectionReasonFa: displayTextSchema.nullable(),
    rowVersion: rowVersionSchema,
    updatedAt: instantSchema,
    ...graphJoinFields,
  })
  .strict()
  .superRefine((concept, ctx) => {
    refineGraphJoin(concept, ctx);
    // V2 01 §4 — "Reject | Reason required". A rejected card with no reason is
    // the silent-deletion failure the pack explicitly rules out.
    if (concept.reviewStatus === "REJECTED" && concept.rejectionReasonFa === null) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionReasonFa"],
        message: "REJECTED_CONCEPT_REQUIRES_A_REASON",
      });
    }
  });
export type Concept = z.infer<typeof conceptSchema>;

/* ----------------------------------------------------------- content ---- */

export const contentVersionSchema = z
  .object({
    id: idSchema,
    contentId: idSchema,
    /** V2 01 §5 — each content version is frozen against an exact concept version. */
    conceptVersionId: idSchema,
    number: z.int().positive("VERSION_NUMBER_MUST_BE_POSITIVE"),
    titleFa: displayTextSchema,
    bodyFa: displayTextSchema,
    sourceIds: z.array(idSchema),
    createdAt: instantSchema,
  })
  .strict();
export type ContentVersion = z.infer<typeof contentVersionSchema>;

/**
 * V2 01 §5 — a reviewable deliverable tied to one approved concept version.
 *
 * `blockedReasonFa` is display text and `blockedReasonCode` is the stable code:
 * Persian prose can never be a reason code (10 §2), and the panel needs both —
 * one to branch on, one to show.
 */
export const contentItemSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    conceptId: idSchema,
    type: z.enum(OUTPUT_TYPES),
    activeVersionId: idSchema,
    reviewStatus: z.enum(REVIEW_STATUSES),
    freshness: z.enum(FRESHNESS_STATES),
    /** V2 01 §5 — the Persian editorial gate; comments alone never satisfy it. */
    editorialStatus: z.enum(EDITORIAL_GATE_STATES),
    generationState: z.enum(GENERATION_JOB_STATES),
    blockedReasonCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]*$/, "CODE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE")
      .nullable(),
    blockedReasonFa: displayTextSchema.nullable(),
    pendingRevisionId: idSchema.nullable(),
    rowVersion: rowVersionSchema,
    updatedAt: instantSchema,
    ...graphJoinFields,
  })
  .strict()
  .superRefine((item, ctx) => {
    refineGraphJoin(item, ctx);
    // V2 01 §5 — "Critical missing evidence blocks approval of affected required
    // content." A blocked item that cannot say why is not reviewable.
    if (item.generationState === "BLOCKED" && item.blockedReasonCode === null) {
      ctx.addIssue({
        code: "custom",
        path: ["blockedReasonCode"],
        message: "BLOCKED_CONTENT_REQUIRES_A_REASON_CODE",
      });
    }
    // Fail closed: an item cannot be approved while its generation is blocked.
    if (item.generationState === "BLOCKED" && item.reviewStatus === "APPROVED") {
      ctx.addIssue({
        code: "custom",
        path: ["reviewStatus"],
        message: "BLOCKED_CONTENT_CANNOT_BE_APPROVED",
      });
    }
  });
export type ContentItem = z.infer<typeof contentItemSchema>;

/* -------------------------------------------------- comments/decisions -- */

/**
 * V2 01 §4 — "Comment | Non-empty text | Append a version-linked comment, NO
 * approval change".
 *
 * ADR-0019 D11 requires this to be structurally incapable of carrying a
 * decision: `.strict()` plus the absence of any outcome field is what makes
 * "comments alone never satisfy the gate" a type-level guarantee rather than a
 * convention.
 */
export const panelCommentSchema = z
  .object({
    id: idSchema,
    target: targetSchema,
    actorId: idSchema,
    bodyFa: displayTextSchema,
    createdAt: instantSchema,
  })
  .strict();
export type PanelComment = z.infer<typeof panelCommentSchema>;

/**
 * A recorded review decision on an exact version.
 *
 * The outcome vocabulary here is the V2 card axis, projected onto
 * `APPROVAL_DECISIONS` by `../projection/review-status` before it ever reaches
 * `MachineGateway.submitApproval`. This DTO is the READ model; the write model
 * is `approvalCommandSchema`, and there is exactly one path between them
 * (ADR-0013 D1, ADR-0019 D4).
 */
export const panelDecisionSchema = z
  .object({
    id: idSchema,
    target: targetSchema,
    actorId: idSchema,
    /** 11 §3 — the closed role set; V2's untyped `activeRole` narrows to this. */
    activeRole: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "ROLE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE"),
    outcome: z.enum(["APPROVED", "REJECTED", "REVISION_REQUESTED"]),
    /**
     * V2's `Decision.reasonFa` is `string | null` and the seed ships approvals
     * with a null reason, so the READ model tolerates it. The WRITE path does
     * not: `reviewItem` rejects a null reason before transport rather than
     * coercing it to "" (ADR-0019 D5). The asymmetry is deliberate.
     */
    reasonFa: displayTextSchema.nullable(),
    createdAt: instantSchema,
  })
  .strict()
  .superRefine((decision, ctx) => {
    if (decision.outcome !== "APPROVED" && decision.reasonFa === null) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonFa"],
        message: "REJECTION_AND_REVISION_REQUIRE_A_REASON",
      });
    }
  });
export type PanelDecision = z.infer<typeof panelDecisionSchema>;

/* ---------------------------------------------------------- package ----- */

export const packageFileSchema = z
  .object({
    path: z.string().min(1, "PATH_MUST_NOT_BE_EMPTY"),
    /** Null for synthesized files (the README and the index) that no version owns. */
    contentVersionId: idSchema.nullable(),
    body: z.string(),
  })
  .strict();
export type PackageFile = z.infer<typeof packageFileSchema>;

/**
 * V2 01 §6 — "an immutable snapshot of approved required content versions and
 * their provenance".
 *
 * A stale snapshot stays downloadable as a labelled historical artefact and is
 * never the current ready package; that is why `status` is its own axis.
 */
export const packageSnapshotSchema = z
  .object({
    id: idSchema,
    /** Calendar entries key off the FAMILY, so a new version does not duplicate them. */
    familyId: idSchema,
    projectId: idSchema,
    version: z.int().positive("PACKAGE_VERSION_MUST_BE_POSITIVE"),
    /**
     * The output-plan revision this snapshot was assembled against.
     *
     * V2 03 §7 keys assembly on "project + included content-version IDs + plan
     * revision". The first two are already fields; carrying the third makes the
     * identity checkable without encoding it into the id, which `idSchema`
     * would reject as not URL-safe opaque.
     */
    planRevision: rowVersionSchema,
    status: z.enum(PACKAGE_STATUSES),
    conceptVersionIds: z.array(idSchema).min(1, "PACKAGE_REQUIRES_A_CONCEPT_VERSION"),
    contentVersionIds: z.array(idSchema).min(1, "PACKAGE_REQUIRES_A_CONTENT_VERSION"),
    files: z.array(packageFileSchema).min(1, "PACKAGE_REQUIRES_AT_LEAST_ONE_FILE"),
    createdAt: instantSchema,
    /** V2 04 §1 — every demo row is labelled; nothing claims real research. */
    isMock: z.literal(true),
  })
  .strict();
export type PackageSnapshot = z.infer<typeof packageSnapshotSchema>;

/* --------------------------------------------------------- calendar ----- */

/**
 * V2 01 §7 — the plan entry created on package completion.
 *
 * ADR-0019 D7: `CALENDAR_ITEM_STATUSES` (ADR-0015 D5) is NOT amended. V2's
 * `unscheduled` is `PLANNED` with `date === null`; `planned` is `PLANNED` with
 * a date. An entry never reads "published" because a date was chosen.
 *
 * All-day dates are ISO calendar dates; a timed event carries a UTC instant
 * plus its display timezone. A formatted Persian date is never canonical.
 */
export const panelCalendarEntrySchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    packageFamilyId: idSchema,
    packageVersionId: idSchema,
    titleFa: displayTextSchema,
    status: z.enum(["PLANNED", "CONFIRMED", "DONE", "CANCELLED"]),
    date: calendarDateSchema.nullable(),
    endDate: calendarDateSchema.nullable(),
    /** Set only for a timed event; all-day entries leave it null. */
    startsAt: instantSchema.nullable(),
    timezone: z.literal("Asia/Tehran"),
    ownerId: idSchema,
    noteFa: z.string(),
    rowVersion: rowVersionSchema,
    ...graphJoinFields,
  })
  .strict()
  .superRefine((entry, ctx) => {
    refineGraphJoin(entry, ctx);
    if (entry.endDate !== null && entry.date === null) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "RANGE_END_REQUIRES_A_START_DATE",
      });
    }
    if (entry.endDate !== null && entry.date !== null && entry.endDate < entry.date) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "CALENDAR_END_MUST_NOT_PRECEDE_START",
      });
    }
    // A timed event still needs the day it falls on, so month and agenda views
    // can place it without parsing the instant.
    if (entry.startsAt !== null && entry.date === null) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "TIMED_ENTRY_REQUIRES_ITS_CALENDAR_DATE",
      });
    }
  });
export type PanelCalendarEntry = z.infer<typeof panelCalendarEntrySchema>;

/* --------------------------------------------------------- snapshot ----- */

/**
 * What produced a snapshot (ADR-0021, amending ADR-0019 D8).
 *
 * This was `z.literal("drop.panel.mock.v2")`, which meant a snapshot could only
 * exist if it declared itself mock — so a real machine's data was literally
 * unrepresentable in the panel's own envelope. The one way to render it would
 * have been to lie in the discriminator that storage, persistence and every
 * honesty guarantee are keyed on.
 *
 * Widening it is the smaller change and the honest one. `drop.panel.mock.v2`
 * keeps its exact spelling, so every stored world, the rejecting fixtures and
 * the persistence discriminator are untouched.
 */
export const SNAPSHOT_KINDS = ["drop.panel.mock.v2", "drop.panel.machine.v1"] as const;
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

/**
 * The whole world in one validated envelope (V2 03 §6).
 *
 * `schemaVersion` stays semver (`PANEL_SCHEMA_VERSION`) because
 * `schemaVersionSchema` pins that form and a rejecting fixture already proves
 * `"v1"` fails. `snapshotKind` rides alongside it and is also the storage-key
 * discriminator (ADR-0019 D8) — persistence still accepts only the mock kind,
 * because real machine state belongs to the machine, not to a browser key.
 */
export const panelSnapshotSchema = z
  .object({
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "SCHEMA_VERSION_MUST_BE_SEMVER"),
    snapshotKind: z.enum(SNAPSHOT_KINDS),
    revision: rowVersionSchema,
    /** The injected clock (ADR-0019 D16). No adapter reads Date.now. */
    clock: instantSchema,
    /** Mock discovery selects `batches[seed mod batches.length]` — no PRNG. */
    discoverySeed: z.int().nonnegative("SEED_MUST_BE_NON_NEGATIVE"),
    projects: z.array(panelProjectSchema),
    concepts: z.array(conceptSchema),
    conceptVersions: z.array(conceptVersionSchema),
    content: z.array(contentItemSchema),
    contentVersions: z.array(contentVersionSchema),
    comments: z.array(panelCommentSchema),
    decisions: z.array(panelDecisionSchema),
    packages: z.array(packageSnapshotSchema),
    calendar: z.array(panelCalendarEntrySchema),
  })
  .strict();
export type PanelSnapshot = z.infer<typeof panelSnapshotSchema>;
