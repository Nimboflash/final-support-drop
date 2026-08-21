# ADR-0018 — Owner Conditions on Panel-First Execution, and the ADR-0011 Ratification

**Status:** Accepted (owner ruling, delivered verbatim 2026-08-21)
**Date:** 2026-08-21
**Scope:** the P-series execution plan, ticket P2's contracts, the repository freeze set

## Context

The human owner granted **conditional approval** of the panel-first plan (ADR-0017) with five
binding conditions and, in the same ruling, ratified ADR-0011 as amended by ADR-0017. This ADR
records the ruling; the affected documents are edited to match and cite this number.

## Decision

### D1 — PanelGateway joins P2; MachineGateway stays untouched

Ticket P2 defines a second read-only contract, **`PanelGateway`**, for exactly the entity
groups the owner named: **Programs, Weekly Lenses, approval lists, requests, and
notifications**. The doc 18 §6 `MachineGateway` interface remains character-for-character
unchanged and gains no members. `PanelGateway` supersedes the replan's provisional
`WorkspaceDirectory` naming before any implementation existed. Entities in (18 §7.1) carried
by neither gateway (users/roles — session concern; research sources and coverage gaps —
standalone view data) keep their fixtures in P3, and their transport contract is an open
P8 coordination decision, not a silent extension of either gateway.

### D2 — Sequential execution

P-tickets run strictly one at a time: **P2 starts only after P1 completes.** P2's dependency
set becomes `["P1"]`; the frontier is always exactly one ticket. The parallel-lanes provision
of 15 §11 is suspended for the P-series.

### D3 — Implementation freeze through P8

`apps/worker` and the eleven machine-oriented packages (`core`, `studio`, `contracts`, `db`,
`pipeline`, `ai-gateway`, `retrieval`, `storage`, `config`, `observability`, `testing`) are
**deferred and implementation-frozen through P8**: no content beyond their committed 0.1
placeholders may land in them during panel scope. The P2 placeholder-purity check covers all
twelve (eleven packages + `apps/worker`). Panel-active workspaces: `apps/web`,
`packages/ui`, `packages/workflow-ui`, and the three new panel packages (`panel-domain`,
`machine-gateway`, `mock-data`).

### D4 — P3 coverage is binding

P3 must ship fixtures for **every** (18 §7.1) mock entity class and **all fourteen**
(18 §7.2) scenarios. This is already written into P3's in_scope and AC set; this ADR makes it
an owner condition — neither list may be trimmed without a new owner ruling.

### D5 — Authority order ratified

The owner ratified ADR-0011 **as amended by ADR-0017**. The governing order, verbatim:

> Brand DNA v3.0 → doc 18 → recorded decisions and ADRs → ADR-0010 → implementation
> documents 00–17 → dated sources → Master Spec v1.0 → supporting PDFs.

ADR-0011's status advances from Proposed to **Accepted (ratified)**. The pending-ratification
flags in CLAUDE.md and ADR-0011 are cleared.

### D6 — Execution instruction

After these documentation corrections: **proceed with P1 only**, on typed deterministic
mocks; Machines 01–05 are neither built nor invoked.

## Consequences

- The ticket index's frontier text, graph (P1 → P2 edge), P2's YAML, and CLAUDE.md are
  updated to cite this ADR.
- Single-lane execution slows wall-clock delivery in exchange for review focus; the P8 hard
  stop (18 §11) is unchanged.
