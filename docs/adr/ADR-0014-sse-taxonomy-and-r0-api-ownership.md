# ADR-0014 — SSE Event Taxonomy and Release 0 API Ownership

**Status:** Accepted
**Date:** 2026-08-21

## Context

Two verified findings from the adversarial review of the delivery bundle:

1. **The SSE taxonomy omits every terminal, cancellation, pause and skip event.** The
   run-execution stream defined in (10 §9) contains exactly eight execution events —
   `run.started` plus seven stage events (`stage.queued`, `stage.started`,
   `stage.waiting_for_input`, `stage.waiting_for_approval`, `stage.succeeded`,
   `stage.failed_retryable`, `stage.failed_final`). No event exists for a run completing,
   failing, being cancelled, paused or resumed, nor for a stage becoming `SKIPPED` or
   `CANCELLED`, even though those states are persisted (07 §3) and run completion is defined in
   terms of `SUCCEEDED|SKIPPED` (07 §14). A client that follows the snapshot-plus-SSE protocol
   (10 §8) can therefore never learn from the stream that a run reached any terminal state —
   defeating the protocol for exactly the most important transitions. Related audit gap: SSE
   streams were not tied to session revocation, although sessions must be revoked on membership
   disable (11 §8), and no keepalive was specified despite SSE being an explicit
   Iranian-network acceptance item (13 §13).

2. **No Release 0 ticket owns the HTTP API band the R0 vertical demo requires.** The demo
   (15 §2) needs the workflow definition/version CRUD, validate and publish engine (10 §5), the
   run command endpoints (10 §6), the SSE stream (10 §8) and the approval request/decision
   endpoints (10 §7), but no ticket in the 0.1–0.15 table builds them. Ticket 0.13's dependency
   list (0.6, 0.12) was stale after ADR 0010's scope expansion, hiding real dependencies on the
   schemas and runtime; ticket 0.11 freezes prompt/rule/example versions into manifests (07 §6)
   without depending on ticket 0.8; and ticket 0.5 could deliver auth screens before the FA-first
   RTL foundation of 0.12, risking an LTR/English auth UI in violation of the
   RTL-from-first-component rule (00 §4).

This ADR records the repair for both. The run-level status enum and the producers of `PAUSED`,
`SKIPPED` and `CANCELLED` referenced below are defined in ADR-0012. The single approval write
path referenced below is defined in ADR-0013. Governance authority for this amendment follows
ADR-0011.

## Decision (normative)

### D1. Canonical run-execution event taxonomy

The run-execution stream — persisted in `studio.run_events` with a per-run monotonic
`sequence_number` (06 §9.2) — consists of exactly the following event types.

Existing eight, unchanged from (10 §9):

```text
run.started
stage.queued
stage.started
stage.waiting_for_input
stage.waiting_for_approval
stage.succeeded
stage.failed_retryable
stage.failed_final
```

Added by this ADR:

```text
run.completed
run.failed
run.cancelled
run.paused
run.resumed
stage.skipped
stage.cancelled
```

Plus one transport-only frame: `heartbeat`.

Semantics:

- `run.completed` / `run.failed` / `run.cancelled` — emitted when the run-level status
  (ADR-0012 enum `DRAFT|QUEUED|RUNNING|WAITING_INPUT|WAITING_APPROVAL|PAUSED|SUCCEEDED|FAILED|CANCELLED`)
  reaches `SUCCEEDED`, `FAILED` or `CANCELLED` under the stage-to-run aggregation rule
  (ADR-0012). Exactly one terminal `run.*` event is emitted per run.
- `run.paused` / `run.resumed` — emitted when `PAUSE_RUN` / `RESUME_RUN` (07 §12) take effect;
  entry and exit transitions for `PAUSED` are those defined in ADR-0012.
- `stage.skipped` — emitted when a stage reaches `SKIPPED`, produced by a condition-false edge
  or by governed, capability-gated manual skip (ADR-0012).
- `stage.cancelled` — emitted when a stage reaches `CANCELLED`.
- `heartbeat` — emitted on every open stream at a configurable interval
  (`heartbeatIntervalSeconds`, default 25). It is not persisted to `studio.run_events`, carries
  no sequence number, and is ignored by client reconciliation (10 §8.2).

Invariant: every persisted run/stage state transition produces exactly one persisted stream
event. This taxonomy is closed; it may be extended only by a subsequent ADR.

### D2. Snapshot-then-events resume semantics

- The graph snapshot response (`GET /api/v1/studio/runs/:runId/graph`, 10 §8.1) includes
  `lastSequence`, the highest persisted sequence at snapshot time.
- The stream endpoint accepts both the `afterSequence` query parameter (10 §8.1) and the
  standard SSE `Last-Event-ID` header. Every persisted event frame sets the SSE `id:` field to
  its `sequence_number`, so browser-native reconnection resumes correctly. When both are
  present, `Last-Event-ID` wins.
- Client reconciliation is unchanged from (10 §8.2): apply only the next sequence; on a gap,
  refetch the snapshot; fall back to polling with visible stale status.
- `heartbeat` frames carry no `id:` and never advance the resume position.

### D3. Session revocation binding

An SSE connection is authenticated and workspace-scoped like any other request (10 §3). The
server re-validates the session at least once per heartbeat interval and terminates the stream
when the session is revoked or the underlying membership is disabled (11 §8, ticket 0.5).
A revocation-driven termination is auditable. A disabled user therefore stops receiving run
events within one heartbeat interval, with history intact (ADR-0011 restored R0 criterion).

### D4. Ticket 0.16 — Release 0 API band

A new ticket is added to the Release 0 plan (15 §2), to be authored against the ticket template
in (15 §9):

| Ticket | Build | Depends on |
|---|---|---|
| 0.16 | Workflow definition/version CRUD, validation and publish engine (10 §5, 07 §13); run command endpoints (10 §6) with the gate verbs removed per ADR-0013; SSE stream endpoint implementing D1–D3; approval request/decision endpoints (10 §7) as the single approval write path per ADR-0013 | 0.3, 0.4, 0.6, 0.10 |

Ticket 0.16 owns this API band exclusively; no other R0 ticket implements these endpoints.

### D5. Dependency corrections

- Ticket **0.13** (dashboard skeleton) depends on **0.4, 0.6, 0.10, 0.12, 0.16** — adding 0.4,
  0.10 and 0.16 to the previously listed 0.6, 0.12 (15 §2).
- Ticket **0.11** (run manifests and comparisons) depends on **0.8, 0.10** — adding 0.8, because
  manifests freeze prompt, rule and example versions (07 §6) that only exist after 0.8.
- Ticket **0.5** (auth): the server-side invitation, no-public-signup and session-revocation work
  keeps its dependency on 0.4 and is unblocked; the login/invitation **UI screens** of 0.5
  additionally depend on **0.12**, so no LTR-only auth UI can ship (00 §4).

## Consequences

- Clients can observe the full run lifecycle from the stream without polling for terminal
  states; `run.*` terminal events become testable at the HTTP seam (10 §12; 14 §2 Seam 2, SSE
  snapshot/event recovery).
- `studio.run_events` gains at most seven new event types; `heartbeat` adds no storage.
- Ticket 0.13 moves later in the R0 order (after 0.10 and 0.16). The serial spine of (15 §11)
  is unchanged; UI lanes still parallelize after contracts freeze.
- The 0.16 ticket file must be authored with the other per-ticket files before implementation
  begins on it (15 §9).
- Failed and cancelled runs are visible with stage states via the stream and snapshot — one of
  the four restored R0 exit criteria (ADR-0011).

## Supersedes / Amends

- Amends (10 §8–§9): extended taxonomy, `Last-Event-ID` resume, heartbeat, revocation binding.
- Amends (15 §2): ticket rows 0.5, 0.11, 0.13; adds ticket 0.16.
- Depends on ADR-0012 (run-level enum, aggregation rule, producers of PAUSED/SKIPPED/CANCELLED)
  and ADR-0013 (gate verbs removed from the runtime command set).
- Does not change ADR 0010 decisions. Authority hierarchy per ADR-0011.
