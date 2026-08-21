# ADR-0012 — Execution State Machine Completion

**Status:** Accepted
**Date:** 2026-08-21

## Context

The adversarial review (review synthesis, 2026-08-21, critical finding 3; corroborated by the consistency and architecture reviewers) verified that the execution-layer state model in doc 07 is unimplementable as written:

- `PAUSED` has **no entry transition** in 07 §3.1, despite a `PAUSE_RUN` command in 07 §12 and a specified PAUSED node visual.
- `SKIPPED` has **no producing transition**, despite run completion requiring every required stage to be `SUCCEEDED|SKIPPED` (07 §14).
- There is **no `RUNNING`/`READY`/`DRAFT` → `CANCELLED` path**, despite `CANCEL_RUN` (07 §12) and the `abortSignal` in `StageContext` (07 §5) — 07 §3.1 cancels only from `QUEUED`, `FAILED_RETRYABLE`, `WAITING_*` and `PAUSED`.
- The **run-level status enum** (`studio.pipeline_runs.status`, 06 §9.2) is never enumerated anywhere, nor is the stage→run aggregation rule.
- `PROVIDER_CONFIGURATION_REQUIRED` (11 §7) does not exist in 07 §3's canonical state model, and whether `SUBMIT_INPUT` can satisfy an `AUTOMATED_STAGE` in manual mode is undefined (review major finding "manual-mode pipeline semantics"), while manual-mode usefulness is a non-negotiable (00 §4).

Tickets 0.10, 0.11 and 0.13 build directly on this model; building to the letter of 07 §3.1 produces a runtime that cannot pause, cancel or skip.

## Decision

This ADR is the normative completion of doc 07 §3. Where 07 §3.1 and this table differ, this table governs.

### D1 — Complete stage-level transition table

Stage states are exactly those of 07 §3 (no additions, no removals). `SKIP_STAGE` is added to the 07 §12 command set as a governed stage-level command (see D5). Gate verbs are removed from the command set by ADR-0013.

| From | Trigger / command | Guard | To |
|---|---|---|---|
| DRAFT | Run admitted by engine | Run manifest frozen and fully resolved, fail-closed (07 §6) | READY |
| DRAFT | Condition-false pruning (engine) | Stage lies on a branch pruned by a `CONDITION_FALSE` edge (07 §11) | SKIPPED |
| DRAFT | `CANCEL_RUN` | Run-scoped cancel; actor authorized (07 §12) | CANCELLED |
| READY | Engine dispatch | Executor/agent registry reference resolvable; no unmet wait | QUEUED |
| READY | Engine dependency check | An upstream required stage is not yet SUCCEEDED or SKIPPED | WAITING_FOR_DEPENDENCY |
| READY | Engine input check | Required input unavailable; when the missing input is a model profile/provider, reason code = `PROVIDER_CONFIGURATION_REQUIRED` (D4) | WAITING_FOR_INPUT |
| READY | Engine gate entry | Node is HUMAN_APPROVAL_GATE; durable approval request opened (06 §2.2) | WAITING_FOR_APPROVAL |
| READY | `PAUSE_RUN` | Actor authorized; run-scoped (D5) | PAUSED |
| READY | Condition-false pruning (engine) | As for DRAFT → SKIPPED | SKIPPED |
| READY | `SKIP_STAGE` | Governed manual skip guard (D5) | SKIPPED |
| READY | `CANCEL_RUN` | — | CANCELLED |
| QUEUED | Worker claim | Claim by stage-run ID + idempotency key; durable state re-checked before work (07 §7) | RUNNING |
| QUEUED | `PAUSE_RUN` | Unclaimed job dropped or claim aborts on durable-state check (07 §7) | PAUSED |
| QUEUED | `CANCEL_RUN` | — | CANCELLED |
| RUNNING | Executor completes | `validateOutput` passes (07 §5); artifacts/provenance recorded | SUCCEEDED |
| RUNNING | Executor requires input | Reason code recorded; `PROVIDER_CONFIGURATION_REQUIRED` when the provider is the missing input | WAITING_FOR_INPUT |
| RUNNING | Executor reaches embedded approval requirement | Durable approval request opened | WAITING_FOR_APPROVAL |
| RUNNING | Failure | Retryable failure class and retry budget remains (07 §8) | FAILED_RETRYABLE |
| RUNNING | Failure | Non-retryable class, or retry/repair budget exhausted (07 §8) | FAILED_FINAL |
| RUNNING | `PAUSE_RUN` | `abortSignal` honored; checkpoint of completed durable steps persisted (07 §5, §7) | PAUSED |
| RUNNING | `CANCEL_RUN` | `abortSignal` honored; attempt record closed with usage (07 §8) | CANCELLED |
| WAITING_FOR_DEPENDENCY | Upstream resolution (engine) | All upstream required stages SUCCEEDED or SKIPPED | READY |
| WAITING_FOR_DEPENDENCY | Condition-false pruning (engine) | As above | SKIPPED |
| WAITING_FOR_DEPENDENCY | `CANCEL_RUN` | — | CANCELLED |
| WAITING_FOR_INPUT | `SUBMIT_INPUT` | Input validates against `inputSchemaRef`; permitted on HUMAN_REQUEST nodes always, and on AUTOMATED_STAGE / SPECIALIZED_AGENT nodes **only** when the published node definition flags `manual_fallback: allowed` (D6) | READY |
| WAITING_FOR_INPUT | Provider configuration resolved | Reason code was `PROVIDER_CONFIGURATION_REQUIRED` and a model profile now resolves (D4) | READY |
| WAITING_FOR_INPUT | `SKIP_STAGE` | Governed manual skip guard (D5) | SKIPPED |
| WAITING_FOR_INPUT | `CANCEL_RUN` | — | CANCELLED |
| WAITING_FOR_APPROVAL | Approval decision `APPROVED` (sole write path: core approval endpoint, ADR-0013) | Policy satisfied: ≥ `minimum_approvals` distinct HUMAN actors (ADR-0013); subject version exact (06 §2.2) | READY — completes and routes the `APPROVED` edge (07 §11) |
| WAITING_FOR_APPROVAL | Approval decision `CHANGES_REQUESTED` (ADR-0013) | Decision recorded per policy | READY — routes the `CHANGES_REQUESTED`/`REVISION` edge (07 §11) |
| WAITING_FOR_APPROVAL | Approval decision `REJECTED` (ADR-0013) | `rejection_behavior` of the gate policy is terminal (11 §6) | FAILED_FINAL |
| WAITING_FOR_APPROVAL | Approval decision `ESCALATED` (ADR-0013) | `escalation_behavior` (11 §6): a new/updated approval request is opened | WAITING_FOR_APPROVAL (remains waiting against the new request) |
| WAITING_FOR_APPROVAL | `CANCEL_RUN` | Open approval request closed as void, history preserved | CANCELLED |
| PAUSED | `RESUME_RUN` | Actor authorized | READY |
| PAUSED | `CANCEL_RUN` | — | CANCELLED |
| FAILED_RETRYABLE | Automatic retry or `RETRY_STAGE` | Within bounded retry budget (07 §8) | QUEUED |
| FAILED_RETRYABLE | Budget exhaustion (engine) | Retry budget exhausted | FAILED_FINAL |
| FAILED_RETRYABLE | `CANCEL_RUN` | — | CANCELLED |
| SUCCEEDED | Later run/version relationship only | Via `CREATE_RERUN` or a newer approved version (07 §3.1) | SUPERSEDED |

Terminal states with no outgoing transitions: `FAILED_FINAL`, `CANCELLED`, `SKIPPED`, `SUPERSEDED`. `SUCCEEDED` is terminal except for supersession as tabled. In sum: `PAUSE_RUN` produces PAUSED from `RUNNING|READY|QUEUED` (resumable via `RESUME_RUN`); `CANCEL_RUN` reaches CANCELLED from **every** non-terminal state; `SKIPPED` is produced only by condition-false pruning and governed manual skip.

### D2 — Run-level status enum

`studio.pipeline_runs.status` is exactly:

```text
DRAFT | QUEUED | RUNNING | WAITING_INPUT | WAITING_APPROVAL | PAUSED | SUCCEEDED | FAILED | CANCELLED
```

### D3 — Stage → run aggregation rule

Run status is **derived** from stage states — it is not a second, independently commanded state machine. It is recomputed and persisted in the same PostgreSQL transaction as any stage transition (07 §7). Evaluate top-down; the first match wins:

1. `CANCELLED` — an accepted `CANCEL_RUN`, or any stage `CANCELLED`.
2. `FAILED` — any required stage `FAILED_FINAL`. Fail-closed: the engine dispatches no new stages once the run is FAILED or CANCELLED.
3. `PAUSED` — any stage `PAUSED`.
4. `WAITING_APPROVAL` — any stage `WAITING_FOR_APPROVAL`.
5. `WAITING_INPUT` — any stage `WAITING_FOR_INPUT`.
6. `RUNNING` — any stage `RUNNING` or `FAILED_RETRYABLE` (a bounded retry in progress is live work).
7. `QUEUED` — any stage `QUEUED`, `READY` or `WAITING_FOR_DEPENDENCY`.
8. `SUCCEEDED` — every required stage `SUCCEEDED|SKIPPED` under an allowed condition **and** all required terminal artifacts and approvals exist (07 §14 unchanged).

`DRAFT` applies only before manifest freeze admits the run. Precedence: CANCELLED > FAILED > PAUSED > WAITING_APPROVAL > WAITING_INPUT > RUNNING > QUEUED; SUCCEEDED only when all stages are SUCCEEDED|SKIPPED. Run-level transitions emit the run lifecycle events of ADR-0014 (`run.completed`, `run.failed`, `run.cancelled`, `run.paused`, `run.resumed`).

### D4 — `PROVIDER_CONFIGURATION_REQUIRED` mapping

The named fail-closed state `PROVIDER_CONFIGURATION_REQUIRED` (11 §7) is **not** a new persisted stage state. It maps onto the canonical model as stage `WAITING_FOR_INPUT` with `reason_code = PROVIDER_CONFIGURATION_REQUIRED`, aggregating to run `WAITING_INPUT`. The UI derives the named block label from the reason code, consistent with 07 §3's rule that `BLOCKED`-style labels are UI categories over wait states plus reason codes. Work remains saved and visible; execution waits (11 §7). The stage returns to `READY` when a model profile resolves, or is satisfied by `SUBMIT_INPUT` under D6.

### D5 — `PAUSE_RUN`, `RESUME_RUN` and governed manual skip

- `PAUSE_RUN` is run-scoped: every stage currently `RUNNING|READY|QUEUED` transitions to `PAUSED` per D1. Stages already in `WAITING_*` states are parked human-side work with no queue job (07 §7) and keep their wait states; the run still aggregates to `PAUSED` (D3 precedence). `RESUME_RUN` returns all `PAUSED` stages to `READY`.
- `SKIP_STAGE` is added to the 07 §12 command set with the same envelope (actor, acted-as role, idempotency key, reason, expected row version). Guard, all required: (1) the actor holds the `RUN_STAGE_SKIP` capability, added to the 11 §4 initial capability list; (2) the **published** node definition marks the stage skippable; (3) the node is never a `VALIDATION_GATE` or `HUMAN_APPROVAL_GATE` — gates cannot be manually skipped, preserving the non-negotiable that missing approvals and validators block progression (00 §4); (4) reason is mandatory and an audit event is recorded (11 §12). A stage skipped this way satisfies 07 §14's "SKIPPED under an allowed condition".

### D6 — `manual_fallback` semantics for `SUBMIT_INPUT`

`SUBMIT_INPUT` may satisfy an `AUTOMATED_STAGE` (or `SPECIALIZED_AGENT` stage) **only** when the published workflow definition flags that node `manual_fallback: allowed`. The submitted payload must validate against the stage's `outputSchemaRef`-conformant input contract exactly as machine output would, is stored with provenance identifying the human actor as producer, and passes the same validators. Nodes without the flag reject `SUBMIT_INPUT` with a stable error code. `HUMAN_REQUEST` nodes accept `SUBMIT_INPUT` unconditionally (that is their purpose). This is the concrete mechanism behind the manual-mode non-negotiable (00 §4) and the mock/manual dashboard behavior of 15 §12.

## Consequences

- Tickets 0.10, 0.11 and 0.13 build against a closed, implementable transition table; pause, cancel and skip are reachable, and 07 §14 run completion is satisfiable.
- Ticket 0.4 gains the run-level enum for `pipeline_runs.status` and the `reason_code` column on stage runs; ticket 0.3 carries both in contracts.
- The state-transition test layer (14 §3 item 4) gains exhaustive coverage material: every row of D1 is a positive test, every absent cell a negative test.
- SSE consumers can learn every terminal/pause/skip transition only because ADR-0014's taxonomy extension pairs with this table; the two ADRs are jointly required for tickets 0.13/0.16.
- `SKIP_STAGE` and `manual_fallback` introduce one new capability (`RUN_STAGE_SKIP`) and one new published-definition flag; workflow validation (07 §13) must check that skippable flags and manual-fallback flags never appear on gates.

## Supersedes / Amends

- **Amends** `implementation/07_WORKFLOW_RUNTIME_AND_MACHINE_CONTRACTS.md` §3.1 (replaced by D1 table), §12 (adds `SKIP_STAGE`; gate verbs removed by ADR-0013), and complements §14 (unchanged, now satisfiable).
- **Amends** `implementation/06_DOMAIN_MODEL_AND_DATABASE.md` §9.2 (pipeline_runs status enum D2; stage-run reason codes D4).
- **Amends** `implementation/11_SECURITY_RBAC_APPROVALS_AND_AUDIT.md` §4 (adds `RUN_STAGE_SKIP`) and maps §7's `PROVIDER_CONFIGURATION_REQUIRED` (D4).
- Related parallel repairs: ADR-0013 (approval decisions as the sole gate trigger), ADR-0014 (event taxonomy for these transitions), ADR-0015 (remaining status enums).
