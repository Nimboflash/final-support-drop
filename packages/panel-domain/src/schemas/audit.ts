import { z } from "zod";
import {
  ACTOR_ROLES,
  ACTOR_TYPES,
  AUDIT_EVENT_NAMES,
  TRANSPORT_ONLY_FRAMES,
} from "../vocabulary/index";
import {
  idSchema,
  instantSchema,
  paginationSchema,
  schemaVersionSchema,
  sequenceNumberSchema,
  subjectRefSchema,
} from "./common";

/**
 * AuditEvent — the 10 §9 taxonomy plus the ADR-0014 D1 additions, inside the
 * (18 §9) payload envelope: schema version, event ID, occurred-at,
 * correlation/run ID, workspace ID and originating machine/version where
 * applicable.
 */

/** 18 §9 — "originating machine/version where applicable". */
export const eventOriginSchema = z
  .object({
    machineNumber: z.int().min(1).max(5),
    machineVersion: z.string().min(1, "MACHINE_VERSION_REQUIRED"),
  })
  .strict();
export type EventOrigin = z.infer<typeof eventOriginSchema>;

/** 11 §3 — every governed action records the role it was performed under. */
export const eventActorSchema = z
  .object({
    id: idSchema,
    actorType: z.enum(ACTOR_TYPES),
    actedAsRole: z.enum(ACTOR_ROLES).optional(),
    displayName: z.string().min(1).optional(),
  })
  .strict();
export type EventActor = z.infer<typeof eventActorSchema>;

export const auditEventSchema = z
  .object({
    /** 18 §9 — event ID. */
    eventId: idSchema,
    /** 18 §9 — schema version on every payload. */
    schemaVersion: schemaVersionSchema,
    /** ADR-0014 D1 — the closed taxonomy. `heartbeat` is not a member. */
    name: z.enum(AUDIT_EVENT_NAMES),
    /** 18 §9 — occurred-at timestamp. */
    occurredAt: instantSchema,
    /** 18 §9 — workspace ID. */
    workspaceId: idSchema,
    /** 18 §9 — correlation ID. */
    correlationId: idSchema,
    /** 18 §9 — run ID, where the event belongs to a run. */
    runId: idSchema.optional(),
    /** 06 §9.2 — per-run monotonic ordering, absent for non-run events. */
    sequenceNumber: sequenceNumberSchema.optional(),
    actor: eventActorSchema.optional(),
    origin: eventOriginSchema.optional(),
    /** 06 §2.2 — the exact immutable subject version a decision bound to. */
    subject: subjectRefSchema.optional(),
  })
  .strict()
  .superRefine((event, ctx) => {
    // ADR-0014 D1 — heartbeat "is not persisted to studio.run_events, carries
    // no sequence number". Belt and braces: the enum already excludes it, but a
    // cited rejection is what AC-P2.3 asserts.
    if ((TRANSPORT_ONLY_FRAMES as readonly string[]).includes(event.name as string)) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "TRANSPORT_ONLY_FRAME_IS_NOT_AN_AUDIT_EVENT",
      });
    }
    // 06 §9.2 — a sequence number is meaningful only inside a run.
    if (event.sequenceNumber !== undefined && event.runId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["sequenceNumber"],
        message: "SEQUENCE_NUMBER_REQUIRES_A_RUN_ID",
      });
    }
    // ADR-0013 D4 — only HUMAN actors decide approvals. A machine-decided
    // approval must be unrepresentable, not merely unusual.
    if (event.name === "approval.decided" && event.actor?.actorType !== "HUMAN") {
      ctx.addIssue({
        code: "custom",
        path: ["actor", "actorType"],
        message: "APPROVAL_DECISIONS_REQUIRE_A_HUMAN_ACTOR",
      });
    }
  });
export type AuditEvent = z.infer<typeof auditEventSchema>;

/** Filter arguments for `MachineGateway.listAuditEvents` (18 §6). */
export const auditFiltersSchema = paginationSchema
  .extend({
    names: z.array(z.enum(AUDIT_EVENT_NAMES)).optional(),
    runId: idSchema.optional(),
    actorId: idSchema.optional(),
    occurredAfter: instantSchema.optional(),
    occurredBefore: instantSchema.optional(),
  })
  .strict();
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
