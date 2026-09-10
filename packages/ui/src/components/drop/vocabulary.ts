/**
 * The presentation vocabulary — transcribed from the recorded decisions, never derived
 * (ADR-0017 D4). Stage/run states: ADR-0012. Status enums: ADR-0015. Roles: doc 11 §3.
 * Approval states: ADR-0013's decision set plus the pending presentation state.
 * P2's panel-domain DTOs pin equality against these at its contract seam.
 */

export const STAGE_STATUSES = [
  "DRAFT", "READY", "QUEUED", "RUNNING",
  "WAITING_FOR_DEPENDENCY", "WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL",
  "PAUSED", "FAILED_RETRYABLE", "FAILED_FINAL",
  "SUCCEEDED", "SKIPPED", "CANCELLED", "SUPERSEDED",
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const RUN_STATUSES = [
  "DRAFT", "QUEUED", "RUNNING", "WAITING_INPUT", "WAITING_APPROVAL",
  "PAUSED", "SUCCEEDED", "FAILED", "CANCELLED",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const PROJECT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROGRAM_STATUSES = ["DRAFT", "IN_PIPELINE", "APPROVED", "ARCHIVED"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const LENS_STATUSES = [
  "DRAFT", "IN_PIPELINE", "APPROVED", "COMMISSIONED", "ARCHIVED",
] as const;
export type LensStatus = (typeof LENS_STATUSES)[number];

export const REQUEST_STATUSES = [
  "DRAFT", "OPEN", "BLOCKED", "IN_PROGRESS", "IN_REVIEW",
  "CHANGES_REQUESTED", "APPROVED", "COMPLETED", "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const CALENDAR_ITEM_STATUSES = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"] as const;
export type CalendarItemStatus = (typeof CALENDAR_ITEM_STATUSES)[number];

/**
 * ADR-0013 D2's decision set plus the pending presentation state. `REJECTED`
 * was missing until ADR-0019 D14/AC-P1R.9: ADR-0013 D2 lists it and ADR-0012 D1
 * gives it a stage transition (WAITING_FOR_APPROVAL + REJECTED → FAILED_FINAL),
 * so a rejected approval had no badge at all. `tests/repo/vocabulary-parity.test.ts`
 * pinned that gap deliberately and is amended in the same commit that closes it.
 */
export const APPROVAL_STATES = [
  "PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "ESCALATED",
] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

/**
 * The V2 card review axis (ADR-0019 D5) — additive PRESENTATION vocabulary, not
 * a replacement for APPROVAL_DECISIONS. The projection is:
 * revision_requested → CHANGES_REQUESTED, approved → APPROVED, rejected →
 * REJECTED; DRAFT and IN_REVIEW are pre-PENDING item states and project to no
 * decision at all. Stored codes stay UPPER_SNAKE (ADR-0019 D6); V2's lowercase
 * literals are the mock-JSON wire form, normalized at the loader boundary.
 */
export const REVIEW_STATUSES = [
  "DRAFT", "IN_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Freshness is a SEPARATE axis from review status (V2 01 §8). */
export const FRESHNESS_STATES = ["CURRENT", "STALE"] as const;
export type Freshness = (typeof FRESHNESS_STATES)[number];

/** Package snapshot lifecycle (V2 01 §6; ADR-0019 D7). */
export const PACKAGE_STATUSES = ["CURRENT", "HISTORICAL", "STALE"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const ACTOR_ROLES = [
  "WORKSPACE_OWNER", "DROP_GUARDIAN", "PROJECT_LEAD", "REVIEWER_EDITOR",
  "CONTRIBUTOR", "VIEWER", "TECHNICAL_MAINTAINER",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];
