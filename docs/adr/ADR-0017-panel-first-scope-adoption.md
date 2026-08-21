# ADR-0017 — Adoption of the Panel-First Scope Correction (doc 18)

**Status:** Accepted (delivered by the human owner, 2026-08-21)
**Date:** 2026-08-21
**Scope:** the entire current build — release plan, tickets, repository boundary

## Context

The owner delivered `docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`
("doc 18", status: *Authoritative scope correction*) after Ticket 0.1 shipped. It rules that
this delivery builds **the operational panel and its minimum supporting backend only**;
Machines 01–05, their runtime, and their infrastructure are a **separate build** that will
connect later through a `MachineGateway` adapter (18 §1–2, §9).

Doc 18 §13 requires conflicts with existing documents to be followed *in doc 18's favor* and
**reported**. The conflicts with the Release 0 plan this repo shipped in ADRs 0011–0016 and
tickets 0.1–0.16 are material and are recorded here.

## Decision

### D1 — Precedence

Doc 18 enters the authority hierarchy directly below Brand DNA and above everything else in
the implementation pack, for **scope only**:

1. `DROP_BRAND_DNA_v3.0` — brand truth (unchanged).
2. **Doc 18 — build scope** (what this delivery builds and must not build).
3. Recorded decisions (doc 03, ADRs 0011–0016) and the rest of the ADR-0011 order — still
   governing product language, domain concepts, workflow states, RBAC/approval/audit
   semantics, and **future integration contracts** (18 §2 keeps them valid for exactly this).

### D2 — Ticket plan partition

The Release 0 plan is partitioned; nothing is deleted, and ticket files keep their recorded
content for the machine build to inherit:

- **DONE, stands:** 0.1 (monorepo foundation). Its scaffolds contain no machine logic.
- **ACTIVE, superseded into the P-series:** 0.12 → P1; 0.13 → P4/P5; the panel-facing slice
  of 0.3 → P2.
- **DEFERRED (machine-side, not this delivery):** 0.2, 0.4, 0.5, 0.6 (server engine half),
  0.7, 0.8, 0.9, 0.10, 0.11, 0.14, 0.15, 0.16. Each file carries a deferral banner naming
  this ADR. Panel-side RBAC *checks* survive inside P-series tickets (18 §4.2); the
  approval/audit **semantics** of ADR-0013 remain the contract the mocks must present.
- **NEW: panel tickets P1–P8** (`docs/tickets/P*.md`) implement the 18 §11 sequence with the
  18 §12 acceptance criteria and the 18 §7.2 fourteen mock scenarios.

### D3 — Repository boundary

The thirteen 0.1 packages **stay as frozen inert placeholders** — removing them would churn
a green, committed ticket for no scope gain, and doc 18 §2 forbids *implementing* machine
work, not the existence of empty named boundaries. They must not gain content during this
scope (workspace-integrity test enforces membership; a placeholder-purity check joins it in
P2). Three panel packages are added per 18 §10: `panel-domain`, `machine-gateway`,
`mock-data`. The 16 §3 thirteen-package membership contract is hereby amended to
thirteen-frozen-plus-three-panel.

### D4 — Mock-first architecture is binding

The 18 §6 `MachineGateway` interface is the sole seam between UI and machine data. Components
never import fixtures; React Flow objects never become the integration contract; mocks are
deterministic, schema-validated, scenario-switchable (18 §7). The ADR-0012 state machine and
ADR-0014 event taxonomy become the *presentation vocabulary* of the mocks and the provisional
contract set of 18 §9 — the panel may rely on them but must not impose them on the machine
build without coordination (18 §9 last paragraph).

### D5 — What the panel build must never do

Verbatim from 18 §5, enforced by review on every P-ticket: no machine implementation, no
provider calls, no orchestration/queues/schedulers, no PostgreSQL/Redis/MinIO added for
machine needs, no prompts or reasoning policies, no UI state claiming real machine work
happened.

## Reported conflicts (18 §13)

| Existing instruction | Doc 18 ruling |
|---|---|
| 15 §2 tickets 0.2–0.16 build compose/DB/runtime/gateway/APIs in R0 | Deferred to the machine build (18 §2, §5) |
| 16 §3 thirteen-package contract; 0.1 AC-2 exact membership | Amended by D3 (13 frozen + 3 panel) |
| ADR-0014 D4 ticket 0.16 owns the R0 API band | Deferred; the band becomes the provisional 18 §9 integration surface |
| ADR-0016 compose/SMTP/SSRF supply chain | Deferred with its tickets; SSRF policy re-enters with the real gateway |
| 00 §6 "what to build first" (registries, gateway, runtime) | Superseded by the 18 §11 sequence |
| Restored R0 exit criteria (ADR-0011) touching DB/runtime | Carried by mock scenarios where UI-visible; otherwise deferred with 0.15 |

## Consequences

- The demo target changes: end-to-end panel on mock scenarios, no live infrastructure (18 §12).
- The five-seam testing strategy narrows for this scope: Seam A (panel DTO contracts), a new
  adapter-contract seam at `MachineGateway`, and Seam E grow; Seams B/C/D sleep with the
  machine build.
- ADRs 0012–0016 are **not** revoked — they are the recorded semantics the mocks present and
  the machine build inherits.
