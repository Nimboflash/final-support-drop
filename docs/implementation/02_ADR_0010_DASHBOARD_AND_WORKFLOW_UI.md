# ADR 0010 - Dashboard and Workflow UI Foundation

**Status:** Accepted by current implementation request  
**Date:** 2026-08-21  
**Scope:** DROP OS / Studio user interface and workflow visualization/authoring  
**Does not change:** five-machine semantics, approvals, data ownership or release gates except
for the explicit ticket additions recorded in the release plan

## Context

The approved specifications describe a Persian operational dashboard and auditable pipeline but
leave the exact UI foundation open. The implementation now requires:

- `shadcn/ui` for the dashboard and component system.
- React Flow's AI Workflow Editor pattern for workflow visualization and authoring.
- A graph that displays actual persisted workflow/run data.
- A dashboard that operates the same machines and records, rather than a separate mock surface.

The referenced React Flow AI Workflow Editor is a Next.js template built with React Flow UI,
shadcn/ui, Tailwind, an AI SDK and Zustand. It is currently described as a React Flow Pro
template. React Flow core and many examples remain open source.

## Decision

### D1. Component ownership

Use shadcn/ui as open code copied into `packages/ui`, then adapt it to DROP tokens and RTL rules.
Do not consume it as an opaque external design system and do not leave the default shadcn visual
identity unchanged.

### D2. Workflow rendering

Use `@xyflow/react` as the canvas runtime. Build DROP-specific custom nodes, edges, controls,
drawers and validation behavior. Use the Pro AI Workflow Editor source only after a valid license
is confirmed; otherwise use the official open-source core and MIT examples.

### D3. Modes

Provide separate modes:

1. `TEMPLATE_EDIT` - draft workflow definition editing.
2. `TEMPLATE_READ` - published definition inspection.
3. `RUN_EXECUTION` - live run state inspection.
4. `RUN_COMPARE` - later hardening release, compare two run manifests/states.

Permissions are evaluated server-side. Switching a client-side mode never grants authority.

### D4. Source of truth

- PostgreSQL owns workflow definitions, definition versions, semantic nodes/edges, run state,
  attempts, events and approvals.
- Canvas layout is stored separately from workflow semantics.
- Zustand owns current selection, viewport, unsaved draft edits and panel state only.
- TanStack Query owns cached server state and invalidation.
- Redis never owns unique workflow state.

### D5. Published immutability

A workflow definition may have mutable `DRAFT` versions. Publishing creates an immutable
version. Runs reference an exact published version. Any edit creates a new draft version; it
never changes a historical run.

### D6. Graph direction and RTL

The full application is `lang="fa-IR"` and `dir="rtl"`. The default workflow layout is
top-to-bottom to avoid forcing an LTR mental model. RTL controls, drawers and labels use logical
CSS properties. IDs, URLs and code fragments render in isolated LTR spans.

### D7. Canvas semantics

Machine groups and executable stages/gates are the primary graph. Artifacts do not become
default path nodes; they appear in node ports, detail panels and an optional lineage overlay.
This prevents large research runs from making the execution graph unusable.

### D8. Live updates

Use server-sent events for append-only run events, with timed polling as a fallback. Client
events update the cached view but are always reconciled with PostgreSQL state.

### D9. Layout

Use ELK through a small layout adapter for grouped, top-to-bottom graphs and multiple handles.
Persist user layout preferences separately. A workflow's executable meaning cannot depend on
its x/y position.

### D10. Brand system

Implement brand choices as CSS variables and semantic component variants. Exact color values
are replaceable configuration until the authoritative application guide is supplied. There is
one variable Lens accent at a time; semantic warning/success/error colors remain functional and
must not be mistaken for brand accents.

### D11. Accessibility

Retain React Flow keyboard and screen-reader behavior, add Persian aria labels, ensure every
canvas action has a non-canvas equivalent, and meet WCAG 2.2 AA for core journeys. Color alone
never communicates status.

### D12. Release amendment

Release 0 gains workflow-definition contracts, persistence and a generic canvas shell. Each
later machine release supplies its real workflow nodes/states. This prevents the graph from
being bolted on after the runtime and avoids a second workflow model.

## Consequences

### Positive

- Dashboard and graph share components, tokens and data.
- Workflow behavior remains auditable and reproducible.
- The UI is customizable without forking an opaque commercial framework.
- Persian RTL behavior begins at the component foundation.
- The graph can grow from Machine 01 through Machine 05 without schema replacement.

### Costs

- Workflow definition/version tables and APIs must be built in Release 0.
- Canvas editing requires explicit validation, concurrency control and undo/redo behavior.
- React Flow Pro licensing must be verified before using Pro template source.
- The team must maintain DROP-specific shadcn and React Flow components.

## Rejected alternatives

- A static diagram disconnected from run state.
- Storing the full graph only in browser local storage or Zustand.
- Making React Flow coordinates executable semantics.
- Allowing a published template to be edited in place.
- A separate microservice for the graph in V0.
- Building the UI LTR first and converting it later.
- Using the default shadcn theme as DROP's final interface identity.

## References

- https://ui.shadcn.com/
- https://ui.shadcn.com/docs/rtl
- https://reactflow.dev/ui/templates/ai-workflow-editor
- https://reactflow.dev/learn/advanced-use/accessibility
- https://reactflow.dev/learn/advanced-use/state-management
- https://reactflow.dev/examples/layout/elkjs

