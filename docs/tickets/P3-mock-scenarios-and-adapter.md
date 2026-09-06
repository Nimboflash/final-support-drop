# Ticket P3 — Deterministic seed, scenario recipes, the shared demo repository, persistence and command behavior

```yaml
ticket_id: "P3"
title: "packages/mock-data: the canonical demo repository, the V2 wire-form loader, twenty-four scenario worlds, one versioned browser key, and the four mock adapters that pass the P2 conformance suites unmodified"
release: "P"
owner_lane: "platform"
source_requirements:
  - "V2 04 §1 — seed.json is the base world; scenarios.json is fourteen inherited requirements plus the new start modes, branches, targeted revision, package/calendar and version-conflict cases; they are declarative fixture recipes, not an implemented simulator; each scenario overlays a FRESH DEEP COPY of the base state and never shares mutable fixture objects; every scenario validates against the repository's schemas"
  - "V2 04 §2 — 6-8 project summaries over empty/new, review, research, blocked, ready-package, scheduled and Weekly Lens; at least three concept cards in the main journey and four content items in an active branch; real Persian paragraphs, long titles, multi-line comments, mixed FA/EN labels, no lorem ipsum; all IDs and timestamps stable; demo time starts 2026-09-06T09:00:00Z; latency, offline, forbidden, retryable/non-retryable failure and conflict are scenario-controlled, never random; discovery rotates predefined batches with an explicit seed"
  - "V2 04 §4 — the twenty acceptance journeys A01-A20 this world must be able to stage"
  - "V2 03 §1 — mock implementations share ONE canonical demo repository; browser persistence stores versioned demo snapshots through the repository adapter, not independent page-specific localStorage copies; no fixture imports in components"
  - "V2 03 §4 — every mutation carries commandId, workspaceId, actorId/activeRole, targetId and expectedRevision; a stale expectedRevision is rejected with CONFLICT and the UI is asked to refresh while typed feedback is preserved; repeating a commandId returns the original receipt and does not repeat effects; accepted is not completed; simulated completion is driven by an injected clock and scenario response, with no autonomous scheduler"
  - "V2 03 §5 — illustrative capability profiles in mocks over the existing repo's accepted policy DTO; at minimum reviewer, editorial reviewer, planner and read-only viewer; demo profiles, not a new canonical role taxonomy"
  - "V2 03 §6 — one versioned storage key, seed on first load, validate on hydration, Reset Demo with confirmation on corrupt or old data instead of crashing, stable demo actor/scenario/clock, metadata and short sample text only, two tabs synchronize via storage events or show a refresh notice, no silent last-write-wins"
  - "V2 01 §3 — a seeded set of three distinct concepts is revealed on start; \"random\" discovery is seeded variation; Reset Demo reproduces the same sequence; advancing the seed yields a different predefined batch; reference metadata persists and raw file bytes do not"
  - "18 §7 — deterministic, reproducible, schema-validated, realistic, scenario-switchable, isolated from production configuration, replaceable through DI; stable IDs, fixed timestamps or a controllable clock, seeded values"
  - "18 §7.1 — the required mock-entity set; 18 §7.2 — the fourteen required workflow scenarios; 18 §7.3 — mocked command behavior and the dev/demo marking that never implies real machine work"
  - "18 §12 — all scenarios selectable and reproducible; commands produce clear mocked state changes and audit entries; no UI state falsely claims a real machine operation occurred"
  - "06 §5 — source lifecycle, network status and content-retrieval status are separate fields; blocked evidence slots stay in the denominator"
adr_constraints:
  - "ADR-0019 D2 — frontend only: no mock API routes, no local mock server, no server persistence. Demo state lives in exactly one versioned browser key `drop-panel-demo-v2`, validated on hydration, offering Reset Demo on corrupt or incompatible data instead of crashing; only metadata and short sample text are stored; two tabs synchronize via storage events or show a refresh notice and silent last-write-wins is forbidden"
  - "ADR-0019 D3 — MachineGateway gains no members; PanelGateway keeps its seven read-only members; the V2 mutations land on PanelCommandGateway (createProject, addComment, selectConcepts, amendOutputPlan, updateCalendar, updateCalendarPackage, exportPackage, subscribe) and targeted regeneration on RevisionGateway (requestRevision). This ticket implements the four mock adapters; it adds no member to any interface"
  - "ADR-0019 D4 — ReviewApplicationService.reviewItem is the sole constructor of ApprovalCommand and delegates to MachineGateway.submitApproval; requestRevision is never aliased to retryStage; reject-and-revise records the decision first and durably, and a regeneration failure neither erases the rejection nor duplicates it on retry"
  - "ADR-0019 D5 — the V2 card vocabulary is an additive presentation projection: revision_requested → CHANGES_REQUESTED, approved → APPROVED, rejected → REJECTED; draft and in_review are pre-PENDING item states, not decisions; APPROVAL_DECISIONS and APPROVAL_REQUEST_STATES are untouched; a null reasonFa is rejected before transport and never coerced to an empty string"
  - "ADR-0019 D6 — stored codes stay UPPER_SNAKE `stableCodeSchema`; V2's lowercase literals are the mock-JSON wire form normalized by the loader AT THE BOUNDARY; the V2 capability and role strings are demo profiles mapped onto the closed CAPABILITIES and ACTOR_ROLES, and neither closed set gains a member; Source.region maps to COVERAGE_CLASSES; Source.status splits back onto lifecycle, networkReachable and contentRetrievable per 06 §5"
  - "ADR-0019 D7 — PLANNED|CONFIRMED|DONE|CANCELLED stands and ADR-0015 D5 is not amended; V2 `unscheduled` is PLANNED with `date === null`, `planned` is PLANNED with a date; calendar creation is idempotent per package family and relinking is an explicit update, never a duplicate entry"
  - "ADR-0019 D8 — `PANEL_SCHEMA_VERSION` stays semver 1.0.0; `drop.panel.mock.v2` is a separate non-semver `snapshotKind`, which is also the storage-key discriminator alongside `drop-panel-demo-v2`"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict() with no `data` field; PanelEvent is the panel's own subscription DTO; panel event types with no recorded audit counterpart go in a null-tolerant mapping table and are reported to P8"
  - "ADR-0019 D10 — commandEnvelopeSchema carries commandId, workspaceId and actorId; actedAsRole stays the closed ACTOR_ROLES enum; expectedRowVersion is canonical with expectedRevision as an adapter alias; idempotencyKey is derived from commandId; the receipt keeps origin/occurredAt/idempotencyKey required and carries status ACCEPTED|SUCCEEDED|REJECTED plus correlationId; REVISION_CONFLICT is excluded from the retryable default; the five V2 error codes map as FORBIDDEN → UNAUTHORIZED, UNAVAILABLE → MACHINE_SYSTEM_DISCONNECTED, INVALID_INPUT → SCHEMA_VALIDATION_FAILED, BLOCKED → INVALID_STATE_TRANSITION, CONFLICT → REVISION_CONFLICT"
  - "ADR-0019 D15 — S01-S14 are doc 18 §7.2's fourteen, 1:1 and in order, and are untrimmable (ADR-0018 D4); S15-S24 are additive; a journey with no scenario supplying its fixture world is bound explicitly, and P3 does not ship with an unbound journey"
  - "ADR-0019 D16 — the demo clock is 2026-09-06T09:00:00Z and the P2 fixtures anchored at 2026-08-21T09:00:00Z are re-based to it; Date.now and Math.random stay unreachable from fixture and adapter code; discovery rotates an authored finite batch table selected by `batches[seed mod batches.length]` with no PRNG; the seed is persisted demo state, advancing it is an explicit user action and Reset Demo reproduces the identical sequence"
  - "ADR-0019 D17 — exportPackage returns the DOM-free `PackageExport { bytes, filename, mediaType }`; apps/web constructs the Blob; tsconfig.base.json's `lib` is NOT widened to include DOM; the archive holds real sample files plus a synthesized manifest.json that matches its actual contents"
  - "ADR-0012/0013/0014/0015 and ADR-0017 D4 — the mocks present the recorded semantics under the recorded names: the transition table and aggregation rule, HUMAN-only distinct approvers through the single write path, the closed event taxonomy, and the recorded status enumerations"
  - "ADR-0018 D3 / ADR-0019 consequences — the twelve frozen workspaces (apps/worker plus the eleven machine packages) stay inert; no new workspace package is created, workspace-integrity.test.ts pins exactly sixteen"
in_scope:
  - "packages/mock-data — the canonical demo repository: ONE `DemoRepository` instance per selected scenario, constructed from the loaded base world and handed to all four mock adapters; every read and every write in the demo goes through it"
  - "packages/mock-data — the loader boundary: read `docs/frontend-v2/mock/seed.json` and `supporting-fixtures.json` (copied into the package as committed fixture modules, never read from docs at runtime), pass every wire value through P2's `panel-domain/src/projection/wire-codec.ts`, and parse every materialized entity through the P2 panel-domain schemas before the world is usable. P2 authors the codec; P3 calls it and re-implements none of it"
  - "packages/mock-data — the demo-profile assignment table: each demo actor (actor-guardian, actor-editor, actor-planner, actor-viewer) is bound to one closed `ACTOR_ROLES` member so `actedAsRole` is constructible, and each V2 capability string is bound to the demo-world eligibility it grants (target kind, write permitted or not). Authored here as fixture data, exported for the P8 handoff; the capability rows the record does not fix stay `null` in P2's codec table and are not resolved here"
  - "packages/mock-data — Source normalization: `region` → COVERAGE_CLASSES; `status` split back onto lifecycle + networkReachable + contentRetrievable (06 §5); `coveragePlans[].buckets[]` translated to coverageGapSchema rows (target → requiredSlots, availableSourceIds.length → fulfilledSlots, blockedSourceIds.length → blockedSlots) with the frozen plan carrying RESEARCH_PLAN_STATUSES `FROZEN`"
  - "packages/mock-data — base-world density: promote the scenario-named ids p4, p5, p6 and p7 into the base to reach seven projects spanning empty/new, review, research, blocked, ready-package, scheduled and Weekly Lens; derived child ids are produced by a documented mechanical suffix rule from the p2 originals, and no id the V2 brief does not use is invented"
  - "packages/mock-data — all 24 scenarios S01-S24 as named recipe modules over a fresh deep copy of the base world, plus the scenario registry, the switcher keyed by stable id, and the acceptance-journey binding table covering A01-A20 with A05, A13, A14, A17 and A20 bound explicitly"
  - "packages/mock-data — determinism: the injected `DemoClock` port fixed at 2026-09-06T09:00:00Z; the authored finite discovery batch table selected by `batches[seed mod batches.length]`; the scenario response policy (latency, offline, forbidden, retryable/non-retryable failure, conflict) as declarative per-scenario data"
  - "packages/mock-data — persistence: the `DemoStoragePort` interface (read/write/clear plus an external-change signal), snapshot serialization under key `drop-panel-demo-v2` with `snapshotKind: \"drop.panel.mock.v2\"` and `schemaVersion: \"1.0.0\"`, hydration validation, the Reset Demo path that works WITHOUT a valid snapshot, and the two-tab reconciliation rule"
  - "packages/mock-data — command behavior in the repository: the commandId idempotency ledger returning the original receipt with no repeated effect; expectedRevision checks rejecting stale writes as REVISION_CONFLICT while preserving typed feedback; per-aggregate revision increments; the append-only decision, comment, attempt, package and calendar histories; the PanelEvent stream with eventId dedupe and older-aggregateRevision suppression"
  - "packages/mock-data — a store-only (compression method 0) ZIP writer with its own CRC32 for `exportPackage`, producing real sample files plus a synthesized manifest.json that matches the archive's actual contents, returned as `PackageExport { bytes: Uint8Array, filename, mediaType }`"
  - "packages/machine-gateway/src/mock/** — MockMachineGateway, MockPanelGateway, MockPanelCommandGateway and MockRevisionGateway over the shared repository, plus the mock wiring that constructs ReviewApplicationService above them; all four pass the P2 conformance suites unmodified"
  - "apps/web — the browser implementations of the two injected ports only: the localStorage-backed DemoStoragePort (the sole module naming `drop-panel-demo-v2`) and the timer-backed DemoClock used for demo latency; no surface work"
out_of_scope:
  - "UI surfaces, cards, review sheet, inbox and global views (P4); the workflow graph (P5); wiring commands into the UI, degraded-state presentation, optimistic rollback and the download button (P6)"
  - "New DTOs, schema changes, gateway members or interface changes — P2 is frozen; a needed change stops this ticket and goes back through P2's owner (15 §11 discipline). MachineGateway is byte-frozen and PanelGateway stays read-only"
  - "Re-basing the P2 fixtures and the conformance test clock (ADR-0019 D16), and authoring the wire codec, the review facade or the conformance sibling factories — all P2 files; P3 calls them, asserts the single epoch, and stops if it finds a second one"
  - "RealMachineGateway, transport, MSW or API-route interception (withdrawn by ADR-0019 D2)"
  - "Machine intelligence of any kind: no prompts, no providers, no reasoning, no PRNG; mock outputs are authored fixture content (18 §5)"
  - "Extending AUDIT_EVENT_NAMES for a panel action that has no recorded twin — the row stays null in the mapping table and is reported to P8 (ADR-0019 D9)"
contracts_changed:
  - "None. P3 consumes the P2 freeze and implements the four frozen interfaces. The demo-profile mapping table, the panel-event mapping rows and the derived-id rule are authored as data here and REPORTED to P8; they are not contract changes."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None at runtime. The demo profiles are presentation identities mapped onto the closed sets;
  S14's actor-viewer holds only the `read` profile and its forbidden commands are rejected with
  the typed UNAUTHORIZED error. This is presentation of the recorded RBAC semantics, never
  enforcement — real enforcement belongs to the machine-build connection (18 §4.2).
failure_states:
  - "A fixture or materialized scenario entity that fails P2 schema validation fails the test run — an invalid world cannot ship (18 §7)"
  - "An acceptance journey A01-A20 with no bound scenario fails the binding test; shipping an unbound journey is a failure state (ADR-0019 D15)"
  - "A scenario that mutates the base world instead of its own deep copy fails the isolation test — S02 and S03 define the id p4 incompatibly and cannot both be right"
  - "A stale `expectedRevision` is rejected as REVISION_CONFLICT with the caller's typed feedback returned intact; it is never retried blindly and never silently applied (ADR-0019 D10)"
  - "A repeated `commandId` returns the stored receipt and appends nothing — no second decision, run, package or calendar entry"
  - "Corrupt, absent or incompatible persisted data offers Reset Demo with confirmation instead of crashing; the Reset path does not require a valid snapshot to run"
  - "A second tab whose snapshot revision is ahead of this tab's either re-hydrates or shows a refresh notice; overwriting it is forbidden"
  - "S13's disconnected world yields MACHINE_SYSTEM_DISCONNECTED on every gateway method with last-known data marked stale; S14's viewer yields UNAUTHORIZED with no privileged data reachable by that profile's queries"
  - "A `null` reasonFa reaching the command path is rejected before transport, never coerced to \"\" (ADR-0019 D5)"
test_seams:
  - "Seam A (schema): every fixture, every materialized scenario world and every mock-mutated state parses through the P2 panel-domain schemas; normalization is asserted table-driven, wire value by stored code"
  - "Adapter-contract seam: the four mock adapters and the review facade run the P2 conformance suites unmodified, including D19's broken-stub controls"
  - "Scenario seam: one test per S01-S24 reproducing its defining state and its declared action; the S01-S14 ordering assertion against doc 18 §7.2; the journey binding table; the p4 isolation collision"
  - "Persistence seam (jsdom): hydrate/validate/reset/two-tab behaviour against an in-memory DemoStoragePort and a jsdom localStorage double"
  - "Seam F (repo): no Date.now/Math.random/setTimeout/setInterval reachable from mock-data or the mock adapters; sixteen workspace packages; exact-pinned deps; the ESLint zone forbidding component imports of @drop/mock-data stays green; `drop-panel-demo-v2` appears in exactly one apps/web module"
acceptance_criteria: "AC-P3.1 through AC-P3.15 — see checkbox list in the body"
dependencies: ["P2"]
files_owned:
  - "packages/mock-data/** (loader, normalization tables, base world, scenario recipes, registry, clock, seed/batch table, repository, persistence, ZIP writer, Seam A/scenario/persistence tests)"
  - "packages/machine-gateway/src/mock/** (the four mock adapters and the review-facade wiring — additive; P2's interface, error-model and suite files are frozen)"
  - "apps/web/lib/demo-storage.ts and apps/web/lib/demo-clock.ts (the two browser port implementations only)"
  - "tests/repo/determinism.test.ts (new — the Date.now/Math.random/timer reachability check and its mutation fixture)"
handoff_required: true
```

## What to build

The one world everything else in the P-series runs on. P4 renders it, P5 draws it, P6 commands
it and P7 measures it — so every determinism, isolation and normalization decision made here is
inherited by four downstream tickets and is expensive to revisit. The V2 pack hands over a base
seed, twenty-four declarative recipes and twenty acceptance journeys; none of it is executable,
and the gap between "declarative fixture recipes" (V2 04 §1) and a working demo repository is
exactly this ticket.

Three things make it more than fixture typing. The V2 JSON speaks a different dialect from the
recorded contracts and must be translated once, at one boundary. The twenty-four worlds must be
genuinely isolated, and the pack contains a live collision that proves whether they are. And the
demo must survive a reload, a second tab and a double-click without inventing a second write path
or a second clock.

**Demoable when done:** with no UI at all, select S22 through the switcher, submit a command with
`expectedRevision: 1` against a project already at revision 2 and watch a REVISION_CONFLICT
rejection come back carrying the submitted Persian feedback intact; resubmit the earlier
successful `commandId` and watch the identical receipt return with no second effect; then select
S05, call `reviewItem` once and watch exactly one `submitApproval` and one `approval.decided`
appear.

Key mechanics:

1. **Call the codec; do not grow a second one.** `seed.json` says `"approved"`, `"weekly_lens"`,
   `"research_content"`, `"iran"`, `"available_demo"`, `"open"`, `"planned"`,
   `"drop.panel.mock.v2"`. P2 owns the translation in `panel-domain/src/projection/wire-codec.ts`
   and P3 calls it exactly once per entity, where the JSON becomes objects. A second
   lowercase→UPPER conversion written inside an adapter method — even a one-line convenience —
   means the wire form leaked past the boundary and two tables can now disagree. A Seam F check
   asserts no V2 lowercase status literal appears anywhere under
   `packages/machine-gateway/src/mock/`.
   **The asymmetry that will bite:** the codec uppercases `Target.kind: "concept"` into
   `type: "CONCEPT"`, but ADR-0019 D11 fixes `PanelProject`'s discriminant as
   `type: program | weekly_lens`, lowercase, verbatim. Two fields named `type`, two opposite
   rules. Normalizing the project discriminant to `PROGRAM`/`WEEKLY_LENS` for consistency stops
   the P2 discriminated union compiling.
2. **Demo profiles: assign the role, do not invent the capability.** ADR-0019 D6 maps the V2
   strings onto the closed sets and neither set gains a member; P2's codec fixes only
   `fa.editorial → FA_EDITORIAL` and returns `null` for every pair the record does not fix,
   each `null` a P8 coordination item. P3 must not "complete" that table — mapping
   `concept.review` onto `CULTURAL_REVIEW` because it reads plausibly pre-empts the coordination
   decision P8 exists to hold open.
   What P3 does owe is the fixture-level assignment the codec cannot know, because ADR-0019 D10
   narrows V2's untyped `activeRole: string` to the closed enum and no decision is constructible
   without it:

   | Demo actor | wire `activeRole` | stored `actedAsRole` | demo-world eligibility |
   |---|---|---|---|
   | `actor-guardian` | `demo_concept_reviewer` | `DROP_GUARDIAN` | decides on concept targets |
   | `actor-editor` | `demo_fa_editorial` | `REVIEWER_EDITOR` | decides on content targets; holds `FA_EDITORIAL` |
   | `actor-planner` | — | `PROJECT_LEAD` | calendar writes only |
   | `actor-viewer` | — | `VIEWER` | no write — S14's actor |

   Every demo actor is `actorType: HUMAN` with `membershipStatus: ACTIVE`: ADR-0013 rejects
   MACHINE/SERVICE deciders, so a demo actor typed otherwise makes S05's quorum unsatisfiable and
   S14's rejection indistinguishable from a type error. An `activeRole` string with no row here
   is a loader rejection, never a passthrough into `actedAsRole`.
3. **Split the source status; do not collapse it into lifecycle.** 06 §5 keeps lifecycle, network
   reachability and content retrievability as three fields, and ADR-0019 D6 refuses to collapse
   them to suit the fixture. `available_demo` → `lifecycle: ACTIVE, networkReachable: true,
   contentRetrievable: true`. `blocked` → `lifecycle: ACTIVE, networkReachable: true,
   contentRetrievable: false` — s3 is a reachable demo archive whose *content* is gated, which is
   why `retrieval-s3` asks for human retrieval rather than a network retry. Expressing "blocked"
   as `DEACTIVATED` is the collapse the decision exists to prevent: deactivation is a registry
   judgement, unreachability is an availability fact, and 02 §7 forbids marking a blocked source
   verified when retry is clicked.
   `coveragePlans[].buckets[]` become `coverageGapSchema` rows: `target → requiredSlots`,
   `availableSourceIds.length → fulfilledSlots`, `blockedSourceIds.length → blockedSlots`. Check
   the arithmetic before inventing bucket data — the schema's refine rejects
   `fulfilled + blocked > required`, and the supplied Iranian bucket (target 2, one available, one
   blocked) sits exactly on the boundary. 06 §5's "blocked evidence slots stay in the denominator"
   is why A08 reads "1 of 2 with one blocked", not "1 of 1".
4. **Seven projects, no invented ids.** The seed carries p1, p2, p3; V2 04 §2 requires 6-8 across
   empty/new, review, research, blocked, ready-package, scheduled and Weekly Lens. The recipes
   already name p4 (S02/S03), p5 (S19), p6 (S20) and p7 (S23) — promote those four into the base
   and the count is seven with every bucket covered: p4 empty/new, p1 research + review + blocked
   (o2 on the gated s3), p5 ready-package with `targetDate: null`, p6 ready-package with
   `targetDate: "2026-09-15"`, p7 packaging failure, p2 scheduled, p3 Weekly Lens. Child ids for
   the p2-derived clones are produced mechanically — `c4` → `c4-p5`, `c4-v1` → `c4-v1-p5`,
   `pkg-p2` → `pkg-p5` — not authored as new literals. Note the constraint before choosing a
   separator: `idSchema` is `^[A-Za-z0-9_-]+$`, so a namespacing colon (`p5:c4`) fails validation.
5. **S01-S14 are doc 18 §7.2's fourteen, verified 1:1 and in order.** Checked name by name
   against the reference copy: S01 No Programs yet, S02 Draft Program without run, S03 Ready to
   start, S04 Active machine stage, S05 Human concept review, S06 Rejection loop, S07 Missing
   input, S08 Unavailable external source, S09 Retryable stage failure, S10 Non-retryable failure,
   S11 Completed approved artifacts, S12 Approved-parent Weekly Lens, S13 Disconnected machine
   system, S14 Unauthorized actor — the same fourteen, in the same order, none trimmed
   (ADR-0018 D4, ADR-0019 D15). The scenario-seam test asserts that ordering against a committed
   copy of the §7.2 list so a later edit cannot quietly renumber them.
6. **Fresh deep copy per scenario, and the collision that proves it.** Every recipe applies to a
   structurally-cloned base world, never to a shared object graph (V2 04 §1). The pack ships the
   proof: **S02 defines p4 as a draft with `input: null`, and S03 defines the same id p4 as a
   draft with a valid text reference.** Both cannot be true of one object. The base takes S02's
   variant — S02 is one of the untrimmable fourteen (18 §7.2.2, "Draft Program with no run") —
   and S03's reference-bearing p4 stays scenario-local, materialized only inside S03's own copy.
   The isolation test loads S03, mutates its p4, then loads S02 and asserts `input === null`:
   with a shared fixture object that test fails, which is the point of writing it.
7. **Every journey is bound; five of them are not bound by the JSON.** `scenarios.json` carries a
   singular `acceptanceId`, so the registry widens it to `acceptanceIds: string[]` at the loader
   boundary — S05 now carries three. Walking the file leaves A05, A13, A14, A17 and A20 with no
   world; each is bound explicitly to an existing one rather than by authoring a twenty-fifth
   scenario (ADR-0019 D15 fixes the additive set at S15-S24):

   | Journey | Bound to | Why that world stages it |
   |---|---|---|
   | A05 comment without decision | **S05** | `c2-v2` is `in_review` with `comment-c2` already on `c2-v1`; a second comment must leave `reviewStatus` untouched |
   | A13 package v2, no calendar duplication | **S21** | the only world that rebuilds `pkg-p2` after `c4-v2`; `cal-p2` is relinked through `updateCalendarPackage`, never re-created |
   | A14 same action from inbox/card/graph | **S05** | one reviewable version reachable from three entry points; P3 proves the single `reviewItem` path, P6 wires the graph shortcut (ADR-0019 D18) |
   | A17 reload midway | **S18** | mid-revision state: `o4.pendingRevisionId` and the stored `feedbackFa`, plus the base's comment history and `cal-p2`'s date — all four must survive hydration |
   | A20 keyboard/mobile review and date edit | **S20** | the only world with a `targetDate` and a reschedule; the review half uses the base `c2-v2` sheet present in every world |

   A repo test asserts the binding is total in both directions: every A01-A20 has at least one
   scenario and every S01-S24 has at least one journey.
8. **No PRNG, no wall clock, no timer.** The `DemoClock` port is injected and fixed at
   `2026-09-06T09:00:00Z`; simulated latency is a scheduled advance *through that port*, whose
   browser implementation uses a real timer and whose test implementation advances instantly — so
   `setTimeout` never appears in `packages/mock-data` or the mock adapters, and the scenario seam
   does not spend real seconds. Discovery selects `batches[seed mod batches.length]` from an
   authored table (ADR-0019 D16). Two traps: a table of length 1 makes "advancing the seed yields
   a different predefined batch" (01 §3) silently false, so a test asserts at least two batches
   and that `seed` and `seed + 1` select different ones; and `seed mod length` on a negative or
   non-integer persisted seed must be guarded rather than producing `NaN` as an index. Batch
   concept ids are derived from `projectId`, batch index and slot, so two projects started at the
   same seed do not collide.
   The epoch assertion is a **runtime** check over materialized worlds — every instant reachable
   from a loaded scenario is at or after the epoch. A repo-wide text grep for `2026-08-21` is the
   wrong check, three times over: `packages/panel-domain/src/fixtures/invalid.ts:50` deliberately
   holds `"2026-08-21T09:00:00+03:30"` to prove `INSTANT_MUST_BE_UTC_ISO_8601`, and P2 explicitly
   excludes `packages/ui/src/components/drop/domain-components.test.tsx` and
   `apps/web/app/dev/gallery/gallery-content.tsx` from the re-base because those are a Jalali
   formatter test and its gallery sample, not a demo world. If a *live* P2 fixture still carries
   the old anchor, stop and hand it back — ADR-0019 D16 assigns that re-base to P2, and this
   ticket does not edit `fixtures/valid.ts` or `conformance.test.ts`.
9. **One repository instance, four adapters.** The scenario is materialized once and the same
   `DemoRepository` is handed to MockMachineGateway, MockPanelGateway, MockPanelCommandGateway and
   MockRevisionGateway. Four adapters each constructing their own copy is the defect this mechanic
   exists to prevent: an approval submitted through MachineGateway would be invisible to
   `PanelGateway.getSnapshot`, and V2 01 §8's "successful commands update every view of the same
   entity" would be false in a way no single-adapter test catches. The cross-adapter test writes
   through PanelCommandGateway and reads the effect back through the other three.
10. **Idempotency and conflict are one critical section.** The ledger is keyed by `commandId`
    (`idempotencyKey` is derived from it, ADR-0019 D10) and stores the receipt *and* the resulting
    revision. The lookup, the revision check and the effect append happen with **no `await`
    between them** — an await there reopens exactly the double-submit window A15 exists to close,
    and the bug is invisible in a single-threaded test that never interleaves. A stale
    `expectedRevision` throws `REVISION_CONFLICT` and returns the caller's typed feedback intact
    (02 §6: "failures retain draft feedback"). `GatewayError` derives `retryable` from the reason
    and REVISION_CONFLICT is deliberately outside the transient set — never construct it with an
    explicit `retryable: true`, because a conflict is resolved by refresh-then-resubmit
    (ADR-0019 D10).
11. **One approval write path, and one Persian-reason asymmetry to leave alone.**
    `ReviewApplicationService.reviewItem` (P2's file) resolves the target and exact version,
    constructs the only `ApprovalCommand` in the system and delegates to
    `MachineGateway.submitApproval` (ADR-0019 D4). P2 ships the case that replaces
    `submitApproval` with a rejecting stub and asserts the decision list is byte-identical
    afterwards; P3's obligation is to pass it, which it does only if the mock repository contains
    **no direct decision append** — not in `MockPanelCommandGateway.addComment`, not in a helper
    that "records the outcome while it is here", not in the scenario materializer replaying a
    recipe. `requestRevision` lives on RevisionGateway and is never aliased to `retryStage`.
    Reject-and-revise records the decision first and durably, so a regeneration failure neither
    erases it nor duplicates it on retry.
    The asymmetry: `approvalCommandSchema.reason` is `displayTextSchema` (min 1, mandatory per
    ADR-0013 D2), but six seeded decisions — `d-c1`, `d-c4`, `d-o1`, `d-o3`, `d-o5`, `d-o6` — carry
    `reasonFa: null`, every one of them an `approved`. Do not relax the command schema and do not
    coerce `null` to `""` (ADR-0019 D5 forbids exactly that). Seeded decisions are historical
    *records*, never replayed through `reviewItem`; the record schema tolerates a null reason on
    APPROVED only and requires one on REJECTED and CHANGES_REQUESTED, which is what `d-c3` and
    `d-c2-v1` already show. Record the asymmetry for P8 rather than resolving it here.
12. **Persist through the port, in one key, and never overwrite a fresher tab.** `packages/mock-data`
    cannot name `localStorage`: `tsconfig.base.json` sets `lib: ["ES2023"]`, the identifier does
    not typecheck, and ADR-0019 D17 refuses to widen the lib. So the package defines
    `DemoStoragePort` and `apps/web/lib/demo-storage.ts` implements it — the only module in the
    repository that names `drop-panel-demo-v2`. (Scope that Seam F check to the demo key:
    `apps/web/app/theme-provider.tsx` legitimately uses `localStorage("theme")` for a per-viewer
    preference from P1, and a blanket ban would fail on it.) The snapshot carries
    `snapshotKind: "drop.panel.mock.v2"` beside `schemaVersion: "1.0.0"` (ADR-0019 D8) and is
    validated on hydration; a mismatch or a parse failure offers Reset Demo with confirmation.
    Reset must not depend on a hydrated repository — if it is a method on an object that failed to
    construct, the only escape from a corrupt key is devtools. Only metadata and short sample text
    persist: file references keep `name`, `size` and `mime` and never bytes, so after a reload the
    UI offers re-selection (V2 01 §3). On an external change with a higher revision, re-hydrate
    when this tab holds no uncommitted edit and otherwise show a refresh notice — silent
    last-write-wins is forbidden (ADR-0019 D2).
13. **Calendar and events keep the recorded vocabularies.** `unscheduled` is `PLANNED` with
    `date === null` and appears in the tray under «تعیین تاریخ»; `planned` is `PLANNED` with a
    date; ADR-0015 D5 is not amended and no entry ever reads "published" because a date was
    chosen (ADR-0019 D7). Calendar creation is idempotent per package family, which is what makes
    A13's rebuild relink `cal-p2` instead of adding a second row. Mocked state changes append only
    the closed 35 audit names; panel actions with no recorded twin — calendar entry creation,
    date selection, Reset Demo, seed advance — emit a `PanelEvent` and take a `null` row in the
    mapping table modelled on `DOC18_EVENT_FAMILY_MAPPING`, reported to P8. Adding a 36th audit
    name is a failure, not a fix (ADR-0019 D9).
14. **The archive is real, and it costs no dependency.** `exportPackage` returns P2's
    `packageExportSchema` shape — `{ bytes: Uint8Array, filename, mediaType }` — with a
    synthesized `manifest.json` matching the files actually written (ADR-0019 D17); `apps/web`
    builds the Blob in P6, and `Blob` does not typecheck here because `tsconfig.base.json` stays
    at `lib: ["ES2023"]`. ADR-0019's consequences enumerate exactly three new npm dependencies and
    a ZIP library is not among them, so the writer is a store-only (method 0) archive with a local
    CRC32 — about sixty lines, no registry dependency. If a library is judged necessary anyway it
    must be added with `pnpm add -E`, or `scripts/check-pinned.mjs` fails on the caret range.
    `Buffer` is equally unavailable: `packages/mock-data` carries no `@types/node`, so the bytes
    are a `Uint8Array` end to end.

## Blocked by

P2, including its V2 delta — the panel product DTOs (`panelProjectSchema`, `packageExportSchema`,
`panelEventSchema`), `PRODUCT_STAGES`, `projection/wire-codec.ts`, `commandEnvelopeSchema`, the
tri-state receipt, `REVISION_CONFLICT`, `calendarDateSchema`, the `PanelCommandGateway` and
`RevisionGateway` interfaces, `ReviewApplicationService` and the four sibling conformance
factories this ticket's adapters must pass unmodified. P3 cannot start on the committed
doc-18-era freeze alone: without the codec there is no boundary to normalize at, and without the
two new interfaces there is nothing for two of the four mocks to implement. P1-R's shell is not a
blocker — nothing here renders. P4 does not start until this world lands.

## Acceptance criteria

- [ ] **AC-P3.1 One normalization boundary** — every seed and fixture value reaches the store
  through P2's `wire-codec`, with a table-driven test covering review status, product stage,
  output type, editorial status, calendar status, request status, decision outcome, region,
  source status and error code; `Target.kind` arrives as `type: CONCEPT|CONTENT` while the
  `PanelProject` discriminant stays lowercase (ADR-0019 D11); a Seam F check finds no V2 lowercase
  status literal under `packages/machine-gateway/src/mock/`. *Seam: Seam A, Seam F.*
- [ ] **AC-P3.2 Demo profiles assigned, not invented** — each of the four demo actors resolves to
  one closed `ACTOR_ROLES` member with `actorType: HUMAN` and `membershipStatus: ACTIVE`; an
  `activeRole` string with no row is rejected by the loader rather than passed through as
  `actedAsRole`; exact-membership tests re-assert `CAPABILITIES` at 13 and `ACTOR_ROLES` at 7
  unchanged; the capability rows P2's codec leaves `null` are still `null` and appear in the P8
  report. *Seam: Seam A.*
- [ ] **AC-P3.3 Source split and coverage translation** — `region` maps to `COVERAGE_CLASSES`;
  `status` materializes as lifecycle + `networkReachable` + `contentRetrievable` with `blocked`
  reaching `contentRetrievable: false` and never `DEACTIVATED`; the two supplied buckets become
  `coverageGapSchema` rows that pass the `fulfilled + blocked ≤ required` refine and report
  "1 of 2" for the Iranian bucket. *Seam: Seam A.*
- [ ] **AC-P3.4 Density** — the base world holds seven projects covering empty/new, review,
  research, blocked, ready-package, scheduled and Weekly Lens; the main journey carries at least
  three concept cards and an active branch at least four content items; every id is either from
  the V2 brief or derived by the committed suffix rule and every one parses `idSchema`. *Seam:
  scenario seam.*
- [ ] **AC-P3.5 Twenty-four worlds, the first fourteen in order** — each S01-S24 materializes and
  parses through the P2 schemas; a test compares S01-S14's names and order against a committed
  copy of doc 18 §7.2 and fails on any trim, insert or renumber. *Seam: Seam A, scenario seam.*
- [ ] **AC-P3.6 Isolation proven by the p4 collision** — the base carries S02's `input: null` p4;
  S03's reference-bearing p4 exists only inside S03; mutating a loaded S03 and then loading S02
  yields `input === null`, and a deliberately shared-object fixture makes that test fail. *Seam:
  scenario seam.*
- [ ] **AC-P3.7 No unbound journey** — the binding table is total in both directions across
  A01-A20 and S01-S24, with A05→S05, A13→S21, A14→S05, A17→S18 and A20→S20 recorded explicitly;
  removing one binding turns the test red. *Seam: scenario seam.*
- [ ] **AC-P3.8 Determinism** — loading the same scenario twice at the same seed and clock yields
  deep-equal serialized state; `tests/repo/determinism.test.ts` proves `Date.now`, `Math.random`,
  `setTimeout` and `setInterval` are unreachable from `packages/mock-data` and
  `packages/machine-gateway/src/mock/`, with a mutation fixture proving the check fires; the batch
  table holds at least two batches and `seed` versus `seed + 1` select different ones; every
  instant in every materialized world is at or after `2026-09-06T09:00:00Z`. *Seam: Seam F,
  scenario seam.*
- [ ] **AC-P3.9 Persistence** — a snapshot round-trips through `DemoStoragePort` under
  `drop-panel-demo-v2` with `snapshotKind: "drop.panel.mock.v2"`; corrupt, absent and
  wrong-`snapshotKind` payloads each offer Reset Demo with confirmation and no crash; Reset runs
  without a valid snapshot and reproduces the identical batch sequence; no file bytes, secret or
  credential is written; an external change at a higher revision re-hydrates or notices and never
  overwrites. *Seam: persistence seam.*
- [ ] **AC-P3.10 Idempotency** — the same `commandId` submitted twice returns the byte-identical
  receipt and appends no second decision, run, package, calendar entry or event; the ledger check
  and the effect append share one await-free critical section. *Seam: adapter-contract seam,
  scenario seam.*
- [ ] **AC-P3.11 Conflict** — S22's stale `expectedRevision` is rejected as `REVISION_CONFLICT`
  with state untouched and the submitted Persian feedback returned intact; the error is not
  retryable by default; refresh-then-resubmit succeeds. *Seam: scenario seam.*
- [ ] **AC-P3.12 Single approval write path** — one `reviewItem` produces exactly one
  `submitApproval` call and one `approval.decided` event; P2's rejecting-stub case, run against
  the mock repository, leaves the decision list byte-identical, proving the repository holds no
  second append; `revision_requested` arrives as `CHANGES_REQUESTED`; a `null` reason is rejected
  before transport; `requestRevision` creates a new version with prior versions byte-identical and
  is never routed through `retryStage`. *Seam: adapter-contract seam.*
- [ ] **AC-P3.13 Conformance and export** — MockMachineGateway, MockPanelGateway,
  MockPanelCommandGateway and MockRevisionGateway pass the P2 suites unmodified; `subscribe`'s
  unsubscribe stops delivery, duplicate `eventId` dedupes and an older `aggregateRevision` is
  ignored; `exportPackage` returns non-empty bytes whose entries match the synthesized
  `manifest.json`, with no `Blob` and no DOM type in the contract packages. *Seam:
  adapter-contract seam.*
- [ ] **AC-P3.14 Frozen boundaries hold** — `MachineGateway` is byte-identical to the committed
  18 §6 text and PanelGateway still has exactly its seven read-only members; `AUDIT_EVENT_NAMES`
  is still 35 and every panel action without a twin takes a `null` mapping row;
  `workspace-integrity.test.ts` still counts sixteen packages; `placeholder-purity.test.ts` still
  passes for the twelve frozen workspaces; `check-pinned.mjs` passes with any new dependency
  exact. *Seam: Seam F.*
- [ ] **AC-P3.15 Checks green** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass;
  the ESLint zone forbidding component imports of `@drop/mock-data` stays green, verified at a
  real source path under `apps/web/app/` rather than only at a `tests/repo/` fixture, because flat
  config's terminal-zone behaviour makes a fixture-only assertion vacuous
  (`tests/repo/eslint-zone-terminality.test.ts`). *Seam: Seam F.*
