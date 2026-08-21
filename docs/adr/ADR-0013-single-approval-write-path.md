# ADR-0013 — Single Approval Write Path and Approver Distinctness

**Status:** Accepted
**Date:** 2026-08-21

## Context

The adversarial review (review synthesis, 2026-08-21) recorded two related defects against the most governance-critical state in the system; the first was corroborated independently by both the architecture and security lenses — the strongest cross-lens finding of the review.

**1. Two unreconciled approval write paths.** The bundle specifies gate decisions in two places with different enforcement:

- Run-command gate verbs: `APPROVE_GATE`, `REQUEST_CHANGES` (and `ESCALATE_GATE`) in the runtime manual command set (07 §12), reachable through the generic run command endpoints `POST /api/v1/studio/runs/:runId/commands` and `.../stages/:stageRunId/commands` (10 §6).
- The core approval endpoint: `POST /api/v1/core/approval-requests/:approvalRequestId/decisions` (10 §7), for which alone the bundle specifies policy resolution, acted-as-role, capability and self-approval enforcement ("The server determines whether the actor may approve, must act under a specific role/capability, and whether self-approval is forbidden, permitted-and-labeled or requires a distinct reviewer", 10 §7) and exact-subject-version binding (06 §2.2).

Nothing reconciles them. Two write paths to approval state risk one path skipping policy, self-approval and subject-version enforcement entirely.

**2. Approval quorum integrity gap.** `minimum_approvals` exists in the gate policy schema (11 §6) with **no distinctness rule**: nothing requires N approvals to come from N distinct actors, so a single non-creator could satisfy a multi-approval gate alone. Relatedly, "Machines and services may hold execution capabilities but never human approval authority" (11 §2) has no specified enforcement mechanism.

## Decision

### D1 — Sole write path

`POST /api/v1/core/approval-requests/:approvalRequestId/decisions` (10 §7) is the **only** write path for approval decisions of any kind. No other endpoint, command, service call or job may create, mutate or satisfy an approval.

### D2 — Gate verbs removed from the runtime command set

`APPROVE_GATE`, `REQUEST_CHANGES` and `ESCALATE_GATE` are **removed** from the 07 §12 manual command set and are rejected as run/stage commands (10 §6) with a stable error code whose `nextPermittedActions` points to the open approval request. The remaining runtime commands are:

```text
START_RUN
PAUSE_RUN
RESUME_RUN
CANCEL_RUN
RETRY_STAGE
SUBMIT_INPUT
SKIP_STAGE        (added by ADR-0012 D5)
CREATE_RERUN
```

The former gate verbs become **internal effects of approval decisions**: a decision accepted through the D1 endpoint carries `decision: APPROVED | CHANGES_REQUESTED | REJECTED | ESCALATED`, and the engine — inside the same transaction — applies the corresponding stage transition and edge routing from the ADR-0012 D1 table (`WAITING_FOR_APPROVAL` rows) and 07 §11 edge types. The decision request preserves the 10 §3 command envelope: authenticated session, acted-as role, `Idempotency-Key`, `expectedRowVersion` against the approval request row, and mandatory reason.

### D3 — Approver distinctness: N means N distinct human actors

`minimum_approvals: N` (11 §6) is satisfied only by `APPROVED` decisions from **N distinct HUMAN actors**. Enforcement is at the database, not only the application layer:

- **One decision per actor per request:** a partial unique index on `core.approval_events` — `UNIQUE (approval_request_id, actor_id) WHERE event_kind = 'DECISION'`. Because `core.approval_events` is append-only (06 §2.3, 11 §13), an actor's decision on a given request is single and final; a changed mind requires a new approval request against the exact subject version, consistent with "an old approval never floats forward" (06 §2.2).
- **Decided-count check:** the approval request row transitions to its approved state only when `count(*)` of `DECISION` rows with `decision = 'APPROVED'` for that request `>= minimum_approvals` — and since each such row has a distinct `actor_id` by the unique index above, that count **is** a distinct-actor count. The check runs inside the deciding transaction with the request row locked, and a database-level guard (trigger or a maintained `approved_count` with a `CHECK` at transition) backstops the application service.

### D4 — HUMAN-only decision actors

Only `HUMAN` actors (11 §2) may decide approvals, enforced structurally: `core.actors` carries `UNIQUE (id, actor_type)`; decision rows in `core.approval_events` carry `(actor_id, actor_type)` as a composite foreign key to it, with `CHECK (actor_type = 'HUMAN')` on decision rows. A MACHINE or SERVICE identity therefore cannot be recorded as an approval decider at the schema level, making 11 §2's "never human approval authority" enforceable rather than aspirational. (MACHINE/SERVICE actor authentication itself is out of scope here.)

### D5 — Self-approval rules preserved

The 11 §6.1 modes are preserved unchanged and enforced at the D1 endpoint by **actor identity comparison**, never session or role labels (11 §6.1):

- `AUTHORIZED_ROLE`: any authorized actor may decide; if the decider also created the subject, the decision event records that fact.
- `SELF_APPROVAL_ALLOWED`: permitted but explicitly labeled in UI and audit.
- `DISTINCT_REVIEWER_REQUIRED`: the subject creator cannot decide.

Interaction with D3: under `minimum_approvals >= 2` with `AUTHORIZED_ROLE` or `SELF_APPROVAL_ALLOWED`, the subject creator may count as at most one of the N distinct approvers; under `DISTINCT_REVIEWER_REQUIRED` the creator counts as zero.

### D6 — Audit and access integrity additions

The review found the doc 11 §8 audit list silent on authentication, denial and raw-response
access — gaps that would let governance-relevant actions escape the trail the approvals above
depend on. Recorded here because approval integrity is only as strong as the audit that proves
it:

- The append-only audit trail additionally records `auth.login.succeeded`, `auth.login.failed`,
  `auth.session.revoked` and `authz.denied` events (actor, scope, denied capability).
- A dedicated `RAW_RESPONSE_READ` capability governs every read of the restricted raw
  AI-response namespace (12 §5); absence fails closed and the denial is itself audited.
- Ticket 0.5 emits the auth events; ticket 0.6 seeds the capability and canonicalizes the
  action names.

## Consequences

- Exactly one enforcement point exists for policy resolution, capability checks, self-approval modes, subject-version binding and quorum — the class of bug where a second path skips governance is structurally removed.
- Doc 07 §12 and doc 10 §6 shrink; UI approval affordances (approve/request-changes/escalate buttons on gate nodes and the approvals inbox) all call the core endpoint. `approval.requested`/`approval.decided` (10 §9) remain the only approval events, emitted from the single path.
- Ticket 0.16 (created by ADR-0014) owns the approval request/decision endpoints; ticket 0.4 gains the D3/D4 constraints; ticket 0.6 seeds policies against them.
- New negative tests join the standing invariants (14 §4, which already requires distinct-reviewer enforcement "by actor identity" and lists "Subject creator attempting distinct-reviewer approval"): the same actor deciding twice on one request (DB rejection), a MACHINE/SERVICE actor deciding (DB rejection), quorum declared satisfied at N-1 distinct approvers, and `APPROVE_GATE` submitted as a run command (stable rejection).
- Decisions being single and final per actor per request is a deliberate stiffening: revision of a decision requires a fresh approval request, which keeps history append-only and auditable.

## Supersedes / Amends

- **Amends** `implementation/07_WORKFLOW_RUNTIME_AND_MACHINE_CONTRACTS.md` §12: `APPROVE_GATE`, `REQUEST_CHANGES`, `ESCALATE_GATE` removed from the command set (D2).
- **Amends** `implementation/10_API_EVENTS_AND_REALTIME.md` §6: gate verbs invalid as run/stage commands; §7 confirmed as the sole approval write path (D1).
- **Extends** `implementation/11_SECURITY_RBAC_APPROVALS_AND_AUDIT.md` §6 (`minimum_approvals` distinctness, D3) and §2 (structural HUMAN-only enforcement, D4); §6.1 unchanged (D5).
- **Extends** `implementation/06_DOMAIN_MODEL_AND_DATABASE.md` §2.2 (approval_events constraints and composite FK shape).
- Related parallel repairs: ADR-0012 (the stage transitions these decisions trigger), ADR-0014 (endpoint ownership via ticket 0.16).
