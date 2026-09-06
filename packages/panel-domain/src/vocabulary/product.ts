/**
 * Product-level vocabulary introduced by the owner's V2 pack (ADR-0019 D5, D12).
 *
 * Every set here is ADDITIVE PRESENTATION. None of it replaces a recorded
 * decision: `STAGE_STATUSES` and `RUN_STATUSES` (ADR-0012) remain the execution
 * axes, `APPROVAL_DECISIONS` (ADR-0013) remains the decision set, and
 * `CALENDAR_ITEM_STATUSES` (ADR-0015 D5) remains the calendar set. The bridges
 * between the two layers live in `../projection/`, never in these constants.
 *
 * The V2 pack writes these values in lowercase snake_case. That is the
 * mock-JSON WIRE form: stored codes stay UPPER_SNAKE stable English
 * (`stableCodeSchema`, ADR-0019 D6), and `../projection/wire-codec` normalizes
 * at the boundary.
 */

/**
 * V2 01 §8 — the card review axis. Kept separate from `APPROVAL_DECISIONS`:
 * `CHANGES_REQUESTED` is what a reviewer SUBMITS, `REVISION_REQUESTED` is what
 * the card then SHOWS, and `DRAFT`/`IN_REVIEW` precede any decision at all.
 */
export const REVIEW_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * V2 01 §8 — "freshness is a separate current/stale field". An approved card
 * whose upstream concept changed stays APPROVED and becomes STALE; collapsing
 * the two axes would lose exactly that state.
 */
export const FRESHNESS_STATES = ["CURRENT", "STALE"] as const;
export type Freshness = (typeof FRESHNESS_STATES)[number];

/**
 * V2 01 §8 — generation job states. Distinct again from both review status and
 * the ADR-0012 stage enum: a job is machine work, a review status is a human
 * verdict on its output.
 */
export const GENERATION_JOB_STATES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "BLOCKED",
] as const;
export type GenerationJobState = (typeof GENERATION_JOB_STATES)[number];

/**
 * PROVISIONAL / OPEN (ADR-0019 D12). The V2 product phase axis, orthogonal to
 * `STAGE_STATUSES` and `RUN_STATUSES`. The run-stage-to-product-stage mapping is
 * a named P8 coordination decision and is deliberately `null`-tolerant in
 * `../projection/product-stage`; the machine build owns the real mapping.
 *
 * There is deliberately no `review` member. The V2 stage strip shows a Review
 * segment, but that is a DISPLAY GROUPING derived from open review counts — see
 * `PROJECT_STAGE_SEGMENTS` in `@drop/ui`. Adding `review` here to make the strip
 * easier would invent a stored state the pack never defines.
 */
export const PRODUCT_STAGES = [
  "DRAFT",
  "CONCEPTS",
  "RESEARCH_CONTENT",
  "PACKAGE",
  "CALENDAR",
] as const;
export type ProductStage = (typeof PRODUCT_STAGES)[number];

/** V2 01 §2 — a work item wraps a Program or a Weekly Lens; it is not a third entity. */
export const PANEL_PROJECT_TYPES = ["PROGRAM", "WEEKLY_LENS"] as const;
export type PanelProjectType = (typeof PANEL_PROJECT_TYPES)[number];

/**
 * V2 01 §5 — the demo output types. "Require only the types selected in the
 * frozen output plan; not all eight for every concept."
 */
export const OUTPUT_TYPES = [
  "EDITORIAL",
  "FILM",
  "MUSIC",
  "BOOK",
  "ART_DESIGN",
  "SOCIAL",
  "LANDING",
  "PRODUCTION_BRIEF",
] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];

/** V2 01 §6 — a package snapshot's lifecycle. A stale package stays downloadable. */
export const PACKAGE_STATUSES = ["CURRENT", "HISTORICAL", "STALE"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** V2 01 §3 — the two start modes. A Lens parent is lineage, not a third mode. */
export const START_INPUT_MODES = ["BLANK", "REFERENCE"] as const;
export type StartInputMode = (typeof START_INPUT_MODES)[number];

/** V2 01 §3 — reference kinds. Nothing is fetched or extracted (ADR-0019 D2). */
export const REFERENCE_KINDS = ["FILE", "URL", "TEXT"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/**
 * V2 01 §5 — where a revision is routed. This is NOT `retryStage`: a retry
 * repeats a failed attempt with the same input, a revision applies new feedback
 * and creates a new version (ADR-0019 D4).
 */
export const REVISION_ROUTES = [
  "CONCEPT_REVISION",
  "CONCEPT_REPLACEMENT",
  "CONTENT_REWRITE",
  "RESEARCH_REFRESH",
] as const;
export type RevisionRoute = (typeof REVISION_ROUTES)[number];

/** V2 01 §5 — the Persian editorial gate as a content-level state. */
export const EDITORIAL_GATE_STATES = ["PENDING", "PASSED", "NOT_REQUIRED"] as const;
export type EditorialGateState = (typeof EDITORIAL_GATE_STATES)[number];
