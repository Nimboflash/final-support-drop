/**
 * ADR-0015 D5 — the canonical v1 status sets, "amendable only by a subsequent
 * ADR". Contracts mirror them; they are never invented or extended here.
 */

export const PROJECT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROGRAM_STATUSES = ["DRAFT", "IN_PIPELINE", "APPROVED", "ARCHIVED"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const LENS_STATUSES = [
  "DRAFT",
  "IN_PIPELINE",
  "APPROVED",
  "COMMISSIONED",
  "ARCHIVED",
] as const;
export type LensStatus = (typeof LENS_STATUSES)[number];

export const REQUEST_STATUSES = [
  "DRAFT",
  "OPEN",
  "BLOCKED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const CALENDAR_ITEM_STATUSES = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"] as const;
export type CalendarItemStatus = (typeof CALENDAR_ITEM_STATUSES)[number];

/** 06 §3.3 — Program type and Lens mode, transcribed from the required fields. */
export const PROGRAM_TYPES = [
  "SEASONAL_PROGRAM",
  "THEMATIC_PROGRAM",
  "EVENT",
  "COLLABORATION",
  "SPECIAL_PROJECT",
] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const LENS_MODES = ["NONE", "SINGLE_LENS", "LENS_SERIES"] as const;
export type LensMode = (typeof LENS_MODES)[number];
