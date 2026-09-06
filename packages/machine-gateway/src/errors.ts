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
] as const;
export type GatewayErrorReason = (typeof GATEWAY_ERROR_REASONS)[number];

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
} as const;
