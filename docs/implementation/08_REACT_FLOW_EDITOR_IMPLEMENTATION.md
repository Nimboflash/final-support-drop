# React Flow Editor Implementation

## 1. Foundation

Use `@xyflow/react` and DROP-owned custom components. The referenced AI Workflow Editor is the
interaction/design starting point, not the domain model.

License gate:

- If `REACT_FLOW_PRO_LICENSE_CONFIRMED=false`, use React Flow core, official MIT examples and
  locally authored shadcn components only.
- If confirmed, authorized Pro source may accelerate the shell, but all domain semantics still
  follow this pack.

## 2. Editor architecture

```text
WorkflowEditorPage
└── ReactFlowProvider
    ├── WorkflowCommandBar
    ├── NodeLibraryPanel
    ├── WorkflowCanvas
    │   ├── MachineGroupNode
    │   ├── StageNode variants
    │   ├── TypedEdge variants
    │   ├── Controls / MiniMap / Background
    │   └── Search and validation overlays
    ├── WorkflowInspector
    └── ValidationAndEventConsole
```

Keep React Flow-specific types inside `packages/workflow-ui`. Convert domain DTOs to canvas
models through explicit adapters.

## 3. Modes and capability

| Mode | Behavior | Typical authority |
|---|---|---|
| Template read | Inspect published definition/version | Viewer with workflow read |
| Template edit | Edit one draft version | Technical Maintainer with scoped edit capability |
| Run execution | Read live/historical state; issue permitted commands | Project roles by command policy |
| Run compare | Diff two runs/versions | Release 6 |

Dragging a node in execution mode updates only personal layout preference when allowed. It never
changes workflow semantics or the run.

## 4. DROP custom node types

### 4.1 Machine group

Displays machine number/title, aggregate status, completion ratio, active stage, cost and
blocked count. It groups stage nodes using React Flow parent/child relationships.

### 4.2 Automated stage

Shows title, executor/model profile, state, attempt, input/output artifact counts, duration and
budget usage.

### 4.3 Validation gate

Shows validator count, last result, blocking findings and fail-closed status.

### 4.4 Human approval gate

Shows required role/capability, assignee, self-approval policy, subject version and current
decision. The CTA opens the standard approval sheet; it never approves directly in client state.

### 4.5 Condition

Shows a human-readable condition summary and typed true/false ports. The full expression is
visible in the inspector and validated server-side.

### 4.6 Specialized agent

Shows agent type/version, supported output, job status, artifact version and validation state.

### 4.7 Human request

Shows request type, assignee, due date, readiness, blocker and expected return artifact.

### 4.8 Start/end

Compact canonical entry and terminal nodes. Terminal nodes distinguish success, final failure,
cancellation and handoff.

## 5. Node visual states

Use the persisted state mapping:

| Persisted state | Visual treatment |
|---|---|
| `DRAFT` | Neutral dashed border, draft icon |
| `READY|QUEUED` | Neutral solid border, queued icon |
| `RUNNING` | Active outline and restrained animated progress/edge |
| `WAITING_FOR_*` | Attention outline, human/dependency/input icon and reason |
| `PAUSED` | Muted outline and pause icon |
| `SUCCEEDED` | Confirmed icon and completed timestamp |
| `FAILED_RETRYABLE` | Error treatment plus allowed retry action |
| `FAILED_FINAL` | Strong error treatment and diagnostic reference |
| `CANCELLED|SKIPPED|SUPERSEDED` | Muted treatment with explicit label |

Color is never the only indicator.

## 6. Edge types

- Default dependency edge.
- Conditional edge with label.
- Approval decision edge.
- Retry/revision loop edge.
- Failure edge.
- Optional lineage edge overlay.

Animate only the active `RUNNING` transition. Respect `prefers-reduced-motion` and the Brand DNA
rule that motion reveals relationship/state rather than decorating inactivity.

## 7. Default layout

- Use ELK behind `LayoutEngine` interface.
- Default direction: top-to-bottom.
- Machines are labeled groups arranged in execution order.
- Use fixed-order ports and multiple handles to reduce crossings.
- Allow collapse/expand of machine groups and subflows.
- Store semantic graph and layout separately.
- `Auto layout` creates a new layout draft, not a semantic version.

## 8. Canvas state split

### Zustand - ephemeral editor state

```text
selectedNodeIds
selectedEdgeIds
viewport
panelVisibility
draftNodePositions
unsavedSemanticMutations
undoStack
redoStack
validationOverlay
```

### TanStack Query - server state

```text
workflow definition/version
node/edge semantic DTOs
workflow validation results
run/stage state
run events
approval and artifact summaries
```

### PostgreSQL - durable authority

All definitions, versions, layout snapshots, runs, events, attempts, approvals and commands.

## 9. Save and concurrency

- Debounce layout-only saves separately from semantic draft saves.
- Semantic save sends `expectedRowVersion` and idempotency key.
- On conflict, stop auto-save and present server/current versus local diff.
- Never last-write-wins over another editor's semantic change.
- Undo/redo operates on unsaved local draft commands. After save, a new inverse command is a new
  server mutation, not history rewriting.
- V0 does not provide simultaneous CRDT editing.

## 10. Inspector behavior

Selecting a node opens a left-side shadcn sheet or persistent resizable inspector with tabs:

```text
Overview
Inputs
Outputs
Configuration
Rules and gates
Attempts
Artifacts
Comments
Audit
```

Template mode exposes editable fields allowed by schema. Execution mode is read-only except for
explicit server commands permitted to the actor.

## 11. Node library behavior

The right-side node library is registry-driven. It lists only active node/executor types the
current actor may place. Drag/drop creates a draft semantic node with a generated stable key,
then opens required configuration. An incomplete node remains invalid and blocks publish.

Do not allow arbitrary JavaScript, provider prompts or credentials inside canvas node config.

## 12. Search and navigation

- Search by stage title, node key, machine, status, artifact, owner and error code.
- Keyboard shortcut opens command/search palette.
- Search result focuses and announces the node.
- Breadcrumb shows Program/Lens -> run/definition -> version.
- `Fit active`, `Fit machine` and `Reset layout` controls.
- MiniMap is optional on small graphs and collapsible.

## 13. Live execution updates

1. Load a complete run snapshot from the API.
2. Subscribe to SSE from `afterSequence`.
3. Apply ordered events to query cache.
4. Detect sequence gap and refetch snapshot.
5. Poll as fallback when SSE disconnects.
6. Display stale/reconnecting state; never imply live accuracy while disconnected.

## 14. Performance rules

- Memoize node and edge component maps.
- Select narrow Zustand slices; never subscribe the entire canvas to selection changes.
- Collapse machine groups and virtualize non-canvas side lists.
- Artifact lineage overlay is off by default.
- Keep raw research evidence out of node `data`; pass summary IDs/counts.
- Define a tested V0 target of at least 250 visible nodes and 400 edges without unusable input
  latency on the supported desktop baseline.

## 15. Accessibility

- Keep nodes and edges keyboard-focusable.
- Persian aria labels state node type, title, state and available action.
- Enter/Space selects; Escape clears; documented shortcuts avoid browser conflicts.
- Every drag/drop operation has an add/configure form alternative.
- Every edge connection has a source/target form alternative.
- Focus moves predictably when sheets open/close.
- Use sufficient interaction width for edges.
- Provide a structured list/table view of the same workflow for screen readers and small screens.

## 16. Validation UX

`Validate` calls the server. Findings include severity, node/edge reference, rule code,
explanation and repair guidance. Clicking a finding focuses the target. Client checks may provide
fast hints but cannot mark the workflow publishable.

## 17. Definition of done

The generic editor is accepted when an authorized maintainer can create a draft, add/configure
nodes and edges, validate, resolve errors, publish an immutable version, start a synthetic run,
observe live state, inspect artifacts/attempts and prove that browser state loss does not lose
the run or definition.

