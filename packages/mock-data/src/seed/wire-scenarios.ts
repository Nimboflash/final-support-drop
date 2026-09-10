/**
 * The V2 scenario recipes, committed as a fixture module (ticket P3).
 *
 * Copied verbatim from `docs/frontend-v2/mock/seed.json` at import time and
 * NEVER read from `docs/` at runtime: the panel must not depend on the
 * specification pack being present, and a fixture that can drift from what the
 * tests validated is not a fixture.
 *
 * This is the WIRE form — V2's lowercase snake_case. Nothing here is usable
 * until it passes through `normalizeSeed`, which runs every value through P2's
 * wire codec and parses the result with the panel-domain schemas
 * (ADR-0019 D6).
 *
 * Generated from the pack; edit the pack and regenerate rather than editing here.
 */

export const WIRE_SCENARIOS = {
  "schemaVersion": "drop.panel.scenarios.v2",
  "fixedClock": "2026-09-06T09:00:00Z",
  "seed": 1,
  "recipeFormat": "Declarative implementation recipes, not executable JSON patches. Loader must materialize and schema-validate each isolated scenario.",
  "scenarios": [
    {
      "id": "S01",
      "name": "No Programs yet",
      "setup": "Clear all project-owned records, including packages and calendar.",
      "action": "Start blank journey",
      "acceptanceId": "A01"
    },
    {
      "id": "S02",
      "name": "Draft Program without run",
      "setup": "Create p4 draft with input=null, no selected concepts, empty output plan.",
      "action": "Resume draft",
      "acceptanceId": "A01"
    },
    {
      "id": "S03",
      "name": "Ready to start",
      "setup": "Create p4 draft with valid text reference and empty output plan.",
      "action": "Start once",
      "acceptanceId": "A02"
    },
    {
      "id": "S04",
      "name": "Active machine stage",
      "setup": "Use p1; add repo-compatible run/stage attempt running; hide not-yet-generated outputs in its branch.",
      "action": "Advance injected clock",
      "acceptanceId": "A06"
    },
    {
      "id": "S05",
      "name": "Human concept review",
      "setup": "Use c2-v2 in_review with existing history.",
      "action": "Approve current version",
      "acceptanceId": "A03"
    },
    {
      "id": "S06",
      "name": "Rejection loop",
      "setup": "Use rejected c3-v1 with saved reason.",
      "action": "Reject and revise, then complete revision",
      "acceptanceId": "A03"
    },
    {
      "id": "S07",
      "name": "Missing input",
      "setup": "Create draft Weekly Lens with no parent Bible and reference mode with empty references.",
      "action": "Attempt start",
      "acceptanceId": "A18"
    },
    {
      "id": "S08",
      "name": "Unavailable external source",
      "setup": "Use o2 blocked by s3 with retrieval-s3.",
      "action": "Open coverage and retry unavailable source",
      "acceptanceId": "A08"
    },
    {
      "id": "S09",
      "name": "Retryable stage failure",
      "setup": "Add failed content attempt for o4 with retryable=true; keep other items unchanged.",
      "action": "Retry same input",
      "acceptanceId": "A19"
    },
    {
      "id": "S10",
      "name": "Non-retryable failure",
      "setup": "Use failed run attempt with retryable=false and diagnostic code CONTRACT_INCOMPATIBLE.",
      "action": "Inspect failure",
      "acceptanceId": "A19"
    },
    {
      "id": "S11",
      "name": "Completed approved artifacts",
      "setup": "Use p2, pkg-p2-v1 and matching calendar entry.",
      "action": "Download package",
      "acceptanceId": "A09"
    },
    {
      "id": "S12",
      "name": "Approved-parent Weekly Lens",
      "setup": "Use p3 linked to p2/bible-p2-v1.",
      "action": "Start with inherited Bible",
      "acceptanceId": "A18"
    },
    {
      "id": "S13",
      "name": "Disconnected machine system",
      "setup": "Preserve snapshot; gateway reports disconnected and mutations unavailable.",
      "action": "Refresh then restore scenario connection",
      "acceptanceId": "A19"
    },
    {
      "id": "S14",
      "name": "Unauthorized actor",
      "setup": "Set actor-viewer; keep p1 data.",
      "action": "Attempt approve via UI and direct mock command",
      "acceptanceId": "A16"
    },
    {
      "id": "S15",
      "name": "Blank discovery",
      "setup": "Create new Program with explicit null input, seed=1.",
      "action": "Start and rotate seeded candidate batch",
      "acceptanceId": "A01"
    },
    {
      "id": "S16",
      "name": "Reference discovery",
      "setup": "New Program with file metadata and URL reference, seed=2.",
      "action": "Validate bad files then start valid input",
      "acceptanceId": "A02"
    },
    {
      "id": "S17",
      "name": "Two approved branches",
      "setup": "Approve c2-v2 as a distinct decision; select c1-v1 and c2-v2; create four independent content IDs for c2.",
      "action": "Continue with two approved concepts",
      "acceptanceId": "A06"
    },
    {
      "id": "S18",
      "name": "Targeted content revision",
      "setup": "Use p1; request revision of o4, store feedback and pendingRevisionId.",
      "action": "Complete o4-v2; do not touch o1/o3",
      "acceptanceId": "A07"
    },
    {
      "id": "S19",
      "name": "Ready package without date",
      "setup": "Use p2 clone p5 with fresh consistent IDs, no calendar entry, targetDate=null; all required output approvals present.",
      "action": "Complete package assembly twice with same commandId",
      "acceptanceId": "A10"
    },
    {
      "id": "S20",
      "name": "Ready package with target date",
      "setup": "Use p2 clone p6 with fresh IDs, targetDate=2026-09-15, no existing package/calendar.",
      "action": "Complete packaging and reschedule",
      "acceptanceId": "A11"
    },
    {
      "id": "S21",
      "name": "Stale downstream package",
      "setup": "Use p2; explicitly revise c4-v1 to c4-v2, mark o5/o6 stale and pkg-p2-v1 stale.",
      "action": "Review impacts and rebuild after affected reviews",
      "acceptanceId": "A12"
    },
    {
      "id": "S22",
      "name": "Version conflict and double click",
      "setup": "Read project revision=1 then simulate competing mutation to revision=2.",
      "action": "Submit expectedRevision=1; later repeat successful commandId",
      "acceptanceId": "A15"
    },
    {
      "id": "S23",
      "name": "Packaging failure",
      "setup": "Use p2 clone p7, all required approved, assembly job failed with retryable=true.",
      "action": "Retry assembly without rerunning content",
      "acceptanceId": "A09"
    },
    {
      "id": "S24",
      "name": "All proposals rejected",
      "setup": "Use p1 fresh concept-only scenario; reject every active proposal, empty selection/output plan.",
      "action": "Continue disabled; generate replacement batch",
      "acceptanceId": "A04"
    }
  ]
} as const;
