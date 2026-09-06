/**
 * Stage and run vocabulary — transcribed from ADR-0012, never derived
 * (ADR-0017 D4: the recorded state machine is the presentation vocabulary of
 * the mocks). Exact-membership tests in vocabulary.test.ts pin every value.
 */

/** ADR-0012 D1 — the 14 canonical persisted stage states (07 §3, unchanged). */
export const STAGE_STATUSES = [
  "DRAFT",
  "READY",
  "QUEUED",
  "RUNNING",
  "WAITING_FOR_DEPENDENCY",
  "WAITING_FOR_INPUT",
  "WAITING_FOR_APPROVAL",
  "PAUSED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "SUCCEEDED",
  "SKIPPED",
  "CANCELLED",
  "SUPERSEDED",
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

/** ADR-0012 D2 — the run-level status enum (`studio.pipeline_runs.status`). */
export const RUN_STATUSES = [
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "WAITING_INPUT",
  "WAITING_APPROVAL",
  "PAUSED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/**
 * ADR-0012 D4 — `PROVIDER_CONFIGURATION_REQUIRED` is the one reason code the
 * recorded decisions name. The wider reason-code set is **not** enumerated by
 * any authority document, so this constant is deliberately the recorded set
 * only and is NOT treated as closed: `waitingReasonCodeSchema` accepts any
 * stable English identifier and this list drives presentation.
 *
 * OPEN (P8 coordination): the machine build owns the full reason-code
 * enumeration. Closing it here would invent vocabulary (testing-strategy §2.2).
 */
export const WAITING_REASON_CODES = ["PROVIDER_CONFIGURATION_REQUIRED"] as const;
export type RecordedWaitingReasonCode = (typeof WAITING_REASON_CODES)[number];

/**
 * ADR-0013 D2 — the runtime command set after the gate verbs were removed.
 * `SKIP_STAGE` was added by ADR-0012 D5.
 */
export const RUN_COMMAND_VERBS = [
  "START_RUN",
  "PAUSE_RUN",
  "RESUME_RUN",
  "CANCEL_RUN",
  "RETRY_STAGE",
  "SUBMIT_INPUT",
  "SKIP_STAGE",
  "CREATE_RERUN",
] as const;
export type RunCommandVerb = (typeof RUN_COMMAND_VERBS)[number];
