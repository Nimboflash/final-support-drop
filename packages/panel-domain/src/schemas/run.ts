import { z } from "zod";
import { RUN_STATUSES, STAGE_STATUSES } from "../vocabulary/index";
import {
  idSchema,
  instantSchema,
  rawResponseHandleSchema,
  rowVersionSchema,
  safeDiagnosticSchema,
  sequenceNumberSchema,
  stableCodeSchema,
  paginationSchema,
} from "./common";

/**
 * Run DTOs — ADR-0012 (states, aggregation, reason codes), 06 §9.2 (run,
 * stage-run and attempt tables), 18 §4.1 (stage status, timing, attempts and
 * user-safe diagnostics), 18 §8 (attempts, timestamps and artifacts in the
 * inspector).
 */

/**
 * ADR-0012 D4 — the reason code accompanying a wait state.
 *
 * `PROVIDER_CONFIGURATION_REQUIRED` is the only code the recorded decisions
 * name; the wider set is machine-owned. The schema therefore accepts any stable
 * English code rather than inventing a closed enum (testing-strategy §2.2).
 * OPEN — P8 coordination.
 */
export const waitingReasonCodeSchema = stableCodeSchema;

export const stageAttemptSchema = z
  .object({
    id: idSchema,
    /** 06 §9.2 — `studio.stage_attempts.attempt_number`. */
    attemptNumber: z.int().min(1, "ATTEMPT_NUMBER_MUST_BE_POSITIVE"),
    status: z.enum(STAGE_STATUSES),
    startedAt: instantSchema,
    endedAt: instantSchema.optional(),
    /** 07 §8 — failure class recorded per attempt. */
    failureCode: stableCodeSchema.optional(),
    /** 18 §4.1 — diagnostics safe for users. Never a provider payload. */
    diagnostics: z.array(safeDiagnosticSchema).optional(),
    /** 06 §7 — existence only; content is capability-gated (ADR-0013 D6). */
    rawResponse: rawResponseHandleSchema.optional(),
  })
  .strict()
  .superRefine((attempt, ctx) => {
    if (attempt.endedAt !== undefined && attempt.endedAt < attempt.startedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "ATTEMPT_END_MUST_NOT_PRECEDE_START",
      });
    }
  });
export type StageAttempt = z.infer<typeof stageAttemptSchema>;

export const stageRunSchema = z
  .object({
    id: idSchema,
    /** Ties the stage run back to its published node definition (06 §9.1). */
    nodeKey: stableCodeSchema,
    status: z.enum(STAGE_STATUSES),
    /**
     * ADR-0012 D4 — a wait state carries the reason code the UI derives its
     * block label from. Required exactly when the stage is WAITING_FOR_INPUT,
     * so scenario 7 (blocked by missing input) can never render an unexplained
     * block.
     */
    reasonCode: waitingReasonCodeSchema.optional(),
    startedAt: instantSchema.optional(),
    endedAt: instantSchema.optional(),
    /** 18 §7.3 — retry creates a new attempt while preserving history. */
    attempts: z.array(stageAttemptSchema),
    artifactIds: z.array(idSchema).optional(),
  })
  .strict()
  .superRefine((stage, ctx) => {
    if (stage.status === "WAITING_FOR_INPUT" && stage.reasonCode === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "WAITING_FOR_INPUT_REQUIRES_A_REASON_CODE",
      });
    }
    // 18 §7.3 — attempt history is preserved, so attempt numbers are a strictly
    // increasing sequence starting at 1; a gap or repeat means lost history.
    stage.attempts.forEach((attempt, index) => {
      if (attempt.attemptNumber !== index + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["attempts", index, "attemptNumber"],
          message: "ATTEMPT_HISTORY_MUST_BE_CONTIGUOUS_FROM_ONE",
        });
      }
    });
  });
export type StageRun = z.infer<typeof stageRunSchema>;

export const workflowRunSummarySchema = z
  .object({
    id: idSchema,
    workspaceId: idSchema,
    workflowDefinitionId: idSchema,
    /** 06 §9.2 — a run pins the exact published workflow version. */
    workflowDefinitionVersionId: idSchema,
    /** The run's subject: a Program or a Weekly Lens (06 §3.3, §3.4). */
    programId: idSchema.optional(),
    weeklyLensId: idSchema.optional(),
    status: z.enum(RUN_STATUSES),
    createdAt: instantSchema,
    startedAt: instantSchema.optional(),
    endedAt: instantSchema.optional(),
    /** ADR-0014 D2 — highest persisted sequence, for snapshot-then-events. */
    lastSequence: sequenceNumberSchema,
    rowVersion: rowVersionSchema,
  })
  .strict()
  .superRefine((run, ctx) => {
    if (run.programId === undefined && run.weeklyLensId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["programId"],
        message: "RUN_REQUIRES_A_PROGRAM_OR_LENS_SUBJECT",
      });
    }
  });
export type WorkflowRunSummary = z.infer<typeof workflowRunSummarySchema>;

export const workflowRunSchema = z
  .object({
    summary: workflowRunSummarySchema,
    stages: z.array(stageRunSchema),
    /**
     * 07 §6 — the immutable frozen manifest reference. The panel shows that a
     * manifest exists and its identity; it never reconstructs one.
     */
    manifestId: idSchema.optional(),
  })
  .strict()
  .superRefine((run, ctx) => {
    // ADR-0012 D3 — run status is *derived* from stage states, top-down, first
    // match wins. The panel does not compute it, but it must reject a snapshot
    // whose run status contradicts its stages: that would let the UI claim a
    // state the machine never reached (18 §12).
    const stageStatuses = new Set(run.stages.map((s) => s.status));
    const expected =
      run.stages.length === 0
        ? undefined
        : stageStatuses.has("CANCELLED")
          ? "CANCELLED"
          : stageStatuses.has("FAILED_FINAL")
            ? "FAILED"
            : stageStatuses.has("PAUSED")
              ? "PAUSED"
              : stageStatuses.has("WAITING_FOR_APPROVAL")
                ? "WAITING_APPROVAL"
                : stageStatuses.has("WAITING_FOR_INPUT")
                  ? "WAITING_INPUT"
                  : stageStatuses.has("RUNNING") || stageStatuses.has("FAILED_RETRYABLE")
                    ? "RUNNING"
                    : stageStatuses.has("QUEUED") ||
                        stageStatuses.has("READY") ||
                        stageStatuses.has("WAITING_FOR_DEPENDENCY")
                      ? "QUEUED"
                      : undefined;

    // `undefined` means the aggregation rule does not pin a single answer from
    // stage states alone (SUCCEEDED additionally requires terminal artifacts
    // and approvals, 07 §14; DRAFT applies only before manifest freeze), so the
    // check stays silent rather than guessing.
    if (expected !== undefined && run.summary.status !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "status"],
        message: "RUN_STATUS_CONTRADICTS_STAGE_AGGREGATION",
      });
    }
  });
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

/** Filter arguments for `MachineGateway.listRuns` (18 §6). */
export const runFiltersSchema = paginationSchema
  .extend({
    status: z.array(z.enum(RUN_STATUSES)).optional(),
    programId: idSchema.optional(),
    weeklyLensId: idSchema.optional(),
    workflowDefinitionId: idSchema.optional(),
  })
  .strict();
export type RunFilters = z.infer<typeof runFiltersSchema>;
