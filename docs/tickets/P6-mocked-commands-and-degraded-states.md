```yaml
ticket_id: "P6"
title: "Mocked commands and degraded states: run controls, approvals, synchronize behaviour, and audit visibility end-to-end on mocks"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "18 §7.3 mock command behaviour (start, pause, retry, approve/reject/request-changes, refresh/synchronize; dev/demo marking; never imply real machine work); 18 §11 step 6; 18 §7 mock requirements (deterministic, schema-validated, scenario-switchable, isolated from production configuration)"
  - "18 §4.1 approval inbox and approval/rejection/request-change interactions; 18 §6 command surface of the MachineGateway interface (startRun, pauseRun, retryStage, submitApproval); 18 §12 acceptance items on commands, audit entries, and truthful UI state"
  - "04 §6 approvals inbox anatomy (surviving read-side reference); 08 §13 stale/reconnecting presentation as UX reference only — the SSE transport itself is deferred with ticket 0.16 (ADR-0017 D2)"
adr_constraints:
  - "ADR-0013 (presentation, ADR-0017 D4): every approval affordance — gate node CTA and inbox — submits through the single submitApproval path; no gate verb is ever presented or transported as a run command; decisions carry APPROVED | CHANGES_REQUESTED | REJECTED | ESCALATED; the mock policy enforces N distinct HUMAN approvers, one final decision per actor per request, and labelled self-approval"
  - "ADR-0012: mocked command effects move state only along the D1 transition table; run status is recomputed per the D3 aggregation rule; retry preserves prior attempt history (FAILED_RETRYABLE → QUEUED within budget; FAILED_FINAL refuses retry)"
  - "ADR-0014: audit/event entries surfaced after commands use the ADR-0014 event names as presentation vocabulary (ADR-0017 D4); no parallel event names are invented"
  - "ADR-0017 D5: no real execution, no providers, no queues, no database; no UI state may claim a real machine operation occurred (18 §12)"
in_scope:
  - "Start run from run/list views: creates or reveals a mocked run and moves it through a controlled scenario (18 §7.3)"
  - "Pause run: mock state updated per ADR-0012, audit event appended and visible"
  - "Retry stage: new mocked attempt created, previous attempt history preserved and inspectable (18 §7.3); refusal with a stable error for non-retryable failures (scenario 10)"
  - "Approve / reject / request changes / escalate from gate nodes (P5) and from the approval inbox (P4), all routed through the single submitApproval path; decision outcomes route the mock run per the ADR-0012 WAITING_FOR_APPROVAL rows (approved edge, changes-requested loop-back, terminal rejection)"
  - "Refresh/synchronize with deterministic simulated success, latency, timeout, disconnected, and stale-data cases (18 §7.3); stale/reconnecting/degraded indicators in the UI"
  - "Optimistic-update reconciliation: optimistic UI state reconciled against the gateway receipt/response; rollback plus visible error on failure"
  - "Audit entries visible in the audit surface after every command, named per the ADR-0014 taxonomy"
  - "Scenario switcher exposed in development/demo configuration only, clearly marked as mock control (18 §7.3)"
  - "Panel-service permission checks on every command; scenario 14 unauthorized path (18 §4.2)"
out_of_scope:
  - "Commands outside the 18 §6 gateway surface (RESUME_RUN, CANCEL_RUN, SUBMIT_INPUT, SKIP_STAGE, CREATE_RERUN as interactive controls): the states they produce stay reachable through scenario fixtures; whether the gateway interface grows these methods is recorded as an open contract decision for P8 — not decided here"
  - "Any real transport, SSE, polling of a live system, or autonomous retry/scheduling (18 §5)"
  - "Approval policy persistence or enforcement beyond the mock's own state (the ADR-0013 semantics are what the panel presents; the machine build owns real enforcement)"
  - "New surfaces — this ticket wires interactions into P4/P5 surfaces, it does not add pages"
contracts_changed:
  - "None. Commands use the P2 command/receipt DTOs (StartRunCommand, ApprovalCommand, CommandReceipt) unchanged; shape gaps discovered while wiring are logged for P8's open-decisions list, not silently patched"
database_changes: "None — panel scope has no database (ADR-0017 D5)"
permission_requirements:
  - "Every command passes a panel application-service permission check against the mocked session role before reaching the gateway; hiding a button is never the enforcement (18 §4.2)"
  - "Approval actions additionally respect the mock approval policy: HUMAN actors only, distinct-approver counting, self-approval mode labelling (ADR-0013 presented through mocks)"
failure_states:
  - "Simulated timeout: command surfaces a retryable error state; no phantom success"
  - "Simulated disconnect (scenario 13): degraded banner, commands disabled or queued-refused explicitly, stale data visibly flagged — never presented as fresh"
  - "Stale-data case: synchronize marks the view stale and offers refresh; optimistic state never overwrites fresher mock truth"
  - "Failed command: optimistic update rolls back; the error names the failed command and its stable reason code"
  - "Unauthorized command (scenario 14): permission-denied presentation without data leakage"
test_seams:
  - "Adapter-contract seam: command methods of MockMachineGateway — deterministic transitions per ADR-0012, receipts, audit append, approval distinctness — asserted by the conformance suite any future adapter must also pass"
  - "Component seam: command bars, gate CTA, inbox actions, degraded-state banners, optimistic rollback"
  - "Scenario seam: the 18 §7.3 behaviours plus scenarios 9, 10, 13, 14 reproduced by test"
  - "Seam A: outgoing command payloads validate against the P2 Zod schemas"
  - "Seam F: scenario switcher absent from production configuration; boundary and placeholder-purity checks green"
acceptance_criteria:
  - "See checkbox list in the body; each maps to a named seam"
dependencies: ["P4", "P5"]
files_owned:
  - "Command/interaction modules in apps/web (run controls, inbox actions, synchronize, optimistic reconciliation)"
  - "Gate-node CTA wiring in packages/workflow-ui (extends P5 files; P5 is complete before this ticket starts)"
  - "Command behaviour and scenario transitions in packages/machine-gateway and packages/mock-data (extends P2/P3 files under the frontier rule — no parallel lane touches them)"
handoff_required: true
```

# Ticket P6 — Mocked commands and degraded states

## What to build

Every panel action becomes functional against the mocks, end-to-end, without a single real
machine operation (18 §7.3). Tracer-bullet: from the run list a demo operator starts a run and
watches it move through its controlled scenario; pauses it and sees the audit entry appear;
retries a failed stage and sees a fresh attempt stacked on the preserved history; opens the
gate node from P5's graph or the inbox from P4 and approves — the decision travels through the
one `submitApproval` path, the gate routes the approved edge, and the audit surface shows the
event. Then the degraded half: synchronize under simulated latency, timeout, disconnect, and
stale data, with truthful indicators and optimistic updates that reconcile or roll back.

**Demoable when done:** the full 18 §7.3 command tour on scenarios 4, 5, 6, 9, plus the
degraded tour on 13 and the unauthorized path on 14 — switched live via the dev/demo scenario
switcher.

Constraints that shape the build:

- **Single approval path (ADR-0013, presented through mocks):** the gate CTA and the inbox
  both call `MachineGateway.submitApproval` and nothing else. No `APPROVE_GATE`-style verb
  exists as a run command anywhere in UI code, DTOs, or mock behaviour. The mock policy
  counts N distinct HUMAN approvers, records one final decision per actor per request, and
  labels self-approval per the policy mode.
- **Transitions are ADR-0012's, not new ones (ADR-0017 D4):** the mock applies only D1-table
  transitions and recomputes run status by the D3 aggregation rule. Retry respects the
  retryable/final distinction.
- **Audit is part of the demo truth:** every accepted command appends an audit entry the user
  can see, named with the ADR-0014 vocabulary (e.g. `run.paused`, `stage.skipped`,
  `approval.requested`).
- **Honesty of the mock (18 §7.3, §12):** mock controls are visibly marked in dev/demo
  configuration; no UI state ever implies real machine work occurred; degraded simulations
  are deterministic and reproducible, never random in tests or screenshots.

## Blocked by

P4 (dashboard, inbox, artifacts, audit surfaces), P5 (graph surfaces and gate nodes). P2/P3
are transitively complete; this ticket extends their packages under the one-ticket-at-a-time
frontier rule.

## Acceptance criteria

- [ ] Start run creates or reveals a mocked run that progresses through its controlled
      scenario; the receipt reconciles the optimistic list entry (18 §7.3) — adapter-contract
      seam + scenario seam.
- [ ] Pause updates stage/run state exactly per the ADR-0012 D1 rows and D3 aggregation, and
      appends an audit event visible in the audit surface — adapter-contract seam.
- [ ] Retry on a `FAILED_RETRYABLE` stage creates a new attempt with prior history preserved
      and inspectable in P5's inspector (scenario 9); retry on `FAILED_FINAL` is refused with
      a stable error code (scenario 10) — adapter-contract seam + scenario seam.
- [ ] All approval affordances submit exclusively through `submitApproval`; component tests
      assert no other mutation is issued from gate CTA or inbox; decisions carry
      `APPROVED | CHANGES_REQUESTED | REJECTED | ESCALATED` (ADR-0013) — component seam +
      Seam A.
- [ ] Mock approval policy: a gate with `minimum_approvals: 2` is not satisfied by one actor;
      a second decision by the same actor on the same request is rejected; self-approval is
      labelled per policy mode (ADR-0013 D3/D5 presented) — adapter-contract seam.
- [ ] Decision routing: APPROVED continues the run along the approved edge; CHANGES_REQUESTED
      routes the loop-back (scenario 6); REJECTED under a terminal gate policy yields
      `FAILED_FINAL` per ADR-0012 — scenario seam.
- [ ] Refresh/synchronize deterministically simulates success, latency, timeout,
      disconnected, and stale-data; each shows its distinct indicator; disconnected
      (scenario 13) disables or explicitly refuses commands and never fakes freshness —
      component seam + scenario seam.
- [ ] Optimistic updates reconcile against gateway responses; failed commands roll back with
      a visible error naming the command and reason code; no UI state claims real machine
      work occurred (18 §12) — component seam.
- [ ] After every accepted command an audit entry is visible via `listAuditEvents`, named
      with the ADR-0014 taxonomy — scenario seam.
- [ ] Scenario switcher: present and clearly marked in dev/demo configuration; absent from
      production configuration (18 §7) — Seam F + component seam.
- [ ] Unauthorized command (scenario 14) is blocked by the panel application-service check —
      proven by invoking the service directly, not only by a hidden button — component seam +
      scenario seam.
- [ ] Outgoing command payloads validate against the P2 Zod schemas — Seam A.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; boundary and
      placeholder-purity checks green — Seam F.
