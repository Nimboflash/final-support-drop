# Ticket P2 — Panel domain contracts and the MachineGateway seam

```yaml
ticket_id: "P2"
title: "packages/panel-domain and packages/machine-gateway: panel DTOs, Zod schemas, the verbatim MachineGateway interface and its adapter-contract suite"
release: "P"
owner_lane: "platform"
source_requirements:
  - "18 §11.2 — sequence step 2: define panel-facing DTOs, validation schemas and the MachineGateway interface"
  - "18 §6 — mock-first architecture: UI depends on application-level interfaces, never fixtures or live APIs; the MachineGateway interface is the required rule; the UI receives domain DTOs; React Flow objects never become the integration contract"
  - "18 §7.1 — the required mock-entity set this DTO layer must cover"
  - "18 §8 — graph display needs: machine stage nodes, HUMAN_APPROVAL_GATE as separate nodes, dependency and loop-back edges, attempts/timestamps/artifacts"
  - "18 §9 — provisional integration capabilities; every event payload carries schema version, event ID, occurred-at, correlation/run ID, workspace ID and originating machine/version; no silent imposition of panel choices on the machine build"
  - "18 §10 — repository boundary: panel-domain and machine-gateway packages"
  - "10 §9 event taxonomy (surviving recorded vocabulary, extended by ADR-0014); 06 §9.1 definition-version status vocabulary (DRAFT|VALIDATING|PUBLISHED|SUPERSEDED); 07 §2 node categories as the recorded node-kind vocabulary"
adr_constraints:
  - "ADR-0017 D3 — the workspace-integrity membership contract is amended here to thirteen-frozen-plus-three-panel; the placeholder-purity check joins it in this ticket; panel DTOs never enter packages/contracts, which stays a frozen inert placeholder"
  - "ADR-0017 D4 — the ADR-0012 state machine and ADR-0014 event taxonomy are the presentation vocabulary of the mocks and the provisional contract set of (18 §9); exact names, no parallel vocabularies"
  - "ADR-0012 — stage enum is exactly the 14 recorded states; run enum exactly DRAFT|QUEUED|RUNNING|WAITING_INPUT|WAITING_APPROVAL|PAUSED|SUCCEEDED|FAILED|CANCELLED; WAITING_FOR_INPUT carries reason codes including PROVIDER_CONFIGURATION_REQUIRED (D4)"
  - "ADR-0013 — ApprovalCommand carries decision APPROVED|CHANGES_REQUESTED|REJECTED|ESCALATED; approvals are never run commands (no gate verbs anywhere); N distinct HUMAN approvers is the semantics the DTOs must be able to present"
  - "ADR-0014 — event names are the 10 §9 taxonomy plus run.completed, run.failed, run.cancelled, run.paused, run.resumed, stage.skipped, stage.cancelled; heartbeat is transport-only and never an AuditEvent"
  - "ADR-0015 — Program, Weekly Lens and request status enums are exactly the recorded enumerations; contracts mirror them, never invent values"
  - "ADR-0017 D5 — no PostgreSQL/Redis/queues/providers; these packages are pure TypeScript + Zod with no framework or transport dependency"
in_scope:
  - "packages/panel-domain — Zod schemas, inferred DTO types and valid/invalid fixtures for: MachineSummary (Machines 01–05: id, machine number, name key, capability and connection/health presentation including a disconnected representation for scenario 13); WorkflowDefinition, WorkflowDefinitionVersion (06 §9.1 status vocabulary), WorkflowNodeDefinition (07 §2 node kinds; machine stage nodes and HUMAN_APPROVAL_GATE as a separate node kind per 18 §8), WorkflowEdgeDefinition (dependency and loop-back edges); WorkflowRunSummary, WorkflowRun, StageAttempt (attempt history with timing and safe diagnostics) — stage and run states exactly per ADR-0012, waiting reason codes per ADR-0012 D4; StartRunCommand, ApprovalCommand (ADR-0013 decision enum, acted-as role, reason, idempotency key), CommandReceipt (with an explicit mock/dev origin marker so mock actions can be labeled, 18 §12); ArtifactSummary with version info; AuditEvent (name enum = 10 §9 taxonomy plus the ADR-0014 additions; envelope fields per 18 §9); RunFilters, AuditFilters"
  - "packages/panel-domain — remaining (18 §7.1) entity coverage the P4 surfaces need: UserSummary with role; ProgramSummary/Program and WeeklyLensSummary/WeeklyLens (ADR-0015 status enums); ResearchSourceSummary and coverage-gap presentation; RetrievalRequestSummary (ADR-0015 request statuses); NotificationSummary"
  - "packages/machine-gateway — the (18 §6) MachineGateway interface VERBATIM as the required rule; a typed gateway error model (unknown id, machine system disconnected, unauthorized, timeout/stale) that scenarios 13 and 14 present through; a companion read-only PanelGateway interface for exactly the entity groups the owner named (ADR-0018 D1): Programs, Weekly Lenses, approval lists, requests, and notifications — recorded as a provisional panel-side contract per (18 §9), see the note in the body"
  - "packages/machine-gateway — the adapter-contract conformance suite, exported as a reusable test factory that any implementation (Mock in P3, Real later) must pass: schema-valid DTOs from every method, typed errors for unknown ids, filter behavior, command receipts with observable state changes on subsequent reads, determinism under an injected clock"
  - "Repo checks (ADR-0017 D3): amend tests/repo/workspace-integrity.test.ts to the thirteen-frozen-plus-three-panel membership; add tests/repo/placeholder-purity.test.ts asserting the frozen machine-side packages AND apps/worker remain inert 0.1 placeholders (ADR-0018 D3)"
  - "ESLint boundary-zone additions with bad fixtures (18 §7): apps/web components and packages/ui must not import @drop/mock-data; packages/panel-domain and packages/machine-gateway must not import React, Next.js or React Flow"
out_of_scope:
  - "Fixture content, the fourteen scenarios and MockMachineGateway (P3); UI components and surfaces (P1/P4)"
  - "packages/contracts — stays a frozen inert placeholder; the machine build inherits it (ADR-0017 D3)"
  - "RealMachineGateway, transport selection, HTTP/webhook/queue details (deferred, 18 §9); MSW or API-route interception wiring (added only if a P4 surface demonstrates the need, 18 §4.2)"
  - "Finalizing machine-owned schemas — the panel defines provisional contracts and contract tests only (18 §9 last paragraph)"
contracts_changed:
  - "Creates the panel contract freeze: packages/panel-domain v1 schemas and the two gateway interfaces. P3 and P4 open only after this ticket lands; parallel lanes never edit these files (15 §11 discipline carried into panel scope)."
database_changes: "None — panel scope has no database (ADR-0017 D5)."
permission_requirements: >
  None at runtime. Role and permission fields on DTOs are presentation data; panel-side RBAC
  checks (18 §4.2) arrive with the surfaces in P4 and are never a security boundary. Real
  enforcement belongs to the machine-build connection.
failure_states:
  - "Schema parse failures produce stable English error codes (Persian presentation is the UI's concern)"
  - "Unknown state names, event names outside the recorded taxonomy, and gate verbs presented as commands are rejected at parse time with asserted reasons"
  - "Gateway methods reject unknown ids and disconnected/unauthorized conditions with the typed error model, never undefined or silent nulls"
test_seams:
  - "Seam A: Zod contract tests on panel DTOs in packages/panel-domain — accepting and rejecting fixtures per schema, exact-membership enum tests, rejection reasons asserted"
  - "Adapter-contract seam: the exported MachineGateway/PanelGateway conformance suite, proven runnable (and failable) against a throwaway in-test stub"
  - "Seam F: workspace-integrity amendment, placeholder-purity check, ESLint zone bad fixtures, verbatim-interface static check"
acceptance_criteria: "AC-P2.1 through AC-P2.11 — see checkbox list in the body"
dependencies: ["P1"]
files_owned:
  - "packages/panel-domain/** (schemas, types, fixtures, Seam A tests)"
  - "packages/machine-gateway/** (interfaces, error model, adapter-contract suite; the mock adapter itself arrives in P3)"
  - "tests/repo/workspace-integrity.test.ts (ADR-0017 D3 amendment)"
  - "tests/repo/placeholder-purity.test.ts (new, plus its frozen-set manifest)"
  - "eslint.config.mjs — two new boundary zones only (P1 adds the logical-properties rule; append-only blocks, sequence merges if lanes land together)"
  - "tests/repo/boundary-fixtures-bad/** (new fixtures for the two zones)"
handoff_required: true
```

## What to build

The panel contract freeze — the P-series analogue of ticket 0.3's role, at the seam doc 18
actually requires. Everything the UI will ever know about machines, workflows, runs,
approvals, artifacts and audit is typed here; everything the UI can ever ask for goes through
the interfaces defined here (18 §6). P3's mocks and any future RealMachineGateway both submit
to the same conformance suite, which is what makes "replace the mock without page-level
redesign" (18 §12) testable instead of aspirational.

**Demoable when done:** `pnpm test` runs the Seam A fixture suite and the conformance suite's
self-check green; a reviewer can open one schema module and see the exact ADR-0012 state
names, and open one negative fixture and see APPROVE_GATE rejected as a command name.

Key mechanics:

1. **Presentation vocabulary, not new vocabulary** (ADR-0017 D4). The stage enum, run enum,
   waiting reason codes, decision enum and event names are transcriptions of ADR-0012,
   ADR-0013, ADR-0014 and 10 §9 — written as constants from those documents, never derived.
   Exact-membership tests pin them (tautology ban, testing-strategy §2.2).
2. **The verbatim rule** (18 §6). `MachineGateway` is committed character-for-character as
   doc 18 prints it; a Seam F static check compares the exported declaration block against a
   committed copy of the (18 §6) text so drift is a red check, not a review catch. This is
   that reference text, reproduced from doc 18 §6 exactly:

   ```ts
   export interface MachineGateway {
     listMachines(): Promise<MachineSummary[]>;
     listWorkflowDefinitions(): Promise<WorkflowDefinition[]>;
     getWorkflowDefinition(id: string): Promise<WorkflowDefinition>;
     listRuns(filters?: RunFilters): Promise<WorkflowRunSummary[]>;
     getRun(id: string): Promise<WorkflowRun>;
     startRun(command: StartRunCommand): Promise<CommandReceipt>;
     pauseRun(runId: string): Promise<CommandReceipt>;
     retryStage(runId: string, stageId: string): Promise<CommandReceipt>;
     submitApproval(command: ApprovalCommand): Promise<CommandReceipt>;
     listArtifacts(runId: string): Promise<ArtifactSummary[]>;
     listAuditEvents(filters?: AuditFilters): Promise<AuditEvent[]>;
   }
   ```
3. **Recorded addition — `PanelGateway`** (ADR-0018 D1). The (18 §7.1) entity set exceeds
   MachineGateway's method set, and (18 §6) requires all UI data to flow through
   application-level interfaces. This ticket therefore defines a companion read-only
   `PanelGateway` interface beside the verbatim MachineGateway, covering exactly the owner's
   five entity groups: **Programs, Weekly Lenses, approval lists, requests, and
   notifications**. MachineGateway gains no members. Users/roles remain a session concern;
   research sources and coverage gaps keep their P3 fixtures, with their transport contract
   recorded as an open P8 coordination decision. PanelGateway is a provisional panel-side
   contract in the (18 §9) sense and is reported in the handoff as an open coordination
   point with the machine build; it must never be silently imposed on it.
4. **Event mapping note** (18 §9; ADR-0017 D4). Doc 18 §9 sketches event families
   (`workflow.run.created`, `approval.resolved`, ...); ADR-0017 D4 rules that the recorded
   10 §9 + ADR-0014 taxonomy is the presentation vocabulary, so the AuditEvent enum uses those
   recorded names (`run.started`, `approval.decided`, `artifact.version.created`, ...).
   The name-level mapping between the two lists is documented in panel-domain and flagged in
   the handoff as an unresolved contract decision for machine-build coordination. `heartbeat`
   is transport-only (ADR-0014) and is excluded from AuditEvent.
5. **Frozen-set reconciliation (recorded, not silent).** ADR-0017 D3 freezes the 0.1
   packages, while ADR-0017 D2 supersedes 0.12 → P1 and 0.13 → P4/P5, whose scopes own
   packages/ui and packages/workflow-ui — both named in the (18 §10) panel boundary. The
   placeholder-purity check therefore enforces inertness for the eleven machine-side packages and apps/worker (ADR-0018 D3)
   — core, studio, contracts, db, pipeline, ai-gateway, retrieval, storage, config,
   observability, testing — for the whole panel scope, and treats packages/ui (activated by
   P1) and packages/workflow-ui (activated by the workflow-surface ticket) as panel packages.
   The check is data-driven from a committed frozen-set manifest citing this note.
6. **Conformance suite as frozen red-phase work** (testing-strategy §1.2). The suite ships as
   an exported factory; its own runnability is proven against a deliberately minimal in-test
   stub (not exported, not the P3 mock), including one broken-stub fixture proving the suite
   can fail. P3's MockMachineGateway must pass it unmodified.

## Blocked by

None — 0.1 is done and committed. Runs in parallel with P1. P3 and P4 must not start until
this freeze lands.

## Acceptance criteria

- [ ] **AC-P2.1 Fixture coverage** — every exported panel-domain schema has at least one
  accepting and one rejecting fixture, with the rejection reason asserted and each rejection
  fixture citing the rule it violates. *Seam: Seam A.*
- [ ] **AC-P2.2 Exact state vocabulary** (ADR-0012; ADR-0017 D4) — exact-membership tests: the
  stage enum equals the 14 recorded states and the run enum equals the 9 recorded states; no
  additions, omissions or renames; the waiting reason-code set includes
  PROVIDER_CONFIGURATION_REQUIRED. *Seam: Seam A.*
- [ ] **AC-P2.3 Exact event vocabulary** (10 §9; ADR-0014) — the AuditEvent name enum equals
  the 10 §9 taxonomy plus the seven ADR-0014 additions; heartbeat is rejected as an
  AuditEvent name; the envelope requires the (18 §9) fields (schema version, event ID,
  occurred-at, correlation/run ID, workspace ID, originating machine/version where
  applicable). *Seam: Seam A.*
- [ ] **AC-P2.4 Approval shape** (ADR-0013) — ApprovalCommand accepts exactly
  APPROVED|CHANGES_REQUESTED|REJECTED|ESCALATED with acted-as role, reason and idempotency
  key; negative fixtures prove APPROVE_GATE/REQUEST_CHANGES/ESCALATE_GATE are rejected as
  command names anywhere in the command surface. *Seam: Seam A.*
- [ ] **AC-P2.5 ADR-0015 enums mirrored** — Program, WeeklyLens and RetrievalRequest status
  enums pass exact-membership tests against fixtures transcribed from ADR-0015; a status
  outside the enum rejects. *Seam: Seam A.*
- [ ] **AC-P2.6 Verbatim interface** (18 §6) — the exported MachineGateway declaration matches
  the committed (18 §6) text character-for-character via a static check; PanelGateway
  is a separate interface (ADR-0018 D1) and MachineGateway gains no extra members. *Seam: Seam F.*
- [ ] **AC-P2.7 Conformance suite** — the adapter-contract factory is exported from
  @drop/machine-gateway, runs green against the in-test reference stub, and fails against the
  committed broken-stub fixture for the specified reason. *Seam: adapter-contract seam.*
- [ ] **AC-P2.8 Workspace membership amended** (ADR-0017 D3) — the workspace-integrity test
  asserts exactly sixteen packages (the thirteen of 16 §3 plus panel-domain, machine-gateway,
  mock-data), strict TypeScript and pinned versions included for the new three. *Seam:
  Seam F.*
- [ ] **AC-P2.9 Placeholder purity** (ADR-0017 D3) — the purity check proves each of the
  eleven frozen machine-side packages is still an inert 0.1 placeholder (no new source
  modules, no new dependencies, placeholder export unchanged); a mutation fixture proves the
  check fires. *Seam: Seam F.*
- [ ] **AC-P2.10 Boundary zones** (18 §6, §7) — ESLint fails the committed bad fixtures:
  a component importing @drop/mock-data, and panel-domain/machine-gateway importing
  React/Next/React Flow; the real tree passes. *Seam: Seam F.*
- [ ] **AC-P2.11 Checks green** (16 §7) — `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm build` pass; `pnpm test:db` and `pnpm test:e2e` remain green no-ops for this ticket.
  *Seam: Seam F.*
