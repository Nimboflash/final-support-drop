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

export const APPROVAL_STATES = ["PENDING", "APPROVED", "CHANGES_REQUESTED", "ESCALATED"] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const ACTOR_ROLES = [
  "WORKSPACE_OWNER", "DROP_GUARDIAN", "PROJECT_LEAD", "REVIEWER_EDITOR",
  "CONTRIBUTOR", "VIEWER", "TECHNICAL_MAINTAINER",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];
