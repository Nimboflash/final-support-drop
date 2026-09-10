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

/**
 * 10 §3 — every mutating request carries this envelope, extended by ADR-0019 D10
 * with the V2 `CommandMeta` fields.
 *
 * Two deliberate narrowings against `docs/frontend-v2/mock/panel-contracts.ts`:
 *
 *  - V2 types `activeRole` as a bare `string`. It stays the closed `ACTOR_ROLES`
 *    enum here — V2 03 §5 itself forbids resolving the recorded eight-roles-
 *    versus-seven conflict by picking a production count, and an open string
 *    would do exactly that by accident.
 *  - V2 names the concurrency token `expectedRevision`. `expectedRowVersion` is
 *    the recorded name (06 §1) and stays canonical; the alias is accepted only
 *    at the adapter boundary, by `normalizeCommandMeta` below.
 */
const commandEnvelope = {
  /** V2 03 §4 — idempotency handle; the same id twice returns the first receipt. */
  commandId: idSchema,
  workspaceId: idSchema,
  actorId: idSchema,
  /** 10 §3 — acted-as role where an actor holds multiple roles. */
  actedAsRole: z.enum(ACTOR_ROLES),
  /** 10 §3 — `Idempotency-Key` for commands that can be retried. */
  idempotencyKey: idempotencyKeySchema,
  /** 10 §3 — `expectedRowVersion` for mutable aggregate updates. */
  expectedRowVersion: rowVersionSchema.optional(),
};

/** The envelope as a schema in its own right (ADR-0019 D10). */
export const commandEnvelopeSchema = z.object(commandEnvelope).strict();
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;

/**
 * Accepts V2's `CommandMeta` shape and returns the canonical envelope.
 *
 * `idempotencyKey` derives from `commandId` when absent: V2's `commandId` has no
 * length floor and `idempotencyKeySchema` requires eight characters, so a short
 * demo id would otherwise fail validation for a reason that has nothing to do
 * with the caller's intent.
 */
export function normalizeCommandMeta(meta: {
  commandId: string;
  workspaceId: string;
  actorId: string;
  actedAsRole?: string;
  activeRole?: string;
  idempotencyKey?: string;
  expectedRowVersion?: number;
  expectedRevision?: number;
}): unknown {
  const role = meta.actedAsRole ?? meta.activeRole;
  return {
    commandId: meta.commandId,
    workspaceId: meta.workspaceId,
    actorId: meta.actorId,
    actedAsRole: role,
    idempotencyKey: meta.idempotencyKey ?? `cmd-${meta.commandId}`,
    expectedRowVersion: meta.expectedRowVersion ?? meta.expectedRevision,
  };
}

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

/**
 * V2 03 §4 — "Accepted is not completed." The tri-state is load-bearing: a mock
 * that returns SUCCEEDED for work it merely queued would be exactly the false
 * claim 18 §12 forbids.
 */
export const RECEIPT_STATUSES = ["ACCEPTED", "SUCCEEDED", "REJECTED"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const commandReceiptSchema = z
  .object({
    commandId: idSchema,
    accepted: z.boolean(),
    /** ADR-0019 D10 — the V2 tri-state, alongside the recorded `accepted` flag. */
    status: z.enum(RECEIPT_STATUSES),
    /** V2 03 §4 — ties the receipt to the events the command produced. */
    correlationId: idSchema,
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
    // The two flags describe the same outcome and must not disagree.
    if (receipt.accepted === false && receipt.status !== "REJECTED") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "REJECTED_RECEIPT_MUST_CARRY_REJECTED_STATUS",
      });
    }
    if (receipt.accepted === true && receipt.status === "REJECTED") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "ACCEPTED_RECEIPT_MUST_NOT_CARRY_REJECTED_STATUS",
      });
    }
  });
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
