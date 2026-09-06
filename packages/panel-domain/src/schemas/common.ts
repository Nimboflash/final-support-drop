import { z } from "zod";

/**
 * Shared primitives for every panel DTO.
 *
 * Rules encoded here come from the recorded contract:
 * - 06 §1  — UUID/ULID-style application identifiers, consistently applied.
 * - 06 §1  — UTC persistence; Jalali Tehran display is the UI's concern (09 §12).
 * - 06 §1  — every mutable business row carries an optimistic `row_version`.
 * - 10 §2  — stable English identifiers; Persian is presentation-only.
 * - 18 §9  — every payload carries a schema version.
 */

/** The panel contract set's version. Bumping it is an ADR-level change. */
export const PANEL_SCHEMA_VERSION = "1.0.0";

/** 18 §9 — `schemaVersion` on every envelope. Semantic version, exact form. */
export const schemaVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "SCHEMA_VERSION_MUST_BE_SEMVER");

/**
 * 06 §1 — application identifiers. The panel treats them as opaque: it never
 * parses meaning out of an ID, only round-trips it. Mixed ID strategies are a
 * recorded defect, so the shape is pinned rather than left as any string.
 */
export const idSchema = z
  .string()
  .min(1, "ID_MUST_NOT_BE_EMPTY")
  .max(128, "ID_TOO_LONG")
  .regex(/^[A-Za-z0-9_-]+$/, "ID_MUST_BE_URL_SAFE_OPAQUE");

/** 06 §1 — UTC instants only. A local-time or offset stamp is a defect. */
export const instantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/,
    "INSTANT_MUST_BE_UTC_ISO_8601",
  );

/** 06 §1 — optimistic concurrency token. */
export const rowVersionSchema = z.int().nonnegative("ROW_VERSION_MUST_BE_NON_NEGATIVE");

/** 06 §9.2 — per-run monotonic ordering for run events. */
export const sequenceNumberSchema = z.int().nonnegative("SEQUENCE_MUST_BE_NON_NEGATIVE");

/**
 * 10 §2 — stable English identifiers for codes. Used for error codes, reason
 * codes and any vocabulary the recorded documents leave open.
 */
export const stableCodeSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/, "CODE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE");

/** Human-authored Persian content (titles, reasons). Never a code. */
export const displayTextSchema = z.string().min(1, "TEXT_MUST_NOT_BE_EMPTY");

/** 10 §3 — commands that can be retried carry an idempotency key. */
export const idempotencyKeySchema = z
  .string()
  .min(8, "IDEMPOTENCY_KEY_TOO_SHORT")
  .max(200, "IDEMPOTENCY_KEY_TOO_LONG");

/**
 * Cursor pagination (10 §10). The panel never assumes offset semantics; a
 * cursor is opaque.
 */
export const paginationSchema = z.object({
  limit: z.int().min(1, "LIMIT_MUST_BE_POSITIVE").max(200, "LIMIT_TOO_LARGE").optional(),
  cursor: z.string().min(1).optional(),
});
export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Safe diagnostics (18 §4.1 "logs/diagnostics safe for users"). A diagnostic
 * carries a stable code and a correlation handle — never a provider payload,
 * never a raw AI response (06 §7: raw responses live in a restricted namespace
 * and are gated by RAW_RESPONSE_READ, ADR-0013 D6).
 */
export const safeDiagnosticSchema = z.object({
  code: stableCodeSchema,
  diagnosticId: idSchema,
  occurredAt: instantSchema,
  detail: z.string().max(2000).optional(),
});
export type SafeDiagnostic = z.infer<typeof safeDiagnosticSchema>;

/**
 * 06 §7 — raw AI responses "can never be referenced as an approved artifact
 * version" and every read is governed by RAW_RESPONSE_READ (ADR-0013 D6). The
 * panel therefore models only the *existence* of a raw response, never its
 * content: there is deliberately no payload field to leak.
 */
export const rawResponseHandleSchema = z.object({
  available: z.boolean(),
  requiredCapability: z.literal("RAW_RESPONSE_READ"),
});
export type RawResponseHandle = z.infer<typeof rawResponseHandleSchema>;
