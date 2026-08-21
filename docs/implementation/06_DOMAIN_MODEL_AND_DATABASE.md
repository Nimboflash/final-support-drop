# Domain Model and Database

## 1. Database principles

- PostgreSQL is the authoritative source for every durable state.
- Use `core` and `studio` schemas.
- Every mutable business table includes `created_at`, `updated_at` and an optimistic concurrency
  `row_version`.
- Every workspace-owned table includes `workspace_id` directly or through an immutable parent.
- Use UUID/ULID-style application identifiers consistently; do not mix ID strategies by table.
- Use database foreign keys, unique constraints and check constraints for invariants that do not
  require external services.
- Approved/published records are immutable. Changes create a new version or a new run.
- JSONB is permitted for versioned payloads and type-specific metadata, not as a substitute for
  core relational fields or queryable authority.
- Store file bytes in object storage; store stable metadata and object keys in PostgreSQL.

## 2. Core schema

### 2.1 Identity and workspace

| Table | Purpose | Key fields/constraints |
|---|---|---|
| `core.workspaces` | Tenant/workspace boundary | `id`, `name`, `status`, `default_locale='fa-IR'`, `timezone='Asia/Tehran'` |
| `core.users` | Better Auth-linked human identity | `id`, auth subject, email, display name, status; disabled users are retained |
| `core.actors` | Unified actor model | `id`, `actor_type HUMAN|MACHINE|SERVICE`, optional `user_id`, stable name |
| `core.memberships` | User membership in workspace | unique `(workspace_id,user_id)`, status `INVITED|ACTIVE|DISABLED` |
| `core.modules` | DROP OS modules | seeded `studio`; no fake future modules |

### 2.2 Roles, capabilities and approvals

| Table | Purpose |
|---|---|
| `core.roles` | Canonical administrative roles |
| `core.capabilities` | Competence or operation capability such as `FA_EDITORIAL` |
| `core.role_assignments` | Actor -> role with `WORKSPACE|MODULE|PROJECT` scope |
| `core.capability_assignments` | Actor -> capability with equivalent scope |
| `core.approval_policies` | Gate key, authorized roles/capabilities and self-approval mode |
| `core.approval_requests` | Durable waiting request against exact subject/version |
| `core.approval_events` | Append-only decision, actor, acted-as role, mode, reason and timestamp |

Approval events must reference an exact immutable subject version. A new artifact version creates
a new approval request; an old approval never floats forward.

### 2.3 Audit and collaboration

| Table | Purpose |
|---|---|
| `core.audit_events` | Append-only security/governance history |
| `core.domain_events` | Typed business events with stable idempotency key |
| `core.outbox_events` | Transactional dispatch records |
| `core.comments` | Version-aware human comments with optional anchored location |
| `core.notifications` | User delivery state referencing a durable source event |
| `core.file_objects` | Object key, media type, size, checksum, access and rights metadata |

`core.audit_events` and `core.approval_events` are append-only. Database roles used by the
application must not have update/delete permission on them.

## 3. Studio work hierarchy

### 3.1 Projects

`studio.projects` is the collaborative work container.

Required fields:

```yaml
id:
workspace_id:
name:
description:
brand_layer:
geographic_context:
target_launch_at:
status:
owner_actor_id:
current_program_id:
created_by_actor_id:
created_at:
updated_at:
row_version:
```

### 3.2 Project briefs

Version `studio.project_briefs`; never overwrite an approved/used brief.

```yaml
id:
project_id:
version:
title:
objective:
context:
audience:
time_window:
constraints:
required_outputs:
materials:
partners:
notes:
status: DRAFT|APPROVED|SUPERSEDED
created_by_actor_id:
approved_by_event_id:
```

Unique `(project_id, version)`.

### 3.3 Programs

`studio.programs` is the deep creative unit produced by the full pipeline.

```yaml
id:
project_id:
program_type: SEASONAL_PROGRAM|THEMATIC_PROGRAM|EVENT|COLLABORATION|SPECIAL_PROJECT
lens_mode: NONE|SINGLE_LENS|LENS_SERIES
title:
status:
current_machine_key:
active_pipeline_run_id:
constitution_version_id:
source_brief_id:
created_by_actor_id:
```

### 3.4 Weekly Lenses

`studio.weekly_lenses` is a child of a Program and approved Concept Bible.

```yaml
id:
program_id:
concept_bible_version_id:
lens_territory_id:
parent_lens_id:
title:
question:
lens_color_token:
planned_start_at:
planned_end_at:
status:
current_context_artifact_id:
active_pipeline_run_id:
```

Database check: end must be after start. A Lens cannot become `APPROVED` without a current
context artifact and exact parent Bible version.

## 4. Machine 01 entities

| Table | Key contents |
|---|---|
| `studio.references` | Type, source file/URL/text, user intent, do-not-copy, intended use, submitter |
| `studio.reference_analyses` | Observation, interpretation, hypothesis, tensions, context, risk and confidence |
| `studio.pattern_maps` | Versioned pattern/tension map artifact metadata |
| `studio.concept_cards` | Versioned 3-5 candidates, proposition, tension, POV, relevance, risks and status |
| `studio.concept_reference_links` | Typed trace from concept/version to reference/analysis |
| `studio.concept_critiques` | Independent critique profile and structured findings |
| `studio.concept_decisions` | Human decision and preserve/remove/change/why fields |
| `studio.candidate_rules` | Feedback-derived rules in `DRAFT|OBSERVING`, never auto-active |

Separate the supplier of a reference from the actor who created its database record.

## 5. Machine 02 entities

| Table | Key contents |
|---|---|
| `studio.research_plans` | Versioned plan; `DRAFT|FROZEN|AMENDED|SUPERSEDED` |
| `studio.research_questions` | Criticality, track and completion rule |
| `studio.evidence_slots` | Track, source layer, geography, language, quality and substitution policy |
| `studio.source_registry_entries` | Source identity and lifecycle `CANDIDATE|VALIDATED|ACTIVE|DEACTIVATED|ARCHIVED` |
| `studio.source_snapshots` | Immutable source metadata/content snapshot used by a run |
| `studio.source_reachability_checks` | Network status and content-retrieval status as separate fields |
| `studio.slot_fulfillments` | Evidence slot -> source snapshot, qualification and substitution rationale |
| `studio.findings` | Typed statement, confidence, limitations and concept implication |
| `studio.finding_citations` | Exact source snapshot and locator for each claim |
| `studio.contradictions` | Finding-to-finding or source-to-source disagreement |
| `studio.research_candidates` | Music/film/book/art/design/history/audience/urban candidates |
| `studio.research_gap_decisions` | Human acceptance/escalation of non-critical gaps |
| `studio.retrieval_requests` | Lawful human retrieval assignment and returned evidence provenance |

Blocked evidence slots stay in the denominator. A frozen plan amendment requires a linked
approval event and produces a new plan version.

## 6. Machine 03 entities

| Table | Key contents |
|---|---|
| `studio.normalized_candidates` | Common fields plus JSONB type-specific metadata |
| `studio.candidate_clusters` | Duplicate/semantic cluster membership |
| `studio.candidate_roles` | Explicit role in a direction and `programming_layer` |
| `studio.selection_gate_results` | DROP FIT and conditional LENS RELEVANCE question results |
| `studio.weight_profiles` | Versioned configurable criteria/weights |
| `studio.directions` | A/B/C coherent systems, score, confidence and critique |
| `studio.direction_members` | Candidate role and relationship inside direction |
| `studio.direction_decisions` | Guardian decision against exact direction/version |
| `studio.concept_bibles` | Immutable versioned Bible after approval |
| `studio.lens_territories` | Viable Lens directions inside a Bible version |

Every selection stores `programming_layer`:

```text
HOUSE_CORE -> DROP FIT
ROTATING_ASSORTMENT -> DROP FIT
LENS_ALIGNED -> DROP FIT + LENS RELEVANCE
```

## 7. Machine 04 entities

| Table | Key contents |
|---|---|
| `studio.output_manifests` | Versioned manifest header, Bible version and approval state |
| `studio.output_manifest_items` | Classification, purpose, channel, role, format, language policy, criteria and budget |
| `studio.specialized_agent_definitions` | Agent type, supported output types, schema versions and lifecycle |
| `studio.specialized_agent_jobs` | Exact manifest item, agent version, run state, budget and attempts |
| `studio.artifacts` | Stable artifact identity and latest version pointer |
| `studio.artifact_versions` | Immutable content/object link, producer, schemas, configs, status and confidence |
| `studio.artifact_relations` | Directed provenance edges with relation type |
| `studio.artifact_validations` | Validator/version, result, findings and fail-closed state |
| `studio.execution_manifests` | Versioned external-requirement package |
| `studio.execution_requirements` | Human/expert/physical/rights/publishing/delivery requirement |

Raw AI responses use a separate restricted table/object namespace and can never be referenced as
an approved artifact version.

## 8. Machine 05 entities

| Table | Key contents |
|---|---|
| `studio.requests` | Type, source version, assignee, status, due date, criteria and iteration |
| `studio.request_dependencies` | Directed dependency with cycle prevention at application boundary |
| `studio.calendar_items` | Planned/actual dates, owner, risk and review gate |
| `studio.feedback` | Decision, category, severity, anchored location, preserve/do-not-change and blocking |
| `studio.revision_requests` | Source artifact version, scope and target Machine 04 job |
| `studio.handoff_records` | Declared completion and limitations; never false machine verification |

## 9. Workflow definition and run entities

### 9.1 Definitions

| Table | Purpose |
|---|---|
| `studio.workflow_definitions` | Stable workflow identity such as Deep Program or Weekly Lens |
| `studio.workflow_definition_versions` | `DRAFT|VALIDATING|PUBLISHED|SUPERSEDED`; semantic version and checksum |
| `studio.workflow_node_definitions` | Stable node key, type, machine/stage key, config, schemas and gate policy |
| `studio.workflow_edge_definitions` | Source/target ports, edge type, condition, priority and fallback behavior |
| `studio.workflow_layouts` | Coordinates, group dimensions and viewport, separate from semantics |
| `studio.workflow_validation_results` | Graph/schema/governance validation findings |

Definition/version constraints:

- Unique `(workflow_definition_id, version_number)`.
- Node keys unique inside a version.
- Published versions reject update/delete.
- Every executable node references registered input/output schema versions.
- Every gate references a real approval policy or rule set.
- At least one start and one terminal node.
- No unapproved cycles; only named loop edges with configured budgets are valid.

### 9.2 Runs

| Table | Purpose |
|---|---|
| `studio.pipeline_runs` | Run identity, subject, exact published workflow version and status |
| `studio.stage_runs` | Durable state for each node execution |
| `studio.stage_attempts` | Attempt number, checkpoint, failure code, usage and raw response reference |
| `studio.run_manifests` | Immutable frozen configuration/version record |
| `studio.run_events` | Append-only ordered execution events for UI and audit |
| `studio.run_commands` | Idempotent human/system command requests such as retry/cancel/resume |

Use a monotonic `sequence_number` per run for event ordering. Unique `(run_id, sequence_number)`
and `(run_id, idempotency_key)`.

## 10. Provenance model

Use typed directed relations:

```text
DERIVED_FROM
SUPPORTED_BY
VALIDATED_AGAINST
SUPERSEDES
REVISES
SELECTED_FROM
GENERATED_FOR
RETURNED_BY_HUMAN
PUBLISHED_FROM
```

Every approved Concept Card, Research Package, Concept Bible and output artifact must have a
complete path to its source artifacts and run manifest.

## 11. Immutability implementation

Use all three layers:

1. Application command guards.
2. Database triggers or restricted update policies for approved/published/append-only tables.
3. Tests that attempt prohibited updates through the HTTP and repository seams.

Never implement immutability only by hiding an edit button.

## 12. Indexing baseline

At minimum:

- All foreign keys.
- `(workspace_id, status, updated_at desc)` on active list entities.
- `(project_id, created_at desc)` and `(program_id, created_at desc)` on artifacts/events.
- `(run_id, sequence_number)` on run events.
- `(assigned_to_actor_id, status, due_at)` on requests.
- `(source_registry_entry_id, checked_at desc)` on reachability checks.
- GIN full-text indexes for Persian searchable fields using a tested normalization strategy.
- Partial indexes for open approvals, active runs, blocked requests and current versions.

## 13. Deletion and retention

- Disable users; do not delete attributed history.
- Archive source registry entries used by historical runs; do not destroy them.
- Soft-delete draft/unreferenced convenience records only when policy allows.
- Never hard-delete approvals, audit events, run manifests, published definitions or approved
  artifact versions.
- Object deletion requires a retention policy and proof that no retained artifact version
  references the object.

