/**
 * Research vocabulary — 06 §5 (Machine 02 entities). Only the enumerations the
 * panel presents are transcribed here; the research engine itself is
 * machine-side scope (18 §5).
 */

/** 06 §5 — `studio.source_registry_entries` lifecycle. */
export const SOURCE_LIFECYCLE_STATES = [
  "CANDIDATE",
  "VALIDATED",
  "ACTIVE",
  "DEACTIVATED",
  "ARCHIVED",
] as const;
export type SourceLifecycleState = (typeof SOURCE_LIFECYCLE_STATES)[number];

/**
 * 00 §4 — research needs both Iranian/Persian and international evidence and
 * "neither coverage class may be zero". These are the two coverage classes the
 * panel reports against.
 */
export const COVERAGE_CLASSES = ["IRANIAN_PERSIAN", "INTERNATIONAL"] as const;
export type CoverageClass = (typeof COVERAGE_CLASSES)[number];

/** 06 §5 — `studio.research_plans` status. */
export const RESEARCH_PLAN_STATUSES = [
  "DRAFT",
  "FROZEN",
  "AMENDED",
  "SUPERSEDED",
] as const;
export type ResearchPlanStatus = (typeof RESEARCH_PLAN_STATUSES)[number];
