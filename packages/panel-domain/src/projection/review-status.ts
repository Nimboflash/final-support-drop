import { APPROVAL_DECISIONS, type ApprovalDecision } from "../vocabulary/approval";
import { REVIEW_STATUSES, type ReviewStatus } from "../vocabulary/product";

/**
 * The review projection (ADR-0019 D5).
 *
 * V2 01 §8 is explicit: "Reuse existing repo run enums through a projection
 * adapter; do not replace its ADR state machine with this UI vocabulary." This
 * module is that adapter, and it is the ONLY place the two vocabularies meet.
 *
 * The mapping is deliberately partial in both directions:
 *
 *  - `DRAFT` and `IN_REVIEW` are pre-decision card states. They project to
 *    `null`, not to a decision — a card nobody has judged has no decision to
 *    submit, and inventing `PENDING` here would put a non-decision into
 *    `APPROVAL_DECISIONS`.
 *  - `ESCALATED` is a decision with no card counterpart. It is NOT dropped:
 *    `escalatedCardPresentation` is its recorded rendering, so an escalated
 *    request stays visible instead of silently vanishing from the board.
 */

/** Card status → the ADR-0013 decision it submits, or `null` if it submits none. */
export function toApprovalDecision(status: ReviewStatus): ApprovalDecision | null {
  switch (status) {
    case "REVISION_REQUESTED":
      return "CHANGES_REQUESTED";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "DRAFT":
    case "IN_REVIEW":
      // Pre-decision states. Not an error, and not a decision.
      return null;
  }
}

/**
 * ADR-0013 decision → the card status it produces.
 *
 * `ESCALATED` has no card status of its own; it keeps the card in review and is
 * surfaced by `escalatedCardPresentation`.
 */
export function toReviewStatus(decision: ApprovalDecision): ReviewStatus {
  switch (decision) {
    case "CHANGES_REQUESTED":
      return "REVISION_REQUESTED";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "ESCALATED":
      return "IN_REVIEW";
  }
}

/**
 * ADR-0019 D5 — the recorded rendering for `ESCALATED`.
 *
 * The card stays in review AND carries an escalation marker, so the round trip
 * `ESCALATED → IN_REVIEW` never loses the fact that a human escalated it.
 */
export const escalatedCardPresentation = {
  reviewStatus: "IN_REVIEW",
  escalated: true,
  labelKey: "APPROVAL_ESCALATED",
} as const;

/**
 * Round-trip safety net. `ESCALATED` is the one decision that does not survive a
 * round trip, by construction — every other decision must.
 */
export const NON_ROUND_TRIPPING_DECISIONS = ["ESCALATED"] as const satisfies readonly ApprovalDecision[];

/** Guard helpers, so callers never hand a raw string to a switch. */
export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}
export function isApprovalDecision(value: string): value is ApprovalDecision {
  return (APPROVAL_DECISIONS as readonly string[]).includes(value);
}
