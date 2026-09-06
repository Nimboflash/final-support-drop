import { z } from "zod";
import {
  ACTOR_ROLES,
  APPROVAL_DECISIONS,
  BANNED_GATE_COMMAND_VERBS,
  RUN_COMMAND_VERBS,
} from "../vocabulary/index";
import {
  displayTextSchema,
  idempotencyKeySchema,
  idSchema,
  instantSchema,
  rowVersionSchema,
  stableCodeSchema,
} from "./common";

/**
 * Command DTOs — 10 §3 (command envelope), ADR-0013 (the single approval write
 * path and the gate verbs removed from the runtime command set), ADR-0012 D5/D6
 * (SKIP_STAGE and manual fallback), 18 §7.3 (mock command behaviour) and
 * 18 §12 (no UI state may claim a real machine operation occurred).
 */

/** 10 §3 — every mutating request carries this envelope. */
const commandEnvelope = {
  /** 10 §3 — acted-as role where an actor holds multiple roles. */
  actedAsRole: z.enum(ACTOR_ROLES),
  /** 10 §3 — `Idempotency-Key` for commands that can be retried. */
  idempotencyKey: idempotencyKeySchema,
  /** 10 §3 — `expectedRowVersion` for mutable aggregate updates. */
  expectedRowVersion: rowVersionSchema.optional(),
};

/**
 * ADR-0013 D2 — the gate verbs are rejected as run/stage command names with a
 * stable error code whose next permitted action points at the approval request.
 * Rejecting them *by name* (rather than merely omitting them from the enum) is
 * what AC-P2.4 requires: a caller reaching for the removed write path gets a
 * reason, not a generic enum miss.
 */
export const runCommandVerbSchema = z.string().superRefine((verb, ctx) => {
  if ((BANNED_GATE_COMMAND_VERBS as readonly string[]).includes(verb)) {
    ctx.addIssue({
      code: "custom",
      message: "GATE_VERB_IS_NOT_A_RUN_COMMAND_USE_THE_APPROVAL_WRITE_PATH",
    });
    return;
  }
  if (!(RUN_COMMAND_VERBS as readonly string[]).includes(verb)) {
    ctx.addIssue({ code: "custom", message: "UNKNOWN_RUN_COMMAND_VERB" });
  }
});

/** 18 §6 — `startRun(command: StartRunCommand)`. */
export const startRunCommandSchema = z
  .object({
    workflowDefinitionVersionId: idSchema,
    programId: idSchema.optional(),
    weeklyLensId: idSchema.optional(),
    reason: displayTextSchema.optional(),
    ...commandEnvelope,
  })
  .strict()
  .superRefine((command, ctx) => {
    if (command.programId === undefined && command.weeklyLensId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["programId"],
        message: "START_RUN_REQUIRES_A_PROGRAM_OR_LENS_SUBJECT",
      });
    }
  });
export type StartRunCommand = z.infer<typeof startRunCommandSchema>;

/**
 * The whole run command surface (07 §12 as amended by ADR-0012 D5 and
 * ADR-0013 D2). Kept as one schema so a gate verb is rejected *anywhere* a
 * command name can appear (AC-P2.4).
 */
export const runCommandSchema = z
  .object({
    verb: runCommandVerbSchema,
    runId: idSchema,
    stageId: idSchema.optional(),
    /** 10 §3 — reason for retries, cancellations and plan changes. */
    reason: displayTextSchema.optional(),
    ...commandEnvelope,
  })
  .strict()
  .superRefine((command, ctx) => {
    // ADR-0012 D1 — RETRY_STAGE and SKIP_STAGE are stage-scoped commands.
    if ((command.verb === "RETRY_STAGE" || command.verb === "SKIP_STAGE") && command.stageId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["stageId"],
        message: "STAGE_SCOPED_COMMAND_REQUIRES_A_STAGE_ID",
      });
    }
    // ADR-0012 D5 — governed manual skip: "reason is mandatory".
    if (command.verb === "SKIP_STAGE" && command.reason === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "SKIP_STAGE_REQUIRES_A_REASON",
      });
    }
    // 10 §3 — reason required for cancellations.
    if (command.verb === "CANCEL_RUN" && command.reason === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "CANCEL_RUN_REQUIRES_A_REASON",
      });
    }
  });
export type RunCommand = z.infer<typeof runCommandSchema>;

/**
 * ADR-0013 D1/D2 — the approval decision, carried on the sole approval write
 * path. This is deliberately NOT a member of the run command surface above:
 * approvals are never run commands.
 */
export const approvalCommandSchema = z
  .object({
    approvalRequestId: idSchema,
    decision: z.enum(APPROVAL_DECISIONS),
    /** ADR-0013 D2 — "mandatory reason". Not optional, unlike run commands. */
    reason: displayTextSchema,
    /** 06 §2.2 — a decision binds to the exact immutable subject version. */
    subjectVersionId: idSchema,
    ...commandEnvelope,
  })
  .strict();
export type ApprovalCommand = z.infer<typeof approvalCommandSchema>;

/**
 * 18 §12 — "no UI state falsely claims that a real machine operation occurred".
 * Every receipt names its origin, so a mocked action can always be labelled as
 * one (18 §7.3: "Mock controls ... must never imply that real machine work
 * occurred"). The field is required precisely so it cannot be forgotten.
 */
export const COMMAND_ORIGINS = ["MOCK", "REAL"] as const;
export type CommandOrigin = (typeof COMMAND_ORIGINS)[number];

export const commandReceiptSchema = z
  .object({
    commandId: idSchema,
    accepted: z.boolean(),
    occurredAt: instantSchema,
    origin: z.enum(COMMAND_ORIGINS),
    /** Echoes the caller's key so duplicate submissions are recognisable (10 §3). */
    idempotencyKey: idempotencyKeySchema,
    /** Stable English code when `accepted` is false (10 §2). */
    rejectionCode: stableCodeSchema.optional(),
    /** 10 §2 — `nextPermittedActions` guides the UI after a rejection. */
    nextPermittedActions: z.array(stableCodeSchema).optional(),
  })
  .strict()
  .superRefine((receipt, ctx) => {
    // A rejection without a stable code leaves the UI nothing truthful to show.
    if (receipt.accepted === false && receipt.rejectionCode === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionCode"],
        message: "REJECTED_RECEIPT_REQUIRES_A_REJECTION_CODE",
      });
    }
  });
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
