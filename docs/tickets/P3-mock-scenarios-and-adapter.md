# Ticket P3 — Deterministic mock scenarios and the MockMachineGateway

```yaml
ticket_id: "P3"
title: "packages/mock-data: the fourteen deterministic scenarios, plus MockMachineGateway passing the adapter-contract suite"
release: "P"
owner_lane: "platform"
source_requirements:
  - "18 §11.3 — sequence step 3: build deterministic mock scenarios and MockMachineGateway"
  - "18 §7 — mocks are deterministic, reproducible, schema-validated, realistic, scenario-switchable, isolated from production configuration, replaceable through DI; stable IDs, fixed timestamps or controllable clock, seeded values; components never import fixture JSON directly"
  - "18 §7.1 — required mock entities: users/roles, Programs, Weekly Lenses, machine summaries 01–05, definitions/versions/nodes/edges/human gates, runs and stage attempts, inputs/outputs/validation/safe diagnostics, approvals and change requests, artifacts and versions, research sources/coverage gaps/retrieval requests, notifications and audit events"
  - "18 §7.2 — the fourteen required workflow scenarios, each reproducible"
  - "18 §7.3 — mocked command behavior: start/pause/retry/approve mutate mock state and append audit events; refresh/synchronize simulates success, latency, timeout, disconnected and stale-data cases; mock controls clearly marked in dev/demo and never implying real machine work"
  - "18 §12 — acceptance: all scenarios selectable and reproducible; commands produce clear mocked state changes and audit entries; no UI state falsely claims a real machine operation occurred"
  - "Testing-strategy §6 fixtures policy (surviving discipline): Persian-first fixture content, no secrets or real personal data, every rejection fixture cites its rule"
adr_constraints:
  - "ADR-0017 D4 — mocks present the recorded semantics: ADR-0012 state names and transitions, ADR-0013 approval semantics, the 10 §9 + ADR-0014 event names; exactly the P2 vocabularies, no parallel names"
  - "ADR-0012 — scenario states are drawn from the recorded transition table and aggregation rule (e.g. a FAILED_RETRYABLE stage aggregates to run RUNNING; a FAILED_FINAL stage to run FAILED); mock transitions never invent edges the table lacks"
  - "ADR-0013 — the mock approve path presents: decisions only through submitApproval (never a run command), N distinct HUMAN approvers for quorum, one decision per actor per request, MACHINE/SERVICE actors rejected as deciders"
  - "ADR-0014 — every mocked state change appends the correctly named event (run.paused after pause, stage.skipped on skip presentation, approval.decided on decisions, one terminal run.* per run)"
  - "ADR-0015 — Program/Lens/request fixture statuses come from the recorded enums"
  - "ADR-0017 D5 — no PostgreSQL/Redis/queues/providers; mock state lives in memory behind the adapter; no network calls"
in_scope:
  - "packages/mock-data: typed, schema-validated fixture modules for every (18 §7.1) entity, Persian-first content with bidi-safe English identifiers; stable IDs; an injectable controllable clock; seeded value generation; a scenario registry keyed by stable scenario IDs 1–14 with a switcher (dev/demo configuration only, isolated from production config)"
  - "All fourteen (18 §7.2) scenarios as named scenario modules, each a complete world (users, programs, definitions, runs, approvals, artifacts, audit trail) that parses through the P2 panel-domain schemas"
  - "MockMachineGateway and MockPanelGateway in packages/machine-gateway, backed by mock-data, implementing the P2 interfaces and passing the P2 adapter-contract suite unmodified"
  - "Mocked command behavior (18 §7.3): startRun creates/reveals a mocked run and advances it through a controlled, clock-driven progression; pauseRun updates state and appends run.paused; retryStage creates a new StageAttempt preserving prior attempt history; submitApproval updates approval state, appends approval.decided, and enforces the ADR-0013 presentation semantics (distinct approvers, HUMAN-only, quorum at N distinct APPROVED decisions; CHANGES_REQUESTED routes the loop-back presentation of scenario 6)"
  - "Refresh/synchronize simulation: success, latency, timeout, disconnected and stale-data cases via the P2 typed error model (scenario 13 is the disconnected world)"
  - "Dev/demo marking (18 §12): every receipt from the mock adapters carries the P2 mock-origin marker; no fixture text or mocked state claims real machine work occurred"
out_of_scope:
  - "UI surfaces and wiring (P4); workflow canvas rendering (the workflow-surface ticket)"
  - "RealMachineGateway and transport (deferred, 18 §9); MSW/API-route interception (only if a P4 surface demonstrates the need, 18 §4.2)"
  - "New DTOs, schema changes or interface changes — P2 is frozen; a needed change stops this ticket and goes back through P2's owner (15 §11 discipline)"
  - "Machine intelligence of any kind: no prompts, no providers, no reasoning — mock outputs are static-but-realistic fixture content (18 §5)"
contracts_changed: "None. P3 consumes the P2 freeze; the mock adapters implement the frozen interfaces."
database_changes: "None — panel scope has no database (ADR-0017 D5); mock state is in-memory and reconstructable from fixtures."
permission_requirements: >
  None at runtime. Scenario 14 ships a role-limited user fixture whose forbidden actions the
  mock rejects with the typed unauthorized error — presentation of the recorded RBAC
  semantics, not enforcement (real enforcement belongs to the machine-build connection).
failure_states:
  - "A fixture failing schema validation fails the build/test run — invalid mock worlds cannot ship (18 §7)"
  - "Commands against a disconnected scenario yield the typed disconnected error, never a hang or silent success"
  - "submitApproval by an already-decided actor, a MACHINE/SERVICE actor, or below-quorum count yields typed rejections presenting ADR-0013"
  - "An unknown scenario ID fails the switcher with a typed error listing valid IDs"
test_seams:
  - "Seam A: every fixture and every mock-mutated state parses through the P2 schemas"
  - "Adapter-contract seam: MockMachineGateway and MockPanelGateway pass the P2 conformance suite unmodified"
  - "Scenario seam: one test per (18 §7.2) scenario reproducing its defining state and, where commands apply, its transitions and audit events"
  - "Seam F: dependency check that @drop/mock-data is imported only by the machine-gateway mock adapters and test code (the ESLint zone from P2 stays green)"
acceptance_criteria: "AC-P3.1 through AC-P3.10 — see checkbox list in the body"
dependencies: ["P2"]
files_owned:
  - "packages/mock-data/** (fixtures, scenario modules, clock, switcher, scenario-seam tests)"
  - "packages/machine-gateway/src/mock/** (MockMachineGateway, MockPanelGateway and their suite runs — additive; P2's interface and suite files are frozen)"
handoff_required: true
```

## What to build

The deterministic world the panel demos and tests against until the real machines connect.
Fourteen named worlds, one per (18 §7.2) scenario, each complete enough that P4 can render
every surface and every degraded state from it — and every one of them a typed, schema-valid,
seeded, clock-controlled fixture set, because screenshots and tests must never depend on
uncontrolled randomness (18 §7).

**Demoable when done:** `pnpm test` shows the P2 conformance suite green against
MockMachineGateway; a reviewer can select scenario 5 through the switcher, call
`submitApproval` twice as the same actor and watch the second decision rejected, then call it
as a second distinct human and watch the gate satisfy, with `approval.decided` events appended
— all without any UI.

The fourteen scenarios (18 §7.2), each with its defining presentation:

1. **No Programs yet** — empty lists everywhere; every P4 empty state has a home.
2. **Draft Program with no run** — Program in its ADR-0015 draft status; no runs.
3. **Ready workflow waiting to start** — published definition version; startRun available.
4. **Active run, one machine running** — one stage RUNNING; run RUNNING (ADR-0012 D3).
5. **Run waiting for human approval** — stage WAITING_FOR_APPROVAL, run WAITING_APPROVAL;
   open approval request with a quorum of distinct-human slots.
6. **Approval rejected with change request and loop-back edge** — CHANGES_REQUESTED decision
   recorded; loop-back edge presentation; approval.decided in the audit trail.
7. **Run blocked by missing input** — WAITING_FOR_INPUT with its reason code; run
   WAITING_INPUT.
8. **Run blocked by unavailable external source** — WAITING_FOR_INPUT with a
   source-unavailable reason; research.slot.blocked and a retrieval request fixture.
9. **Partial failure with a retryable stage** — FAILED_RETRYABLE with attempt history; run
   aggregates RUNNING; retryStage produces a fresh attempt.
10. **Non-retryable machine failure** — FAILED_FINAL with safe diagnostics; run FAILED;
    exactly one run.failed event.
11. **Completed Program with approved artifacts** — run SUCCEEDED; artifact versions with
    artifact.approved events; run.completed present exactly once.
12. **Weekly Lens derived from an approved Program/Concept Bible** — Lens fixtures linked to
    the approved parent, statuses per ADR-0015.
13. **Machine system disconnected** — gateway methods yield the typed disconnected error;
    last-known data marked stale.
14. **Unauthorized action for the current role** — role-limited user; forbidden commands
    yield the typed unauthorized error, with no privileged data in fixtures reachable by
    that role's queries.

Mechanics that keep it honest: mock transitions replay rows of the ADR-0012 table rather than
inventing motion (a scenario progression is a scripted sequence of recorded transitions
advanced by the injected clock); event appends use the exact recorded names; and the mock
never manufactures a state the vocabulary lacks. Where doc 18 asks for behavior the recorded
semantics forbid, the recorded semantics win and the divergence is reported (18 §13) — none is
currently known.

## Blocked by

P2 (the frozen DTOs, interfaces and conformance suite). Can run in parallel with P1.

## Acceptance criteria

- [ ] **AC-P3.1 All fourteen worlds exist and validate** — each (18 §7.2) scenario is a named
  module whose every entity parses through the P2 schemas at test time; the fixture set
  covers every (18 §7.1) entity class. *Seam: Seam A + scenario seam.*
- [ ] **AC-P3.2 Determinism** — loading the same scenario twice with the same seed and clock
  yields deep-equal serialized state; no Date.now/Math.random reachable from fixture or
  adapter code (static check plus repeat-run test). *Seam: scenario seam.*
- [ ] **AC-P3.3 Conformance** — MockMachineGateway and MockPanelGateway pass the P2
  adapter-contract suite unmodified. *Seam: adapter-contract seam.*
- [ ] **AC-P3.4 Scenario switcher** — every scenario is selectable by stable ID; an unknown ID
  fails typed; the switcher is dev/demo-only configuration, proven absent from the
  production build path. *Seam: scenario seam + Seam F.*
- [ ] **AC-P3.5 Command behavior** (18 §7.3) — per-command tests: startRun reveals/advances a
  run through its scripted ADR-0012 transitions; pauseRun sets the recorded PAUSED
  presentation and appends run.paused; retryStage adds a new attempt with prior attempts
  intact; each mutation appends its exact ADR-0014/10 §9 event name. *Seam: scenario seam.*
- [ ] **AC-P3.6 ADR-0013 presentation** — on scenario 5: the same actor's second decision is
  rejected; a MACHINE/SERVICE actor's decision is rejected; the gate satisfies only at N
  distinct HUMAN APPROVED decisions; CHANGES_REQUESTED produces scenario 6's loop-back
  presentation. *Seam: scenario seam.*
- [ ] **AC-P3.7 Terminal-event uniqueness** (ADR-0014) — scenarios 10 and 11 carry exactly one
  terminal run.* event each; the audit trail contains no event name outside the P2 enum
  (schema-enforced, asserted). *Seam: Seam A + scenario seam.*
- [ ] **AC-P3.8 Degraded worlds** — scenario 13 yields typed disconnected errors and
  stale-marked data on every gateway method; scenario 14 yields typed unauthorized errors
  for the role's forbidden actions. *Seam: scenario seam.*
- [ ] **AC-P3.9 Mock marking** (18 §12) — every receipt from the mock adapters carries the
  mock-origin marker; a sweep asserts no fixture string claims real machine execution.
  *Seam: scenario seam.*
- [ ] **AC-P3.10 Checks green** (16 §7) — `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm build` pass; the P2 ESLint zone (no component imports of @drop/mock-data) stays
  green. *Seam: Seam F.*
