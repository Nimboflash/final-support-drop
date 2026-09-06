/**
 * Audit event vocabulary — the 10 §9 taxonomy plus the seven additions of
 * ADR-0014 D1. ADR-0017 D4 makes this the presentation vocabulary of the mocks.
 * The taxonomy is closed: ADR-0014 D1 states it "may be extended only by a
 * subsequent ADR".
 */

/** The 10 §9 taxonomy, in document order. */
const TAXONOMY_10_9 = [
  "project.created",
  "program.created",
  "workflow.version.published",
  "run.started",
  "stage.queued",
  "stage.started",
  "stage.waiting_for_input",
  "stage.waiting_for_approval",
  "stage.succeeded",
  "stage.failed_retryable",
  "stage.failed_final",
  "approval.requested",
  "approval.decided",
  "artifact.version.created",
  "artifact.validation.failed",
  "artifact.approved",
  "research.plan.frozen",
  "research.slot.blocked",
  "research.request.created",
  "concept.selected",
  "concept_bible.published",
  "lens.created",
  "output_manifest.published",
  "request.assigned",
  "request.blocked",
  "feedback.submitted",
  "revision.requested",
  "handoff.declared_complete",
] as const;

/** Added by ADR-0014 D1 — the terminal, pause and skip events (10 §9 omitted them). */
const ADDED_BY_ADR_0014 = [
  "run.completed",
  "run.failed",
  "run.cancelled",
  "run.paused",
  "run.resumed",
  "stage.skipped",
  "stage.cancelled",
] as const;

export const AUDIT_EVENT_NAMES = [...TAXONOMY_10_9, ...ADDED_BY_ADR_0014] as const;
export type AuditEventName = (typeof AUDIT_EVENT_NAMES)[number];

/**
 * ADR-0014 D1 — `heartbeat` is a transport-only frame: not persisted to
 * `studio.run_events`, no sequence number, ignored by client reconciliation.
 * It is therefore never an AuditEvent name (AC-P2.3).
 */
export const TRANSPORT_ONLY_FRAMES = ["heartbeat"] as const;
export type TransportOnlyFrame = (typeof TRANSPORT_ONLY_FRAMES)[number];

/**
 * The (18 §9) event families, recorded verbatim for the mapping note below.
 * These are NOT AuditEvent names — ADR-0017 D4 rules the recorded 10 §9 +
 * ADR-0014 taxonomy is the presentation vocabulary.
 */
export const DOC18_EVENT_FAMILIES = [
  "workflow.run.created",
  "workflow.run.started",
  "workflow.stage.started",
  "workflow.stage.progressed",
  "workflow.stage.blocked",
  "workflow.stage.failed",
  "workflow.stage.completed",
  "approval.requested",
  "approval.resolved",
  "artifact.created",
  "workflow.run.completed",
  "workflow.run.failed",
] as const;
export type Doc18EventFamily = (typeof DOC18_EVENT_FAMILIES)[number];

/**
 * Name-level mapping between the (18 §9) families and the recorded taxonomy
 * (P2 body, mechanic 4). `null` means **no recorded counterpart exists** — an
 * unresolved contract decision, not an omission to be patched here.
 *
 * OPEN (P8 coordination): this table is the panel's reading, reported in the
 * handoff. Per (18 §9) the panel must not impose it on the machine build.
 */
export const DOC18_EVENT_FAMILY_MAPPING: Readonly<
  Record<Doc18EventFamily, AuditEventName | null>
> = {
  "workflow.run.created": null, // no recorded run-created event; 10 §9 starts at run.started
  "workflow.run.started": "run.started",
  "workflow.stage.started": "stage.started",
  "workflow.stage.progressed": null, // no recorded progress event; attempts carry progress
  "workflow.stage.blocked": null, // recorded model splits blocking into waiting_for_input / waiting_for_approval
  "workflow.stage.failed": null, // recorded model splits into failed_retryable / failed_final
  "workflow.stage.completed": "stage.succeeded",
  "approval.requested": "approval.requested",
  "approval.resolved": "approval.decided",
  "artifact.created": "artifact.version.created",
  "workflow.run.completed": "run.completed",
  "workflow.run.failed": "run.failed",
};
