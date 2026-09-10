# Domain ownership and future integration

## 1. Composition

Pages/components call query hooks and application services. Services call PanelGateway for panel resources and MachineGateway for external-machine-shaped operations. Mock implementations share one canonical demo repository. TanStack Query holds query state; Zustand holds transient selection/filter/canvas state. Browser persistence stores versioned demo snapshots through the repository adapter, not independent page-specific localStorage copies.

No fixture imports in components. No direct mutations of query data or React Flow status. No live HTTP transport required. Future real adapters are unimplemented connection points, not stubs returning fake production success.

Retain the doc 18 MachineGateway interface verbatim in `reference/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`. Reuse existing repo DTOs and policy types rather than shadowing them. This pack's `mock/panel-contracts.ts` is an additive panel-oriented proposal, not a finalized machine API.

## 2. Missing panel capabilities

PanelGateway covers project CRUD/drafts, concepts and versions, content and versions, references, comments, plan scope, package data/export and calendar CRUD. Existing MachineGateway owns run start/pause/retry, stage snapshots, machine discovery and approval submission. An application facade may expose ergonomic methods without adding a second decision write path.

For example, `reviewItem(command)` resolves the item's approval request and exact version, then delegates to `MachineGateway.submitApproval`. The mock adapter atomically appends the decision, changes the read model and emits one event. Reject-and-revise first records the decision, then requests targeted regeneration. A regeneration failure must not erase the rejection or duplicate it on retry.

Targeted generation is missing from the frozen MachineGateway. Define a separate additive `RevisionGateway` until the machine team agrees its endpoint; do not abuse retryStage to mean changing content. A retry repeats a failed attempt with the same input; a revision uses new feedback/input and creates a new version. The mock may implement both via deterministic local state transitions.

## 3. Entity relationships

Project → concept batch → concepts → immutable concept versions.
Selected approved concept version → frozen output plan → content items → immutable content versions.
Versions → comments, decisions, attempts, source links and gate results.
Package family → package versions → exact concept/content/source versions.
Calendar entry → project + package family + selected package version.
Program → approved Bible version → child Weekly Lenses.

Use stable IDs, workspaceId and schemaVersion. Keep original references and generated research sources distinct. Store source status/provenance separately from cited text. Keep pending revision request and active version separate. All relationships should resolve inside a mock scenario.

## 4. Command envelope

Every mutation receives commandId (idempotency), workspaceId, actorId/activeRole, targetId and expectedRevision. Version-specific decisions also include versionId. The mock rejects stale expectedRevision with CONFLICT and asks the UI to refresh while preserving typed feedback. Repeating commandId returns the original receipt and does not repeat effects.

Receipts: accepted/succeeded/rejected plus commandId, correlationId and error code when applicable. Accepted is not completed. Simulated completion is driven by an injected clock and scenario response; no autonomous scheduler or AI logic. Show activity timestamps using that clock.

Events include eventId, schemaVersion, workspaceId, occurredAt, aggregateId, aggregateRevision, correlationId, type and data. Deduplicate by eventId; ignore older aggregate revisions. Invalidate project, review queue, graph, artifact/package and calendar queries when related resources change. Use mock subscriptions now; future polling/SSE choice is deferred to the machine team's contract.

## 5. Policy and permissions

Existing source history reports both eight roles and seven administrative roles plus capabilities. Do not choose a production count from that conflict. Import the existing repo's accepted policy DTO and use illustrative capability profiles in mocks. At minimum demonstrate reviewer, editorial reviewer, planner and read-only viewer; these are demo profiles, not a new canonical role taxonomy.

Show actor + active role + exact version on decisions. Repeated approvals by one human do not count as separate actors. Preserve existing self-approval constraints and threshold requirements supplied by policy. Client-side visibility and mock enforcement demonstrate UX only; real authentication/authorization must be enforced by the separate backend before live deployment.

## 6. Demo persistence

Use one versioned storage key, e.g. `drop-panel-demo-v2`. Seed on first load; validate on hydration. Corrupt/old data offers Reset Demo with confirmation instead of crashing. Keep demo actor, scenario and controllable clock stable. Session change must clear incompatible query state. Store metadata and short sample text only, not secrets, raw uploaded files or remote credentials. Two browser tabs either synchronize revisions via storage events or show a refresh notice; avoid silent last-write wins.

## 7. Readiness and revisions

Application read models can calculate UI readiness from supplied mock statuses; this is not implementing external machine intelligence. Required content plan IDs determine the denominator. Active approved versions count only if fresh and policy gates passed. A new concept version marks only dependent active content stale. Historical snapshots remain immutable.

An automatic mock package assembly is a scripted response to readiness, with a unique key from project + included content-version IDs + plan revision. Calendar creation is idempotent per package family. New package versions do not duplicate the calendar entry; show an explicit replace-linked-version action. Scheduled historical versions show an outdated-content warning.

## 8. Later handoff

Document open decisions for the machine team: final DTO mapping and endpoint ownership; review policy; capability discovery; targeted regeneration/cancellation; input upload and extraction; immutable artifact access; event sequencing; live calendar persistence; source coverage metadata; run/product-stage mapping.

No backend transport, token management, webhook receiver, queue, production schema migration or provider configuration is built now. Only adapter interfaces, mappings and contract tests. Replacing mocks must not require redesigning cards, navigation, graph or calendar.
