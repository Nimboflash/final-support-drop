# API, Events and Realtime

## 1. API style

Use versioned JSON HTTP endpoints under `/api/v1`. Route handlers are thin adapters to shared
application services. Server Actions may be used for tightly scoped UI forms only when they call
the same services and preserve the HTTP test seam.

Do not expose internal provider SDK shapes, Drizzle rows or React Flow objects as public DTOs.

## 2. Response envelope

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "rowVersion": 4
  }
}
```

Failure:

```json
{
  "error": {
    "code": "WORKFLOW_VERSION_CONFLICT",
    "message": "نسخهٔ جریان کاری تغییر کرده است.",
    "details": {},
    "diagnosticId": "diag_...",
    "retryable": false,
    "nextPermittedActions": ["RELOAD_DRAFT"]
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Persian messages are presentation-safe; error codes remain stable English identifiers.

## 3. Command requirements

Every mutating request includes:

- Authenticated session.
- Workspace/module/project scope.
- Acted-as role where an actor holds multiple roles.
- `Idempotency-Key` for commands that can be retried.
- `expectedRowVersion` for mutable aggregate updates.
- Reason for approvals, exceptions, retries, cancellations and plan changes.

Authorization and state transition are checked inside the transaction.

## 4. Core endpoint groups

### 4.1 Projects and Programs

```text
GET    /api/v1/studio/projects
POST   /api/v1/studio/projects
GET    /api/v1/studio/projects/:projectId
PATCH  /api/v1/studio/projects/:projectId
POST   /api/v1/studio/projects/:projectId/brief-versions

GET    /api/v1/studio/programs
POST   /api/v1/studio/programs
GET    /api/v1/studio/programs/:programId
POST   /api/v1/studio/programs/:programId/runs
GET    /api/v1/studio/programs/:programId/artifacts
GET    /api/v1/studio/programs/:programId/activity
```

### 4.2 Weekly Lenses

```text
GET    /api/v1/studio/lenses
POST   /api/v1/studio/programs/:programId/lenses
GET    /api/v1/studio/lenses/:lensId
POST   /api/v1/studio/lenses/:lensId/current-context-runs
POST   /api/v1/studio/lenses/:lensId/runs
```

### 4.3 References, research and directions

```text
POST   /api/v1/studio/programs/:programId/references
GET    /api/v1/studio/programs/:programId/references
POST   /api/v1/studio/research-plans
POST   /api/v1/studio/research-plans/:planId/freeze
POST   /api/v1/studio/research-plans/:planId/amend
GET    /api/v1/studio/research-plans/:planId/coverage
GET    /api/v1/studio/sources
POST   /api/v1/studio/sources
POST   /api/v1/studio/sources/:sourceId/transition
GET    /api/v1/studio/directions/:directionId
POST   /api/v1/studio/directions/:directionId/approval-requests
```

### 4.4 Artifacts, requests and calendar

```text
GET    /api/v1/studio/artifacts/:artifactId/versions
GET    /api/v1/studio/artifact-versions/:versionId
POST   /api/v1/studio/artifact-versions/:versionId/approval-requests
GET    /api/v1/studio/requests
POST   /api/v1/studio/requests/:requestId/commands
POST   /api/v1/studio/requests/:requestId/feedback
GET    /api/v1/studio/calendar
PATCH  /api/v1/studio/calendar-items/:itemId
```

## 5. Workflow definition endpoints

```text
GET    /api/v1/studio/workflows
POST   /api/v1/studio/workflows
GET    /api/v1/studio/workflows/:workflowId
POST   /api/v1/studio/workflows/:workflowId/versions
GET    /api/v1/studio/workflow-versions/:versionId
PATCH  /api/v1/studio/workflow-versions/:versionId/draft
PUT    /api/v1/studio/workflow-versions/:versionId/layout
POST   /api/v1/studio/workflow-versions/:versionId/validate
POST   /api/v1/studio/workflow-versions/:versionId/publish
POST   /api/v1/studio/workflow-versions/:versionId/clone
GET    /api/v1/studio/workflow-versions/:versionId/export
POST   /api/v1/studio/workflow-imports/validate
```

The draft patch uses semantic operations, not a blind replacement blob:

```typescript
type WorkflowDraftOperation =
  | { type: 'ADD_NODE'; node: DraftNodeInput }
  | { type: 'UPDATE_NODE'; nodeKey: string; patch: NodePatch }
  | { type: 'REMOVE_NODE'; nodeKey: string }
  | { type: 'ADD_EDGE'; edge: DraftEdgeInput }
  | { type: 'UPDATE_EDGE'; edgeKey: string; patch: EdgePatch }
  | { type: 'REMOVE_EDGE'; edgeKey: string };
```

Server validation is required after operations. Layout updates use a separate endpoint and row
version so moving a node does not conflict with a semantic title edit unnecessarily.

## 6. Run and command endpoints

```text
GET    /api/v1/studio/runs
GET    /api/v1/studio/runs/:runId
GET    /api/v1/studio/runs/:runId/graph
GET    /api/v1/studio/runs/:runId/events
GET    /api/v1/studio/runs/:runId/manifest
GET    /api/v1/studio/runs/:runId/stages/:stageRunId
POST   /api/v1/studio/runs/:runId/commands
POST   /api/v1/studio/runs/:runId/stages/:stageRunId/commands
GET    /api/v1/studio/runs/compare?leftRunId=&rightRunId=
```

Commands use an enum and typed payload, for example:

```json
{
  "command": "RETRY_STAGE",
  "stageRunId": "stage_...",
  "reason": "زیرساخت بازیابی شد.",
  "expectedRowVersion": 7
}
```

## 7. Approval endpoints

```text
GET    /api/v1/core/approval-requests?assignedTo=me&status=open
GET    /api/v1/core/approval-requests/:approvalRequestId
POST   /api/v1/core/approval-requests/:approvalRequestId/decisions
```

The server determines whether the actor may approve, must act under a specific role/capability,
and whether self-approval is forbidden, permitted-and-labeled or requires a distinct reviewer.

## 8. Realtime protocol

### 8.1 Snapshot plus SSE

```text
GET /api/v1/studio/runs/:runId/graph
GET /api/v1/studio/runs/:runId/events/stream?afterSequence=142
```

SSE event:

```json
{
  "runId": "run_...",
  "sequence": 143,
  "eventType": "stage.waiting_for_approval",
  "occurredAt": "2026-08-21T12:04:00Z",
  "subject": { "stageRunId": "stage_...", "nodeKey": "m03.guardian_approval" },
  "summary": {},
  "schemaVersion": 1
}
```

Event payloads contain safe summaries and IDs, not raw AI responses or restricted content.

### 8.2 Client reconciliation

- Apply only the next sequence.
- If a gap exists, refetch a complete graph snapshot.
- Reconnect with last applied sequence.
- Fall back to polling with visible stale status.
- Never execute client-side transitions based only on an event; commands still go through API.

## 9. Event taxonomy

Use past-tense domain events:

```text
project.created
program.created
workflow.version.published
run.started
stage.queued
stage.started
stage.waiting_for_input
stage.waiting_for_approval
stage.succeeded
stage.failed_retryable
stage.failed_final
approval.requested
approval.decided
artifact.version.created
artifact.validation.failed
artifact.approved
research.plan.frozen
research.slot.blocked
research.request.created
concept.selected
concept_bible.published
lens.created
output_manifest.published
request.assigned
request.blocked
feedback.submitted
revision.requested
handoff.declared_complete
```

Every event has schema version, event ID, aggregate ID/version, actor where applicable,
occurred-at time and correlation/causation IDs.

## 10. Pagination, filtering and search

- Cursor pagination for activity/events and large registries.
- Stable sort with ID tie-breaker.
- Server-side filtering for role-scoped request views.
- Full-text search returns IDs and safe snippets, then authorized resource fetch.
- Never fetch all sources/artifacts into the browser for client-side filtering.

## 11. File access

- File metadata is fetched through authorized API.
- Bytes stream through a short-lived signed access or server stream.
- Every download/preview checks workspace and artifact authorization.
- Uploaded evidence records checksum, submitter, retrieval method and rights/usage notes.
- Browser never receives long-lived storage credentials.

## 12. HTTP seam tests

Test at minimum:

- Authentication and tenant isolation.
- Role/capability scope.
- Approval policy and acted-as role.
- Optimistic concurrency.
- Idempotent duplicate commands.
- Immutable published workflow/artifact rejection.
- State transition guards.
- SSE ordering/gap recovery.
- Persian error mapping without leaking internal details.

