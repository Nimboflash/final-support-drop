# Scope Correction — Panel First, Machines Connected Later

**Status:** Authoritative scope correction  
**Applies to:** The current DROP Studio OS dashboard and workflow-display build  
**Implementation mode:** Frontend-first with realistic mock data  

## 1. Purpose

This document corrects the implementation scope of the existing DROP Studio OS build package.

The current delivery is **not responsible for building Machines 01–05 or their internal AI behavior**. Those machines are being designed and implemented separately. This delivery must build the operational dashboard/control panel, its workflow graph, and only the minimum supporting backend required for the panel to function.

Until the real machines are ready, every machine-dependent capability must operate through deterministic mocks and typed integration contracts. Later, the mock adapter will be replaced by a real machine adapter without rebuilding the user interface.

## 2. Authority and precedence

This file overrides any instruction in the existing implementation package that asks the current builder to implement:

- Machine 01–05 business logic;
- machine prompts, agent chains, research engines, or generation logic;
- a production machine executor or orchestration worker;
- direct AI-provider integrations for machine execution;
- production queues, schedulers, or infrastructure needed only to run the machines.

Any such work described elsewhere is **deferred external-machine work**, not part of the current build.

The existing documents remain valid for product language, UI requirements, domain concepts, workflow states, RBAC, approvals, audit behavior, and future integration contracts unless they conflict with this scope correction.

## 3. Current build objective

Build a production-quality operational panel that allows the team to:

- view Programs and Weekly Lenses;
- view workflow definitions and machine stages;
- inspect a workflow as a graph;
- inspect mocked and, later, real execution status;
- review stage inputs and outputs;
- view artifacts, sources, validation results, and errors;
- approve, reject, or request changes at human gates;
- view requests, activity history, and audit information;
- understand blocked, waiting, running, completed, and failed states;
- operate the interface in Persian-first RTL while retaining English technical identifiers.

Use:

- [shadcn/ui](https://ui.shadcn.com/) for the panel, application shell, forms, tables, dialogs, sheets, menus, and design-system foundation;
- [React Flow AI Workflow Editor](https://reactflow.dev/ui/templates/ai-workflow-editor) as the interaction and layout reference for the workflow surface;
- `@xyflow/react` with DROP-owned nodes and edges when the React Flow Pro template source is not licensed.

The workflow graph is an operational visualization and control surface. It does not contain or execute machine intelligence.

## 4. In scope now

### 4.1 Frontend

- Application shell, navigation, responsive layout, and RTL behavior.
- Dashboard overview and status summaries.
- Program and Weekly Lens lists and detail views.
- Workflow definition list and workflow graph display.
- Run detail view with stage status, timing, attempts, and logs/diagnostics safe for users.
- Node inspector for mocked inputs, outputs, validation, dependencies, and artifacts.
- Approval inbox and approval/rejection/request-change interactions.
- Artifact, research-source, request, and audit views required by the approved information architecture.
- Loading, empty, error, offline, permission-denied, and degraded-mode states.
- Accessibility, keyboard navigation, responsive behavior, and visual QA.

### 4.2 Minimum supporting backend

Build backend code only when it is necessary to support and validate the panel. This may include:

- typed mock API routes or a local mock server;
- session/authentication scaffolding if required by the chosen application structure;
- RBAC checks for panel actions;
- validation of panel commands and fixture payloads;
- an adapter interface that isolates mock data from the UI;
- optional lightweight persistence for panel-only drafts or demonstrations.

Do not build production machine execution infrastructure. Do not add PostgreSQL, Redis, queues, workers, provider gateways, or deployment services solely because they may be needed by the future machines. Add them only if separately approved for a demonstrated current panel requirement.

## 5. Explicitly out of scope

- Implementing Machines 01, 02, 03, 04, or 05.
- Implementing specialized output sub-agents.
- Writing final machine prompts or reasoning policies.
- Running live research, generation, validation, curation, or publishing pipelines.
- Calling Claude, OpenAI, or another AI provider from the panel build.
- Implementing autonomous retries, scheduling, checkpoint recovery, or machine orchestration.
- Building the internal database or infrastructure owned by the separate machine system.
- Treating React Flow nodes as executable machine code.
- Duplicating machine rules inside frontend components or panel API routes.
- Making the panel the source of truth for machine execution.

## 6. Mock-first architecture

All UI code must depend on application-level interfaces rather than fixture files or live machine APIs directly.

```text
Dashboard and React Flow UI
        ↓
Panel application services
        ↓
MachineGateway interface
        ↓
MockMachineGateway now
RealMachineGateway later
```

Required rule:

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

The UI must receive domain DTOs from this interface. React Flow node and edge objects must be created by a dedicated canvas adapter and must never become the external integration contract.

## 7. Mock implementation requirements

Use a dedicated `MockMachineGateway`, backed by typed fixtures. MSW, framework-local API routes, or an equivalent request-interception layer may be used, but components must never import fixture JSON directly.

Mocks must be:

- deterministic and reproducible;
- schema-validated;
- realistic enough for visual, interaction, and acceptance testing;
- switchable by scenario;
- isolated from production configuration;
- replaceable through dependency injection or adapter configuration.

Use stable IDs, fixed timestamps or a controllable clock, and seeded values. Do not use uncontrolled random data in screenshots or tests.

### 7.1 Required mock entities

Provide fixtures for:

- users and all relevant roles;
- Programs and Weekly Lenses;
- machine summaries for Machines 01–05;
- workflow definitions, versions, nodes, edges, and human gates;
- workflow runs and stage attempts;
- stage inputs, outputs, validation results, and safe diagnostics;
- approvals and change requests;
- artifacts and artifact versions;
- research sources, coverage gaps, and human retrieval requests;
- notifications and audit events.

### 7.2 Required workflow scenarios

At minimum, include:

1. No Programs yet.
2. Draft Program with no run.
3. Ready workflow waiting to start.
4. Active run with one machine currently running.
5. Run waiting for human approval.
6. Approval rejected with a change request and loop-back edge.
7. Run blocked by missing input.
8. Run blocked by unavailable external source.
9. Partial failure with a retryable stage.
10. Non-retryable machine failure.
11. Completed Program with approved artifacts.
12. Weekly Lens derived from an approved Program/Concept Bible.
13. Machine system disconnected or unavailable.
14. Unauthorized action for the current role.

### 7.3 Mock command behavior

Panel actions must appear functional without executing real machines:

- **Start run:** create or reveal a mocked run and move it through a controlled scenario.
- **Pause run:** update the mock state and append an audit event.
- **Retry stage:** create a new mocked attempt while preserving previous attempt history.
- **Approve/reject/request changes:** update the mock approval state and append an audit event.
- **Refresh/synchronize:** simulate success, latency, timeout, disconnected, and stale-data cases.

Mock controls must be clearly marked in development/demo configuration. They must never imply that real machine work occurred.

## 8. Workflow graph requirements

The React Flow surface must display:

- Machines 01–05 as stage nodes;
- human approval gates as separate nodes;
- dependencies and loop-back paths as edges;
- current stage and overall run status;
- blocked, queued, running, waiting, approved, rejected, failed, and completed states;
- attempts, timestamps, and available artifacts in the inspector;
- definition mode separately from run-inspection mode.

The initial implementation uses mocked workflow definitions and run snapshots. It must not execute code stored in nodes, allow arbitrary JavaScript, or store provider prompts or secrets in the graph.

## 9. Future connection to the real machines

The separately developed machine system will later connect through a `RealMachineGateway`. The final transport may use versioned HTTP APIs, webhooks/events, queues, or a combination, but transport details must remain behind the adapter.

Prepare for these provisional integration capabilities:

- machine and capability discovery;
- workflow-definition retrieval;
- run creation and command submission;
- run and stage status retrieval;
- artifact metadata and secure artifact access;
- approval request and approval-result exchange;
- event subscription or polling fallback;
- health, version, and compatibility reporting.

Expected event families include:

- `workflow.run.created`
- `workflow.run.started`
- `workflow.stage.started`
- `workflow.stage.progressed`
- `workflow.stage.blocked`
- `workflow.stage.failed`
- `workflow.stage.completed`
- `approval.requested`
- `approval.resolved`
- `artifact.created`
- `workflow.run.completed`
- `workflow.run.failed`

Every payload must include a schema version, event ID, occurred-at timestamp, correlation/run ID, workspace ID, and originating machine/version where applicable.

Do not finalize the live transport or machine-owned schemas without coordination with the separate machine build. The panel may define provisional contracts and contract tests, but it must not silently impose internal implementation choices on the machine system.

## 10. Recommended current repository boundary

```text
apps/
  web/                       # Dashboard/control-panel application

packages/
  ui/                        # shadcn/ui components and DROP tokens
  workflow-ui/               # React Flow nodes, edges, layout and inspectors
  panel-domain/              # Panel-facing domain DTOs and validation schemas
  machine-gateway/           # Interface plus mock adapter
  mock-data/                 # Typed deterministic scenarios and fixtures
```

Do not create machine implementation packages in this repository during the current scope.

## 11. Current build sequence

1. Establish the panel shell, design tokens, shadcn/ui, RTL, routing, and accessibility baseline.
2. Define panel-facing DTOs, validation schemas, and the `MachineGateway` interface.
3. Build deterministic mock scenarios and `MockMachineGateway`.
4. Build the dashboard overview, Programs, Lenses, approvals, artifacts, requests, and audit surfaces.
5. Build the React Flow definition and run-inspection surfaces using mock data.
6. Implement mocked commands and state transitions for demonstrations and tests.
7. Add component, visual, accessibility, scenario, and adapter contract tests.
8. Document the future `RealMachineGateway` connection points.

Do not start machine implementation after step 8. Stop and hand off the completed panel for review.

## 12. Acceptance criteria

The current build is complete when:

- the panel can be demonstrated end to end without a live machine system;
- all required screens use realistic, typed mock data;
- all required workflow scenarios can be selected and reproduced;
- React Flow correctly displays definition and execution snapshots;
- approvals and other commands produce clear mocked state changes and audit entries;
- components do not import mocks directly;
- replacing `MockMachineGateway` with `RealMachineGateway` requires no page-level redesign;
- no Machine 01–05 intelligence, prompt, provider call, or execution worker has been implemented;
- no UI state falsely claims that a real machine operation occurred;
- the future integration boundary and unresolved contract decisions are documented.

## 13. Instruction to Claude

Build only the dashboard/control-panel frontend and the minimum backend required to support it. Use shadcn/ui and React Flow as specified. Use typed, deterministic mocks for all Machines 01–05, workflow runs, outputs, errors, approvals, artifacts, and audit activity.

Do not build the machines. Do not call live AI providers. Do not implement production machine orchestration. The machines are being built separately and will be connected later through the `MachineGateway` adapter and versioned integration contracts.

If another document conflicts with this boundary, follow this document and report the conflict before proceeding.
