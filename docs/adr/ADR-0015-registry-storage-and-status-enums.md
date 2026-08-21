# ADR-0015 — Registry Storage and Canonical Status Enums

**Status:** Accepted
**Date:** 2026-08-21

## Context

Two verified findings from the adversarial review of the delivery bundle:

1. **Load-bearing registries have no specified storage.** Run manifests must atomically freeze
   the Constitution, Rule Registry, Prompt and Example Library versions and executor/validator
   versions, failing closed when any version cannot be resolved (07 §6). Doc (12 §5) requires
   these registries to live outside application code with immutable published versions, and
   ticket 0.8 builds "Prompt, Rule and Example registries" (15 §2). Yet doc 06 defines no
   tables for any of them: `programs.constitution_version_id` (06 §3.3) has no FK target, and
   the only rule table is `studio.candidate_rules` in `DRAFT|OBSERVING` (06 §4) — feedback-derived
   rules that are "never auto-active", with no path to an active rule that a manifest could
   freeze. Executor/validator "versions" likewise had no defined identity despite publish-time
   validation requiring every executor/validator registry reference to "exist and be active"
   (07 §13).

2. **The five most UI-central entities have no enumerated status values.** `projects`
   (06 §3.1), `programs` (06 §3.3), `weekly_lenses` (06 §3.4), `requests` and `calendar_items`
   (06 §8) all carry a `status` field that is never enumerated — while briefs, plans, sources
   and workflow versions get full enums. Doc 06 itself references Lens `APPROVED` (06 §3.4) and
   the indexing baseline keys on `(workspace_id, status, updated_at desc)` (06 §12), so the gap
   is a defect, not a convention.

This ADR records the repair. The approval mechanics referenced below use the single approval
write path of ADR-0013. Governance authority for this amendment follows ADR-0011.

## Decision (normative)

### D1. Versioned registry tables

The following tables are added to the `studio` schema. Schema and migrations belong to ticket
0.4; publish and promotion flows belong to ticket 0.8 (15 §2).

| Header table | Version table |
|---|---|
| `studio.constitutions` | `studio.constitution_versions` |
| `studio.rules` | `studio.rule_versions` |
| `studio.prompts` | `studio.prompt_versions` |
| `studio.examples` | `studio.example_versions` |

Common pattern, identical in spirit to workflow definitions/versions (06 §9.1):

- Header row: stable identity, `workspace_id`, stable key/name, pointer to latest published
  version, `row_version` (06 §1).
- Version row: unique `(registry_id, version_number)`, content (JSONB payload or object
  reference per 06 §1), semantic version, checksum, status `DRAFT|PUBLISHED|SUPERSEDED`,
  publishing actor, and links to the approval/audit events that authorized publication.
- Draft rows are mutable; **published rows are immutable**, enforced by all three immutability
  layers (06 §11) — command guards, database triggers/restricted policies, and seam tests.
- Publication is capability-gated: `PROMPT_CONFIGURE` for prompts and examples (11 §4); brand
  rule publication follows the Guardian authority in the baseline matrix (11 §5). Every
  publication writes an audit event (11 §12).
- Example versions record accepted, rejected and borderline outputs with reasons (12 §5).
- Run manifests freeze exact version IDs plus checksums (07 §6); an unresolvable reference
  fails run creation closed.

### D2. `constitution_version_id` FK target

`studio.programs.constitution_version_id` (06 §3.3) is a database foreign key to
`studio.constitution_versions.id`. The referenced row must have status `PUBLISHED`; the command
layer enforces this on program creation/update, and manifest freezing re-verifies it (07 §6).

### D3. Candidate rule promotion path

- `studio.candidate_rules` (06 §4) remains the intake table for feedback-derived rules, in
  `DRAFT|OBSERVING`, never auto-active.
- Rule lifecycle on the registry side: `studio.rules.status` is
  `DRAFT|OBSERVING|ACTIVE|RETIRED`. The `OBSERVING -> ACTIVE` transition occurs **only** through
  an approval decision recorded on the single approval write path (ADR-0013), subject to the
  gate's approval policy (11 §6).
- The approved promotion atomically creates the first immutable `studio.rule_versions` row
  (status `PUBLISHED`, checksummed) — the row manifests freeze — and links it to the originating
  candidate rule with a typed provenance relation (`DERIVED_FROM`/`SELECTED_FROM`, 06 §10).
- No rule reaches `ACTIVE` without a published, checksummed version and an approval event.
  This preserves (12 §5): learning proposals remain drafts until approved.

### D4. Executor and validator identity

Executors and validators are code, not database content. Their registry identity is:

```text
package name + package (code) version + content checksum of the built executor/validator module
```

- A lightweight registration table (`studio.executor_registrations`, one row per
  executor/validator key) records package, code version, checksum and status
  `ACTIVE|RETIRED`, so publish-time validation "exists and is active" (07 §13) is checkable
  against a durable record.
- Run manifests freeze the exact code version and checksum for every executor and validator a
  run can touch (07 §6); `studio.artifact_validations` records validator identity per result
  (06 §7). A checksum mismatch at load time fails the stage closed — it never runs a different
  binary under a frozen identity.

### D5. Canonical v1 status enums

The following are the **canonical v1 status sets** for the five entities. They are enforced with
database check constraints (06 §1) and are amendable **only by a subsequent ADR** — not by
migration convenience, UI needs or seed data.

| Entity | Canonical v1 status values |
|---|---|
| `studio.projects` | `ACTIVE\|ARCHIVED` |
| `studio.programs` | `DRAFT\|IN_PIPELINE\|APPROVED\|ARCHIVED` |
| `studio.weekly_lenses` | `DRAFT\|IN_PIPELINE\|APPROVED\|COMMISSIONED\|ARCHIVED` |
| `studio.requests` | `DRAFT\|OPEN\|BLOCKED\|IN_PROGRESS\|IN_REVIEW\|CHANGES_REQUESTED\|APPROVED\|COMPLETED\|CANCELLED` |
| `studio.calendar_items` | `PLANNED\|CONFIRMED\|DONE\|CANCELLED` |

Notes:

- The Lens `APPROVED` guard (06 §3.4 — current-context artifact plus exact parent Bible version)
  now has a defined value to attach to. `COMMISSIONED` means the Lens has entered the Machine 04
  output-commissioning boundary (07 §10); the R5 exit criterion "one Weekly Lens is approved and
  commissioned" (15 §7) maps to `APPROVED -> COMMISSIONED`.
- `requests.BLOCKED` is a persisted state of the Machine 05 request entity (06 §8). This does
  not conflict with (07 §3): the rule that `BLOCKED` is a derived UI category applies to
  **stage runs**, not to the request domain entity, which owns its own lifecycle.
- `programs.IN_PIPELINE` must be consistent with `active_pipeline_run_id` (06 §3.3); the command
  layer enforces the pairing.
- Persian UI labels map to these values through message keys; stored values are never renamed
  for presentation (10 §2 pattern: stable English identifiers, presentation-safe Persian).
- "Program records exist as versioned rows via schema+API" is R0 scope (tickets 0.4/0.7); the
  Program creation flow remains Release 1 (ADR-0011). The enums above are therefore required in
  the R0 schema.

## Consequences

- Ticket 0.4 gains the eight registry tables, the executor registration table, the
  `constitution_version_id` FK and the five check constraints; ticket 0.8 implements the
  publish/promotion flows; ticket 0.11's manifest freeze becomes implementable and its
  fail-closed behavior testable at Seam 1 (14 §2).
- Status-keyed indexes in the baseline (06 §12) become definable.
- Mock structured output that validates and stores (restored R0 criterion, ADR-0011) can freeze
  real prompt versions from configuration rather than hard-coded strings.
- Any future status value (for example a Lens edition archive sub-state) requires an ADR, which
  keeps the UI, API contracts and traceability matrix synchronized.

## Supersedes / Amends

- Amends (06): adds the registry and registration tables, defines the FK target for
  `programs.constitution_version_id`, enumerates the five status sets, and extends (06 §4) with
  the promotion path.
- Gives (12 §5) its concrete storage model.
- Depends on ADR-0013 for the promotion approval mechanics. Authority hierarchy per ADR-0011.
