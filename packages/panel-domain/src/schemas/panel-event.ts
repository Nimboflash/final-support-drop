import { z } from "zod";
import { AUDIT_EVENT_NAMES } from "../vocabulary/events";
import { idSchema, instantSchema, rowVersionSchema, schemaVersionSchema } from "./common";

/**
 * `PanelEvent` — the panel's own subscription DTO (ADR-0019 D9).
 *
 * This is NOT an `AuditEvent`, and that separation is the whole point.
 * `AUDIT_EVENT_NAMES` is closed at its recorded 35 (ADR-0014 D1, "may be
 * extended only by a subsequent ADR") and `auditEventSchema` is `.strict()` with
 * no `data` field at all. The V2 pack's event carries an open `type` and an
 * arbitrary `data` payload, so folding it into the audit schema would either
 * break the closed enum or smuggle an untyped payload into the audit record.
 *
 * Instead: audit stays audit, and this rides beside it as the transport for the
 * panel's mock subscriptions. Which panel event types correspond to which
 * recorded audit names is a `null`-tolerant table below and a named P8
 * coordination item — never a silent extension of either vocabulary.
 *
 * PROVISIONAL (18 §9). The subscription transport itself — mock now, polling or
 * SSE later — is the machine team's contract to choose.
 */
export const panelEventSchema = z
  .object({
    eventId: idSchema,
    schemaVersion: schemaVersionSchema,
    workspaceId: idSchema,
    /** The aggregate this event belongs to, for read-model invalidation. */
    aggregateId: idSchema,
    /** V2 03 §4 — "ignore older aggregate revisions". */
    aggregateRevision: rowVersionSchema,
    correlationId: idSchema,
    occurredAt: instantSchema,
    /**
     * Deliberately OPEN, unlike `auditEventSchema.name`. The panel's own event
     * families are still being discovered; closing this set now would invent
     * vocabulary the machine build has not agreed to (18 §9).
     */
    type: z
      .string()
      .min(1, "EVENT_TYPE_MUST_NOT_BE_EMPTY")
      .regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/, "PANEL_EVENT_TYPE_MUST_BE_DOTTED_LOWER"),
    data: z.unknown(),
  })
  .strict();
export type PanelEvent = z.infer<typeof panelEventSchema>;

/**
 * ADR-0019 D9 — panel event type → the recorded audit name it corresponds to,
 * or `null` where the panel event has no audit counterpart.
 *
 * Modelled on the existing `DOC18_EVENT_FAMILY_MAPPING`: every `null` is an open
 * question for the machine team, not a gap to be filled by inventing an audit
 * name. Panel events describe PANEL state changes (a card moved, a filter-worthy
 * count changed); audit events record governed decisions.
 */
export const PANEL_EVENT_AUDIT_MAPPING: Readonly<
  Record<string, (typeof AUDIT_EVENT_NAMES)[number] | null>
> = {
  "panel.concept.reviewed": "approval.decided",
  "panel.content.reviewed": "approval.decided",
  // No audit counterpart: these are panel read-model movements, and minting an
  // audit name for them would extend a closed ADR-0014 vocabulary by stealth.
  "panel.concept.batch_generated": null,
  "panel.concept.revision_requested": null,
  "panel.content.revision_requested": null,
  "panel.project.created": null,
  "panel.project.concepts_selected": null,
  "panel.package.assembled": null,
  "panel.calendar.entry_created": null,
  "panel.calendar.entry_rescheduled": null,
  "panel.output_plan.amended": null,
};

/** The unresolved half of the table, for the P8 handoff. */
export const UNMAPPED_PANEL_EVENT_TYPES: readonly string[] = Object.entries(
  PANEL_EVENT_AUDIT_MAPPING,
)
  .filter(([, audit]) => audit === null)
  .map(([type]) => type);
