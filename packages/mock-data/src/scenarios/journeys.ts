/**
 * The acceptance-journey binding table (AC-P3.7).
 *
 * V2 04 §4 defines twenty journeys A01–A20; the pack's 24 scenarios carry an
 * `acceptanceId` each, but between them they name only fifteen. ADR-0019 D15
 * requires the remaining five to be bound EXPLICITLY — "P3 must not ship with an
 * unbound journey" — either by authoring another scenario or by binding to an
 * existing world.
 *
 * Binding to an existing world is the right call for all five: each is a
 * behaviour exercised ON a fixture state, not a new fixture state.
 *
 *  - **A05** (comment without decision) → S05, the concept-review world. The
 *    journey is about a comment leaving `reviewStatus` untouched; S05 already
 *    supplies a card mid-review to comment on.
 *  - **A13** (generate package v2, no calendar duplication) → S21, the world
 *    that already has a package family and a stale downstream. Building v2 there
 *    is exactly the "does the calendar entry duplicate?" question.
 *  - **A14** (same action from inbox, card and graph) → S05. The journey asserts
 *    one audit event and synchronized counts from three entry points; it needs a
 *    reviewable card, which S05 is.
 *  - **A17** (reload midway) → S18, mid-revision with a pending version. Reload
 *    is only interesting where there is unfinished state to restore.
 *  - **A20** (keyboard and mobile review, including date edit) → S20, the world
 *    with a target date, since the date edit is half the journey.
 */
export interface JourneyBinding {
  readonly journeyId: string;
  readonly scenarioId: string;
  /** Why this world supplies that journey's fixture state. */
  readonly rationale: string;
}

export const JOURNEY_BINDINGS: readonly JourneyBinding[] = [
  { journeyId: "A01", scenarioId: "S15", rationale: "Blank start with no text or file." },
  { journeyId: "A02", scenarioId: "S16", rationale: "File, URL and text start with validation." },
  { journeyId: "A03", scenarioId: "S06", rationale: "Reject a concept and revise it." },
  { journeyId: "A04", scenarioId: "S24", rationale: "Replace a rejected concept; lineage preserved." },
  { journeyId: "A05", scenarioId: "S05", rationale: "A card mid-review to comment on without deciding." },
  { journeyId: "A06", scenarioId: "S17", rationale: "Two approved concepts advancing independently." },
  { journeyId: "A07", scenarioId: "S18", rationale: "One content item revised, others untouched." },
  { journeyId: "A08", scenarioId: "S08", rationale: "Evidence gap with a retrieval request." },
  { journeyId: "A09", scenarioId: "S11", rationale: "Approved content assembled and downloadable." },
  { journeyId: "A10", scenarioId: "S19", rationale: "Package completed with no target date." },
  { journeyId: "A11", scenarioId: "S20", rationale: "Package completed with a target date." },
  { journeyId: "A12", scenarioId: "S21", rationale: "Upstream concept edited; descendants stale." },
  { journeyId: "A13", scenarioId: "S21", rationale: "A package family already exists, so v2 can test calendar idempotency." },
  { journeyId: "A14", scenarioId: "S05", rationale: "A reviewable card reachable from inbox, card and graph." },
  { journeyId: "A15", scenarioId: "S22", rationale: "Stale revision and a repeated commandId." },
  { journeyId: "A16", scenarioId: "S14", rationale: "A read-only actor attempting a decision." },
  { journeyId: "A17", scenarioId: "S18", rationale: "Unfinished mid-revision state worth restoring on reload." },
  { journeyId: "A18", scenarioId: "S12", rationale: "Weekly Lens with an approved parent Bible." },
  { journeyId: "A19", scenarioId: "S13", rationale: "Offline or timeout while revising." },
  { journeyId: "A20", scenarioId: "S20", rationale: "A dated package, so the keyboard date edit has something to edit." },
];

export const ALL_JOURNEY_IDS: readonly string[] = Array.from(
  { length: 20 },
  (_, index) => `A${String(index + 1).padStart(2, "0")}`,
);
