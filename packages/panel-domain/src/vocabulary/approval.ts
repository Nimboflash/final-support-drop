/**
 * Approval vocabulary — ADR-0013. The panel presents these semantics; it never
 * enforces them (18 §4.2: panel-side checks are never a security boundary).
 */

/** ADR-0013 D2 — the decision set carried by the single approval write path. */
export const APPROVAL_DECISIONS = [
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "ESCALATED",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

/** ADR-0013 D5 — the 11 §6.1 self-approval modes, preserved unchanged. */
export const SELF_APPROVAL_MODES = [
  "AUTHORIZED_ROLE",
  "SELF_APPROVAL_ALLOWED",
  "DISTINCT_REVIEWER_REQUIRED",
] as const;
export type SelfApprovalMode = (typeof SELF_APPROVAL_MODES)[number];

/**
 * ADR-0013 D2 — removed from the 07 §12 command set and rejected as run/stage
 * commands. Recorded here so the command schemas can reject them by name with
 * an asserted reason (AC-P2.4) rather than merely omitting them.
 */
export const BANNED_GATE_COMMAND_VERBS = [
  "APPROVE_GATE",
  "REQUEST_CHANGES",
  "ESCALATE_GATE",
] as const;
export type BannedGateCommandVerb = (typeof BANNED_GATE_COMMAND_VERBS)[number];
