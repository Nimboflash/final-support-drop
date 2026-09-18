/**
 * The typed gateway error model.
 *
 * Every method of both gateways fails through this model — "never undefined or
 * silent nulls" (P2 failure_states). Scenarios 13 (machine system disconnected)
 * and 14 (unauthorized action for the current role) are presented through it
 * (18 §7.2), which is why those two reasons are first-class rather than folded
 * into a generic failure.
 *
 * Codes are stable English identifiers (10 §2); Persian presentation is the
 * UI's concern and never appears here.
 */

export const GATEWAY_ERROR_REASONS = [
  /** No entity with the requested id. Distinct from an empty list. */
  "UNKNOWN_ID",
  /** 18 §7.2.13 — the machine system is disconnected or unavailable. */
  "MACHINE_SYSTEM_DISCONNECTED",
  /** 18 §7.2.14 — the current role may not perform this action. */
  "UNAUTHORIZED",
  /** The call exceeded its deadline (18 §7.3 "simulate ... timeout"). */
  "TIMEOUT",
  /** 18 §7.3 — data was served but is known to be stale. */
  "STALE_DATA",
  /** The command was rejected by a state guard (ADR-0012 D1). */
  "INVALID_STATE_TRANSITION",
  /** The payload failed panel-domain validation before transport. */
  "SCHEMA_VALIDATION_FAILED",
  /**
   * ADR-0019 D10 — the caller's `expectedRowVersion` is stale.
   *
   * Deliberately NOT retryable: V2 03 §4 says the mock "rejects stale
   * expectedRevision with CONFLICT and asks the UI to refresh while preserving
   * typed feedback". Replaying the identical command would be stale again, so
   * the resolution is refresh-then-resubmit, never a retry loop.
   */
  "REVISION_CONFLICT",
] as const;
export type GatewayErrorReason = (typeof GATEWAY_ERROR_REASONS)[number];

/**
 * What the UI may offer next (10 §2), as a closed vocabulary.
 *
 * `nextPermittedActions` has always been the recorded vehicle for "and now
 * what?" — `revisionConflict` below has carried `REFRESH_AND_RESUBMIT` since
 * ADR-0019 D10. What was missing was the rest of the set. Every refusal the
 * write proxy can author (a lock held, a cooldown running, a budget spent, a
 * portfolio already built, a write that outlived its request) arrived as one
 * of the eight reasons and then rendered as the SAME sentence, because the
 * reason alone cannot tell "wait thirty seconds" from "start a new session".
 *
 * A ninth reason would have been the other way to say these things, and
 * ADR-0021 D6 forbids widening that set. This is the vocabulary the recorded
 * field was always meant to carry, written down so the UI can key on it rather
 * than on message text.
 */
export const NEXT_ACTIONS = {
  /** ADR-0019 D10 — the caller's view is stale; re-read, then send again. */
  REFRESH_AND_RESUBMIT: "REFRESH_AND_RESUBMIT",
  /** The machine is busy with an earlier request on this session. Nothing was spent. */
  WAIT_THEN_RETRY: "WAIT_THEN_RETRY",
  /** A paid call ran a moment ago and the proxy is holding the next one back. Nothing was spent. */
  COOL_DOWN: "COOL_DOWN",
  /** The write passed its deadline but the service has no cancellation: it may still be running and spending. Do NOT resubmit. */
  WAIT_FOR_RESULT: "WAIT_FOR_RESULT",
  /** This session's ceiling on paid calls is reached. */
  START_NEW_SESSION: "START_NEW_SESSION",
  /** Research already exists for this session; doing this again replaces it, at a cost. */
  REPLACE_EXISTING: "REPLACE_EXISTING",
  /** Writes to the machine are switched off in this deployment. */
  ENABLE_WRITES: "ENABLE_WRITES",
  /** The machine has no such verb; the decision cannot be recorded on its side. */
  UNSUPPORTED_BY_MACHINE: "UNSUPPORTED_BY_MACHINE",
  /** ADR-0013 D2 — the decision needs a reason before it can be recorded. */
  ADD_A_REASON: "ADD_A_REASON",
  /** The provider would not accept the machine's key — expired, revoked, or never configured. Nothing was spent. */
  REPLACE_PROVIDER_KEY: "REPLACE_PROVIDER_KEY",
  /** The provider account has no credit left for this call. Nothing was spent. */
  TOP_UP_PROVIDER: "TOP_UP_PROVIDER",
  /** The provider rejected the request itself — usually a model id it no longer serves. Nothing was spent. */
  PROVIDER_REJECTED: "PROVIDER_REJECTED",
  /** The provider is overloaded or down. Nothing was spent; later is fine. */
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  /** The model answered, but the answer did not fit the recorded shape. That call WAS charged; the same press usually works. */
  MODEL_ANSWER_UNUSABLE: "MODEL_ANSWER_UNUSABLE",
} as const;
export type NextAction = (typeof NEXT_ACTIONS)[keyof typeof NEXT_ACTIONS];

export interface GatewayErrorOptions {
  /** 10 §2 — a correlation handle the UI can surface without leaking internals. */
  readonly diagnosticId?: string;
  /** 10 §2 — what the UI may offer next. */
  readonly nextPermittedActions?: readonly string[];
  /** True when retrying the identical call could succeed (10 §2). */
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

/**
 * The single error type both gateways throw. A concrete class (rather than a
 * union of plain objects) so `instanceof` narrowing works across the adapter
 * boundary and an accidental generic `Error` is distinguishable from a
 * contract-conformant failure.
 */
export class GatewayError extends Error {
  readonly reason: GatewayErrorReason;
  readonly diagnosticId: string | undefined;
  readonly nextPermittedActions: readonly string[];
  readonly retryable: boolean;

  constructor(reason: GatewayErrorReason, message: string, options: GatewayErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "GatewayError";
    this.reason = reason;
    this.diagnosticId = options.diagnosticId;
    this.nextPermittedActions = options.nextPermittedActions ?? [];
    // Disconnection and timeouts are transient by nature; authorization and
    // unknown ids are not. Callers may override, but the default must never
    // invite a retry loop against a permission denial.
    this.retryable =
      options.retryable ??
      (reason === "MACHINE_SYSTEM_DISCONNECTED" || reason === "TIMEOUT" || reason === "STALE_DATA");
  }
}

export function isGatewayError(value: unknown): value is GatewayError {
  return value instanceof GatewayError;
}

/** Convenience constructors for the two reasons scenarios 13 and 14 present. */
export const gatewayErrors = {
  unknownId: (kind: string, id: string): GatewayError =>
    new GatewayError("UNKNOWN_ID", `UNKNOWN_ID: no ${kind} with id "${id}"`, {
      retryable: false,
    }),
  disconnected: (detail = "machine system unavailable"): GatewayError =>
    new GatewayError("MACHINE_SYSTEM_DISCONNECTED", `MACHINE_SYSTEM_DISCONNECTED: ${detail}`),
  unauthorized: (action: string): GatewayError =>
    new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: current role may not ${action}`, {
      retryable: false,
    }),
  /**
   * ADR-0019 D10. The message names both revisions so the UI can tell the user
   * what changed underneath them, and `nextPermittedActions` points at the
   * refresh rather than at a retry.
   */
  revisionConflict: (kind: string, expected: number, actual: number): GatewayError =>
    new GatewayError(
      "REVISION_CONFLICT",
      `REVISION_CONFLICT: ${kind} moved from revision ${String(expected)} to ${String(actual)}`,
      { nextPermittedActions: ["REFRESH_AND_RESUBMIT"] },
    ),
} as const;
