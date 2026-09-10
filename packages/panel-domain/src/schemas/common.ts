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

/**
 * ADR-0019 D8 — all-day calendar dates. V2 01 §7 requires all-day dates stored
 * as ISO CALENDAR DATES and timed events as UTC instants plus a timezone, so
 * this cannot be `instantSchema`: a date has no time, and widening the instant
 * regex would let a local-offset stamp back in through the calendar.
 *
 * "Never store formatted Persian dates as canonical values" (V2 01 §7) — the
 * Jalali rendering is display-only and never round-trips through here.
 */
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "CALENDAR_DATE_MUST_BE_ISO_YYYY_MM_DD")
  .refine((value) => {
    // A regex alone accepts 2026-02-31. Round-tripping through Date catches it
    // without pulling a date library into a transport-free package.
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    const parsed = new Date(Date.UTC(y, m - 1, d));
    return (
      parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
    );
  }, "CALENDAR_DATE_MUST_BE_A_REAL_DATE");

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

/**
 * 06 §2.2 — the exact immutable subject a decision or event bound to.
 *
 * ADR-0019 D11: this shape was written out twice, inline, in `audit.ts` and
 * `panel-entities.ts`. Declaring it once removes the chance of the two drifting.
 * The stored field is `type`, NOT V2's wire name `kind` — both existing call
 * sites are `.strict()` and carry committed `type` values, so renaming would
 * break them for a presentation preference (ADR-0019 D6: existing repo field
 * names are not renamed). `../projection/wire-codec` translates `kind → type`.
 */
export const subjectRefSchema = z
  .object({
    type: z.string().min(1),
    id: idSchema,
    /** Absent for whole-aggregate subjects; required on version-specific ones. */
    versionId: idSchema.optional(),
  })
  .strict();
export type SubjectRef = z.infer<typeof subjectRefSchema>;

/**
 * The same subject, with the version REQUIRED. `approvalRequestSummarySchema`
 * uses this: a durable approval request always binds to an exact version
 * (06 §2.2), whereas an audit event may address a whole aggregate.
 */
export const versionedSubjectRefSchema = subjectRefSchema.extend({ versionId: idSchema });
export type VersionedSubjectRef = z.infer<typeof versionedSubjectRefSchema>;

/**
 * V2's `Target` — `subjectRefSchema` narrowed to the two reviewable product
 * entities, with `versionId` REQUIRED. A decision that does not name the exact
 * version it bound to is exactly the defect 06 §2.2 exists to prevent.
 */
export const targetSchema = z
  .object({
    type: z.enum(["CONCEPT", "CONTENT"]),
    id: idSchema,
    versionId: idSchema,
  })
  .strict();
export type Target = z.infer<typeof targetSchema>;

/**
 * ADR-0019 D17 — the transport-free export payload.
 *
 * `panel-contracts.ts` proposes `Promise<Blob>`, but `Blob` is a DOM type and
 * `tsconfig.base.json` pins `"lib": ["ES2023"]` deliberately: these packages are
 * documented transport-free. Widening `lib` to satisfy one signature would let
 * DOM types into every contract module. `apps/web` wraps these bytes in a Blob.
 */
export const packageExportSchema = z
  .object({
    bytes: z.instanceof(Uint8Array),
    filename: z.string().min(1, "EXPORT_FILENAME_MUST_NOT_BE_EMPTY"),
    mediaType: z.literal("application/zip"),
  })
  .strict();
export type PackageExport = z.infer<typeof packageExportSchema>;
