# Release Plan and Tickets

## 1. Amendment rule

This plan preserves the approved R0-R6 sequence and Release 0 dependency spine. ADR 0010 expands
the scope of existing Release 0 tickets instead of creating a parallel UI project or renumbering
the authoritative 0.1-0.15 plan.

Each release ends with green tests, independent review, a tagged commit and human-owner gate.

## 2. Release 0 - Foundation plus workflow shell

| Ticket | Build | Depends on | Added/clarified by this pack |
|---|---|---|---|
| 0.1 | pnpm monorepo, strict TS, app/package scaffolds, Vitest | - | Add `workflow-ui`, `observability`, `testing` package boundaries |
| 0.2 | Compose: Postgres, Redis, MinIO, web, worker, Nginx; typed config | 0.1 | Add isolated preview policy/config and health model |
| 0.3 | Zod contracts v1 | 0.1 | Add workflow definition/version/node/edge/layout/validation, Program and Weekly Lens envelopes |
| 0.4 | Drizzle schemas/migrations | 0.3 | Add core/studio tables from domain model, immutable/audit constraints and workflow persistence |
| 0.5 | Better Auth invitations, no public signup | 0.4 | Session revocation for disabled memberships |
| 0.6 | Actors, roles, capabilities, scopes, approval policies and audit | 0.4, 0.5 | Canonical 7 roles; workflow edit/publish capabilities |
| 0.7 | Artifact and Machine Run registries | 0.4 | Add artifact version/provenance, stage attempts/events and immutable run manifest links |
| 0.8 | Prompt, Rule and Example registries | 0.6, 0.7 | Publish/version flows and Brand DNA seed rules |
| 0.9 | AI gateway and mock adapter | 0.3, 0.4 | Structured output, raw response separation and provider-required state |
| 0.10 | Pipeline runtime | 0.7, 0.9 | Published workflow loading, stage states, outbox, idempotency, checkpoints and Redis reconstruction |
| 0.11 | Run manifests and comparisons | 0.10 | Freeze workflow checksum/version; initial comparison query contract |
| 0.12 | FA-first RTL UI foundation | 0.1 | shadcn/ui, DirectionProvider, DROP provisional tokens, bundled Vazirmatn and core domain components |
| 0.13 | Dashboard skeleton | 0.6, 0.12 | `/studio` IA, workflow definition list, generic React Flow editor shell and execution snapshot view |
| 0.14 | S3-compatible storage | 0.2, 0.3, 0.7 | Preview isolation, checksums and authorized access |
| 0.15 | Release audit sweep | all | Includes workflow validation, Pro-license gate, RTL/accessibility, Redis recovery and tenant isolation |

### Release 0 vertical demo

The generic demo is not creative calibration. It must show:

1. Create a draft three-node workflow.
2. Validate and publish immutable version.
3. Start a run using mock executor.
4. Watch live nodes move through queued/running/waiting/succeeded.
5. Submit a human approval under a named role.
6. Inspect artifact/version, attempt and audit.
7. Flush Redis in test and reconstruct remaining work.

### Release 0 exit criteria

- A Project, Program, artifact, workflow version and run can be created/versioned.
- Published workflow and approved artifacts reject in-place edits.
- Two users see permission-correct Persian UI.
- Generic workflow editor and execution view persist beyond browser refresh.
- Missing provider leaves the manual product usable.
- Redis loss loses no durable work.

## 3. Release 1 - Machine 01 vertical slice

Build:

- Structured Project Brief and Program creation.
- Reference Board with file/link/text storage.
- Reference Analysis, Pattern/Tension Map and 3-5 Concept Cards.
- Independent critique with separate model profile.
- Human decision and candidate-rule proposal.
- Real Machine 01 workflow definition/version and custom graph group/nodes.
- Program overview embeds live execution graph.

Tests:

- Distinct candidates, provenance, theme-versus-concept critique.
- Structured feedback and non-auto-active candidate rules.
- Human gate and rerun/version behavior.

Exit: mechanics pass on fixtures and creative acceptance passes on the client's one real brief.

## 4. Release 2 - Controlled research

Build:

- Multilingual Source Registry CRUD/lifecycle.
- Frozen Research Plan and evidence slots.
- Deployment-origin reachability.
- Three-pass retrieval and lawful human retrieval requests.
- Findings/citations, contradiction map and candidate pools.
- Dual-coverage/saturation gate.
- Machine 02 workflow graph and coverage/blocked-node summaries.

Exit:

- 25-50 validated sources; 12-18 deep reads under policy.
- Iranian/Persian and international coverage both present.
- Blocked evidence and substitutions are transparent.
- Research Package is immutable and traceable.

## 5. Release 3 - Synthesis and Concept Bible

Build:

- Normalization, dedup/clusters and role assignment.
- Programming layer.
- DROP FIT and conditional LENS RELEVANCE hard gates.
- Versioned weight profiles and Direction A/B/C systems.
- Guardian approval and immutable Concept Bible/Lens territories.
- Machine 03 workflow graph and comparison workspace.

Exit: one approved Bible with exact rationale, rules, evidence and run manifest.

## 6. Release 4 - Output and production control

Build:

- Output classification, priority and narrative distribution.
- Output Manifest.
- SpecializedOutputAgent interface, registry and stubs.
- Embedded validators.
- Artifact preview/export isolation.
- `FA_EDITORIAL` gate.
- Execution Manifest.
- Machine 04 graph including subagent and validation nodes.

Do not build all final creative subagent logic.

Exit: one stub output becomes a schema-valid, validated artifact and a complete Execution
Manifest reaches Machine 05.

## 7. Release 5 - Calendar, feed and Weekly Lens

Build:

- Portfolio/Program calendars with Solar Hijri display.
- Request generator, Request Feed, dependencies, blockers and structured feedback.
- Revision loop to exact Machine 04 job/artifact version.
- Completion/handoff record.
- Weekly Lens child workflow with current-context scan.
- Machine 05 and Weekly Lens graph templates.

Exit:

- Execution requirements become editable requests/calendar items.
- Dependency-blocked work cannot start.
- One Weekly Lens is approved and commissioned.
- One scoped revision completes without rewriting prior history.

## 8. Release 6 - Hardening and real-run learning

Build:

- Golden regression suite.
- Run/version comparison UI and graph diff.
- Cost/diagnostic dashboards.
- Feedback analysis and approval-gated improvement proposals.
- Permission/security hardening.
- Backup/restore and second-host migration drill.
- Data export policy.
- Client UAT on ordinary intended networks.

Exit:

- At least three representative full runs.
- No critical provenance, permission, immutability, backup or portability defect.
- Differences between two runs are explainable from manifests and graph state.

## 9. Ticket definition template

Every ticket file includes:

```yaml
ticket_id:
title:
release:
owner_lane:
source_requirements:
adr_constraints:
in_scope:
out_of_scope:
contracts_changed:
database_changes:
permission_requirements:
failure_states:
test_seams:
acceptance_criteria:
dependencies:
files_owned:
handoff_required:
```

## 10. Per-ticket loop

```text
Read ticket + referenced source sections
-> freeze tests/contracts
-> implement shared business logic
-> implement adapters/UI
-> typecheck/lint/test/build
-> independent code/security review as applicable
-> commit with ticket ID
-> structured handoff
```

No ticket silently expands Studio into venue operations or completes a later release through a
shortcut.

## 11. Parallelism

Serial spine:

```text
contracts -> database -> registries -> gateway -> pipeline runtime
```

After contracts freeze, safe parallel lanes include UI, workers and storage. Never parallelize
edits to the same migration/schema, `packages/contracts`, approval/audit semantics or published
workflow version logic.

## 12. Client gates

| Gate | Needed by | Build behavior before gate |
|---|---|---|
| React Flow Pro license | Direct Pro-template use | Open-source implementation continues |
| Workspace Owner | Production UAT | Dev actor seeds only |
| DROP Guardian | Direction/rule approval | Gate remains blocked |
| `FA_EDITORIAL` holder | Persian publication approval | Gate remains blocked |
| Real project brief | Creative R1 acceptance | Mechanics use synthetic fixtures |
| Provider/configuration approval | Live AI | Mock adapter/manual dashboard |
| Final visual values | Final visual acceptance | Provisional centralized tokens |

