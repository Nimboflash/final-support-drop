# Ticket P4 — Dashboard surfaces on mock data

```yaml
ticket_id: "P4"
title: "Dashboard surfaces: overview, Programs, Weekly Lenses, approvals inbox, artifacts, requests, audit and notifications — via the gateway only"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "18 §11.4 — sequence step 4: build the dashboard overview, Programs, Lenses, approvals, artifacts, requests and audit surfaces"
  - "18 §3 — build objective bullets: view Programs and Weekly Lenses; review stage inputs/outputs; view artifacts, sources, validation results and errors; approve/reject/request changes at human gates; view requests, activity history and audit information; understand blocked, waiting, running, completed and failed states; Persian-first RTL with English technical identifiers"
  - "18 §4.1 — dashboard overview and status summaries; Program and Weekly Lens lists and detail views; approval inbox and approval/rejection/request-change interactions; artifact, research-source, request and audit views; loading, empty, error, offline, permission-denied and degraded-mode states"
  - "18 §7.2 scenarios 1–14 as the demonstration and test worlds; 18 §7.3 command presentation; 18 §12 acceptance criteria"
  - "04 §2 navigation and permission-aware visibility; 04 §6.1 Overview page; 04 §7 role-aware landing; 04 §8 empty/loading/failure states (surviving IA authority per 18 §2)"
  - "09 §9 central Persian labels; 09 §12 table/ID rules (Jalali display, LTR-isolated identifiers)"
adr_constraints:
  - "ADR-0017 D4 — every surface reads DTOs through the P2 interfaces only; components never import @drop/mock-data (18 §6, §7); React Flow objects are not this ticket's concern and never enter these surfaces"
  - "ADR-0013 (presented through mocks) — the approvals inbox issues decisions exclusively through submitApproval with decision APPROVED|CHANGES_REQUESTED|REJECTED|ESCALATED; no gate verb exists as a command anywhere in the UI; distinct-approver quorum and HUMAN-only deciders render as first-class UI states"
  - "ADR-0012 — run/stage states render exactly the recorded names through the P1 badges; BLOCKED-style labels are UI categories over wait states plus reason codes (ADR-0012 D4), never new state names"
  - "ADR-0014 / 10 §9 — the audit view renders the recorded event names with central Persian labels; no invented event vocabulary"
  - "ADR-0015 — Program/Lens/request statuses render only the recorded enumerations"
  - "ADR-0017 D5 — no PostgreSQL/Redis/queues/providers; no UI state may claim a real machine operation occurred (18 §12): mock-origin receipts render with the dev/demo marking"
in_scope:
  - "Panel application services in apps/web: DI wiring that hands surfaces a MachineGateway and WorkspaceDirectory (MockMachineGateway from P3 in dev/demo; the seam RealMachineGateway plugs into later), plus the scenario switcher exposure in dev/demo configuration only"
  - "Overview (04 §6.1, skeleton scope): waiting actions, blocked/failed runs, machine status summary across Machines 01–05 — fed via the gateway"
  - "Program list and detail; Weekly Lens list and detail including the scenario 12 derivation link to the approved parent Program/Concept Bible"
  - "Approvals inbox and gate interactions: pending approvals list, approval detail with quorum presentation (N distinct human approvers, decisions so far), approve / reject / request-changes flows through submitApproval, decision receipts and rejection states rendered in Persian"
  - "Artifact views: artifact summaries and versions for a run/Program (scenario 11); research-source and coverage-gap presentation (scenario 8)"
  - "Request views: retrieval/human requests with ADR-0015 statuses; audit view: filtered AuditEvent list (AuditFilters) with Persian labels, Jalali timestamps and LTR-isolated IDs; notifications surface from WorkspaceDirectory"
  - "Permission-aware navigation visibility and role-aware landing over mock users/roles (04 §2, §7), including the scenario 14 role"
  - "Every (18 §4.1) state wired on every surface in scope using the P1 primitives: loading, empty, error, offline, permission-denied, degraded — with scenario 13 (machine system disconnected) rendering the degraded/stale treatment and scenario 14 (unauthorized) rendering permission-denied without data leakage"
out_of_scope:
  - "Workflow definition list, graph display, run detail canvas and node inspector — the React Flow surfaces belong to the workflow-surface ticket (18 §11 step 5) on packages/workflow-ui"
  - "New DTOs, gateway methods or mock fixtures — P2/P3 are frozen; gaps go back through their owners, never inline (15 §11 discipline)"
  - "Auth screens and real session enforcement (deferred with 0.5 per ADR-0017 D2); server-side RBAC (real enforcement arrives with the machine-build connection)"
  - "Run compare view and later-release surfaces (04 §5)"
contracts_changed: "None. This ticket consumes the P2 freeze and the P1 component API."
database_changes: "None — panel scope has no database (ADR-0017 D5)."
permission_requirements: >
  Panel-side RBAC checks only (18 §4.2): surfaces hide/disable by the mock user's role and
  render permission-denied on forbidden access — presentation of the recorded semantics
  (04 §2, 11 §1: hidden UI is never a security boundary). No approval affordance is shown to
  the scenario 14 role; the mock's typed unauthorized rejection is also handled when a command
  is attempted anyway.
failure_states:
  - "Gateway typed errors map to the P1 primitives: disconnected → degraded banner with stale-data marking and retry affordance (scenario 13); unauthorized → permission-denied with no data leakage (scenario 14); timeout/latency → loading then error with retry"
  - "A rejected mock command (e.g. duplicate approval by the same actor) renders a Persian error state naming the reason; the UI never applies an optimistic transition the receipt did not confirm (18 §8 spirit: commands go through the seam, never client-side state invention)"
  - "Offline renders the OfflineState primitive; every list has its empty state (scenario 1 exercises them globally)"
  - "Unknown enum values arriving through the seam render the safe fallback badges (P1), never a crash"
test_seams:
  - "Component seam: Vitest + Testing Library on every surface — rendering per scenario, command flows, error mapping, permission-aware visibility"
  - "Scenario seam: each of the fourteen (18 §7.2) scenarios reproduced through real surfaces — a test per scenario asserting its defining UI presentation"
  - "Seam E: Playwright FA/RTL journeys in tests/e2e/panel — the demo journey and the degraded journeys, with axe WCAG 2.2 AA checks"
  - "Seam F: ESLint zone green (no @drop/mock-data import from components); check commands"
acceptance_criteria: "AC-P4.1 through AC-P4.14 — see checkbox list in the body"
dependencies: ["P1", "P2", "P3"]
files_owned:
  - "apps/web/app/studio/** — surface routes beneath the P1 shell (overview, programs, lenses, approvals, artifacts, requests, audit, notifications); P1's shell/layout/navigation files are consumed, not edited, except the nav-visibility wiring point P1's handoff names"
  - "apps/web panel application services (gateway DI wiring, scenario switcher exposure in dev/demo)"
  - "tests/e2e/panel/**"
handoff_required: true
```

## What to build

The operational panel doc 18 exists to deliver, minus the graph canvas: every dashboard
surface, running end to end on P3's fourteen worlds through the P2 seam, inside P1's Persian
RTL shell. This is the ticket where the (18 §12) acceptance criteria become demonstrable —
"the panel can be demonstrated end to end without a live machine system".

**Demoable when done** (the tracer bullet): select scenario 5 in the dev/demo switcher; land
role-aware on the overview showing one run waiting for approval; open the approvals inbox;
approve as the first human — quorum shows 1 of N distinct approvers; switch mock user and
approve again — the gate satisfies, the run's presentation advances, and the audit view shows
`approval.decided` events with Jalali timestamps and LTR-isolated IDs. Switch to scenario 6
and drive the request-changes flow to its loop-back presentation. Switch to scenario 13 and
watch every surface degrade honestly — stale marks, no fake liveness. Switch to scenario 14
and watch the same screens deny cleanly. All in Persian, all RTL, all mock-marked.

Constraints that shape the build:

- **The seam is absolute.** Surfaces call application services; services call the P2
  interfaces; nothing imports fixtures (18 §6–7, enforced by the P2 ESLint zone). Replacing
  MockMachineGateway with RealMachineGateway later must require no page-level redesign
  (18 §12) — any surface that would notice the swap is a defect in this ticket.
- **Approval semantics are presented, not reinterpreted** (ADR-0013 via ADR-0017 D4). One
  write path — submitApproval; four decisions; quorum counts distinct humans; a second
  decision by the same actor renders as the mock's rejection, not as a silent no-op.
- **State vocabulary is closed** (ADR-0012, ADR-0014, ADR-0015 via P1/P2). Surfaces compose
  the recorded names with reason codes into UI categories; they never mint states or events.
- **Honesty marking** (18 §12). Mock-origin receipts render the dev/demo marking; no toast,
  badge or status line implies a real machine did work.

## Blocked by

P1 (shell and component API), P2 (frozen DTOs and interfaces), P3 (scenarios and mock
adapters).

## Acceptance criteria

- [ ] **AC-P4.1 Overview** (04 §6.1; 18 §4.1): waiting actions, blocked/failed runs and the
  Machines 01–05 status summary render correctly across scenarios 3, 4, 5, 7, 9 and 10 via
  the gateway only. *Seam: scenario seam + component seam.*
- [ ] **AC-P4.2 Programs** — list and detail render scenario 1 (global empty state), 2
  (draft, ADR-0015 status), and 11 (completed with approved artifacts). *Seam: scenario
  seam.*
- [ ] **AC-P4.3 Weekly Lenses** — list and detail render scenario 12 including the derivation
  link to the approved parent Program/Concept Bible; statuses per ADR-0015. *Seam: scenario
  seam.*
- [ ] **AC-P4.4 Approve flow** (ADR-0013): on scenario 5, the inbox lists the pending gate;
  approving issues exactly one submitApproval call (asserted on a spy gateway at the seam,
  which is the public interface); quorum presentation advances 1-of-N → satisfied with two
  distinct mock humans; audit gains approval.decided. *Seam: component seam + scenario
  seam.*
- [ ] **AC-P4.5 Reject and request-changes flows**: REJECTED renders the terminal gate
  presentation; CHANGES_REQUESTED reproduces scenario 6's loop-back presentation with its
  change request visible. *Seam: scenario seam.*
- [ ] **AC-P4.6 ADR-0013 negatives rendered**: the same actor's second decision shows the
  mock's rejection as a Persian error; no approval affordance renders for a MACHINE actor
  fixture or the scenario 14 role. *Seam: component seam.*
- [ ] **AC-P4.7 Artifacts and sources**: artifact summaries/versions render for scenario 11;
  research sources, the unavailable source and its retrieval request render for scenario 8.
  *Seam: scenario seam.*
- [ ] **AC-P4.8 Requests, audit, notifications**: request views render ADR-0015 statuses; the
  audit view renders filtered events with recorded names, central Persian labels, Jalali
  timestamps and LTR-isolated IDs (09 §9, §12); notifications render from
  WorkspaceDirectory. *Seam: component seam.*
- [ ] **AC-P4.9 Every degraded state wired** (18 §4.1): per surface in scope, loading, empty,
  error, offline, permission-denied and degraded render through the P1 primitives — proven
  by component tests plus visual captures. *Seam: component seam + Seam E.*
- [ ] **AC-P4.10 Scenario 13 — disconnected**: every surface shows the degraded banner and
  stale-data marking with a retry affordance; nothing renders as live. *Seam: scenario seam
  + Seam E.*
- [ ] **AC-P4.11 Scenario 14 — unauthorized**: forbidden surfaces/actions render
  permission-denied with no data leakage; navigation visibility respects the role (04 §2);
  role-aware landing per (04 §7). *Seam: scenario seam + Seam E.*
- [ ] **AC-P4.12 Seam purity**: components import gateway-facing services only — the P2
  ESLint zone passes over the full surface tree, and swapping the injected mock for the
  in-test reference stub leaves every page-level test green (the 18 §12 no-redesign check).
  *Seam: Seam F + component seam.*
- [ ] **AC-P4.13 FA/RTL journey and honesty marking**: the demo journey (overview → program →
  approvals → audit) runs in Playwright in Persian RTL with axe WCAG 2.2 AA green in both
  themes; mock-origin receipts show the dev/demo marking and no UI text claims real machine
  execution (18 §12). *Seam: Seam E.*
- [ ] **AC-P4.14 Checks green** (16 §7): `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm test:e2e && pnpm build` pass. *Seam: Seam F.*
