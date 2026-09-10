import { z } from "zod";
import {
  ACTOR_ROLES,
  ACTOR_TYPES,
  APPROVAL_DECISIONS,
  CAPABILITIES,
  COVERAGE_CLASSES,
  LENS_MODES,
  LENS_STATUSES,
  MEMBERSHIP_STATUSES,
  PROGRAM_STATUSES,
  PROGRAM_TYPES,
  REQUEST_STATUSES,
  SOURCE_LIFECYCLE_STATES,
} from "../vocabulary/index";
import { gatePolicySchema } from "./workflow";
import {
  displayTextSchema,
  idSchema,
  instantSchema,
  paginationSchema,
  rowVersionSchema,
  stableCodeSchema,
  versionedSubjectRefSchema,
} from "./common";

/**
 * The (18 §7.1) entity classes the panel surfaces need beyond the machine-facing
 * DTOs: users and roles, Programs and Weekly Lenses, approvals and change
 * requests, research sources and coverage gaps, human retrieval requests, and
 * notifications.
 */

/* ---------------------------------------------------------------- users -- */

export const userSummarySchema = z
  .object({
    id: idSchema,
    actorId: idSchema,
    displayName: displayTextSchema,
    /** 11 §2 — the unified actor model; only HUMAN actors can approve (D4). */
    actorType: z.enum(ACTOR_TYPES),
    /** 11 §3 — one person may hold several roles. */
    roles: z.array(z.enum(ACTOR_ROLES)),
    capabilities: z.array(z.enum(CAPABILITIES)),
    /** 06 §2.1 — disabled users are retained, never deleted (06 §13). */
    membershipStatus: z.enum(MEMBERSHIP_STATUSES),
  })
  .strict();
export type UserSummary = z.infer<typeof userSummarySchema>;

/* ------------------------------------------------------------- programs -- */

export const programSummarySchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: displayTextSchema,
    /** ADR-0015 D5 — the canonical Program status set. */
    status: z.enum(PROGRAM_STATUSES),
    programType: z.enum(PROGRAM_TYPES),
    lensMode: z.enum(LENS_MODES),
    currentMachineKey: stableCodeSchema.optional(),
    activePipelineRunId: idSchema.optional(),
    updatedAt: instantSchema,
    rowVersion: rowVersionSchema,
  })
  .strict()
  .superRefine((program, ctx) => {
    // ADR-0015 D5 — "programs.IN_PIPELINE must be consistent with
    // active_pipeline_run_id (06 §3.3); the command layer enforces the pairing."
    if (program.status === "IN_PIPELINE" && program.activePipelineRunId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["activePipelineRunId"],
        message: "IN_PIPELINE_PROGRAM_REQUIRES_AN_ACTIVE_RUN",
      });
    }
  });
export type ProgramSummary = z.infer<typeof programSummarySchema>;

export const programSchema = z
  .object({
    summary: programSummarySchema,
    /** 06 §3.3 — FK to a PUBLISHED constitution version (ADR-0015 D2). */
    constitutionVersionId: idSchema.optional(),
    sourceBriefId: idSchema.optional(),
    createdByActorId: idSchema,
    createdAt: instantSchema,
  })
  .strict();
export type Program = z.infer<typeof programSchema>;

/* --------------------------------------------------------- weekly lens -- */

export const weeklyLensSummarySchema = z
  .object({
    id: idSchema,
    programId: idSchema,
    title: displayTextSchema,
    /** ADR-0015 D5 — the canonical Weekly Lens status set. */
    status: z.enum(LENS_STATUSES),
    question: displayTextSchema.optional(),
    /** 09 §3 — exactly one Lens accent token (ADR 0010 D10). */
    lensColorToken: stableCodeSchema.optional(),
    plannedStartAt: instantSchema.optional(),
    plannedEndAt: instantSchema.optional(),
    activePipelineRunId: idSchema.optional(),
    updatedAt: instantSchema,
    rowVersion: rowVersionSchema,
  })
  .strict()
  .superRefine((lens, ctx) => {
    // 06 §3.4 — "Database check: end must be after start."
    if (
      lens.plannedStartAt !== undefined &&
      lens.plannedEndAt !== undefined &&
      lens.plannedEndAt <= lens.plannedStartAt
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["plannedEndAt"],
        message: "LENS_END_MUST_BE_AFTER_START",
      });
    }
  });
export type WeeklyLensSummary = z.infer<typeof weeklyLensSummarySchema>;

export const weeklyLensSchema = z
  .object({
    summary: weeklyLensSummarySchema,
    /** 06 §3.4 — a Lens derives from an exact parent Concept Bible version. */
    conceptBibleVersionId: idSchema.optional(),
    lensTerritoryId: idSchema.optional(),
    parentLensId: idSchema.optional(),
    currentContextArtifactId: idSchema.optional(),
  })
  .strict()
  .superRefine((lens, ctx) => {
    // 06 §3.4 — "A Lens cannot become APPROVED without a current context
    // artifact and exact parent Bible version." Scenario 12 (18 §7.2) is
    // exactly this shape, so the rule is enforced rather than assumed.
    if (lens.summary.status === "APPROVED" || lens.summary.status === "COMMISSIONED") {
      if (lens.currentContextArtifactId === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["currentContextArtifactId"],
          message: "APPROVED_LENS_REQUIRES_A_CURRENT_CONTEXT_ARTIFACT",
        });
      }
      if (lens.conceptBibleVersionId === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["conceptBibleVersionId"],
          message: "APPROVED_LENS_REQUIRES_ITS_PARENT_BIBLE_VERSION",
        });
      }
    }
  });
export type WeeklyLens = z.infer<typeof weeklyLensSchema>;

/* -------------------------------------------------------- approvals ----- */

/**
 * The presentation state of an approval request: `PENDING` plus the four
 * ADR-0013 decisions. Note this includes `REJECTED`, which the P1 `packages/ui`
 * `APPROVAL_STATES` set omits — recorded as a finding in the P2 handoff rather
 * than silently reconciled here (P1's component API is frozen).
 */
export const APPROVAL_REQUEST_STATES = ["PENDING", ...APPROVAL_DECISIONS] as const;
export type ApprovalRequestState = (typeof APPROVAL_REQUEST_STATES)[number];

/** ADR-0013 — one decision per actor per request, single and final. */
export const approvalDecisionRecordSchema = z
  .object({
    actorId: idSchema,
    actorType: z.enum(ACTOR_TYPES),
    decision: z.enum(APPROVAL_DECISIONS),
    actedAsRole: z.enum(ACTOR_ROLES),
    decidedAt: instantSchema,
    reason: displayTextSchema,
    /** ADR-0013 D5 — self-approval is permitted-and-labelled, never implicit. */
    wasSelfApproval: z.boolean(),
  })
  .strict()
  .superRefine((record, ctx) => {
    // ADR-0013 D4 — HUMAN-only decision actors, enforced structurally.
    if (record.actorType !== "HUMAN") {
      ctx.addIssue({
        code: "custom",
        path: ["actorType"],
        message: "ONLY_HUMAN_ACTORS_MAY_DECIDE_APPROVALS",
      });
    }
  });
export type ApprovalDecisionRecord = z.infer<typeof approvalDecisionRecordSchema>;

export const approvalRequestSummarySchema = z
  .object({
    id: idSchema,
    state: z.enum(APPROVAL_REQUEST_STATES),
    /** 06 §2.2 — a durable request against an exact subject version. */
    subject: versionedSubjectRefSchema,
    policy: gatePolicySchema,
    runId: idSchema.optional(),
    stageId: idSchema.optional(),
    requestedAt: instantSchema,
    decisions: z.array(approvalDecisionRecordSchema),
    rowVersion: rowVersionSchema,
  })
  .strict()
  .superRefine((request, ctx) => {
    // ADR-0013 D3 — "a partial unique index ... UNIQUE (approval_request_id,
    // actor_id)": an actor's decision on a request is single and final.
    const actorIds = request.decisions.map((d) => d.actorId);
    const duplicate = actorIds.find((id, index) => actorIds.indexOf(id) !== index);
    if (duplicate !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["decisions"],
        message: "ONE_DECISION_PER_ACTOR_PER_REQUEST",
      });
    }

    // ADR-0013 D3 — the approved state requires `minimum_approvals` APPROVED
    // decisions, and because each is a distinct actor, that count IS a
    // distinct-actor count. Presenting APPROVED below quorum would be the UI
    // claiming a gate was satisfied when it was not (18 §12).
    const approvals = request.decisions.filter((d) => d.decision === "APPROVED").length;
    if (request.state === "APPROVED" && approvals < request.policy.minimumApprovals) {
      ctx.addIssue({
        code: "custom",
        path: ["state"],
        message: "APPROVED_STATE_REQUIRES_MINIMUM_DISTINCT_APPROVALS",
      });
    }
  });
export type ApprovalRequestSummary = z.infer<typeof approvalRequestSummarySchema>;

/* --------------------------------------------------------- research ----- */

export const researchSourceSummarySchema = z
  .object({
    id: idSchema,
    title: displayTextSchema,
    /** 06 §5 — `studio.source_registry_entries` lifecycle. */
    lifecycle: z.enum(SOURCE_LIFECYCLE_STATES),
    /** 00 §4 — Iranian/Persian and international evidence classes. */
    coverageClass: z.enum(COVERAGE_CLASSES),
    /** 06 §5 — network status and content retrieval status are separate fields. */
    networkReachable: z.boolean().optional(),
    contentRetrievable: z.boolean().optional(),
    lastCheckedAt: instantSchema.optional(),
    /** 06 §5 — the immutable snapshot a run actually used. */
    snapshotId: idSchema.optional(),
  })
  .strict();
export type ResearchSourceSummary = z.infer<typeof researchSourceSummarySchema>;

export const coverageGapSchema = z
  .object({
    id: idSchema,
    coverageClass: z.enum(COVERAGE_CLASSES),
    /** 06 §5 — "Blocked evidence slots stay in the denominator." */
    requiredSlots: z.int().nonnegative(),
    fulfilledSlots: z.int().nonnegative(),
    blockedSlots: z.int().nonnegative(),
    /** 06 §5 — human acceptance/escalation of non-critical gaps. */
    acceptedByEventId: idSchema.optional(),
  })
  .strict()
  .superRefine((gap, ctx) => {
    if (gap.fulfilledSlots + gap.blockedSlots > gap.requiredSlots) {
      ctx.addIssue({
        code: "custom",
        path: ["fulfilledSlots"],
        message: "FULFILLED_AND_BLOCKED_SLOTS_EXCEED_REQUIRED",
      });
    }
  });
export type CoverageGap = z.infer<typeof coverageGapSchema>;

/* ------------------------------------------------- retrieval requests --- */

export const retrievalRequestSummarySchema = z
  .object({
    id: idSchema,
    title: displayTextSchema,
    /** ADR-0015 D5 — the canonical request status set. */
    status: z.enum(REQUEST_STATUSES),
    assignedToActorId: idSchema.optional(),
    dueAt: instantSchema.optional(),
    /** 06 §5 — lawful human retrieval assignment; blocked reasons are shown. */
    blockedReasonCode: stableCodeSchema.optional(),
    updatedAt: instantSchema,
  })
  .strict()
  .superRefine((request, ctx) => {
    // A BLOCKED request with no reason gives the operator nothing to act on
    // (18 §4.1 requires blocked states to be understandable).
    if (request.status === "BLOCKED" && request.blockedReasonCode === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["blockedReasonCode"],
        message: "BLOCKED_REQUEST_REQUIRES_A_REASON_CODE",
      });
    }
  });
export type RetrievalRequestSummary = z.infer<typeof retrievalRequestSummarySchema>;

/* ------------------------------------------------------ notifications --- */

export const notificationSummarySchema = z
  .object({
    id: idSchema,
    /** 06 §2.3 — user delivery state referencing a durable source event. */
    sourceEventId: idSchema,
    recipientActorId: idSchema,
    createdAt: instantSchema,
    readAt: instantSchema.optional(),
    /** Stable English key; Persian text resolves through 09 §9's mapping. */
    kindKey: stableCodeSchema,
  })
  .strict();
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

/* ------------------------------------------------------------ filters --- */

/**
 * The filter argument shared by every read-only `PanelGateway` list method
 * (ADR-0018 D1). One shape rather than five near-identical ones: the panel's
 * list surfaces filter on the same axes, and a single schema keeps the
 * provisional contract small for the P8 coordination conversation.
 */
export const panelListFiltersSchema = paginationSchema
  .extend({
    programId: idSchema.optional(),
    weeklyLensId: idSchema.optional(),
    assignedToActorId: idSchema.optional(),
    /** Unread notifications / open approvals — the inbox default (04 §2). */
    onlyOpen: z.boolean().optional(),
  })
  .strict();
export type PanelListFilters = z.infer<typeof panelListFiltersSchema>;
