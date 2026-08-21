# ADR-0011 — Authority Hierarchy and Release 0 Acceptance Restoration

**Status:** Proposed — pending human-owner ratification (a one-line ruling; see Decision D1)
**Date:** 2026-08-21

## Context

The adversarial review of the delivery bundle (review synthesis, 2026-08-21) verified two authority defects at the governance root.

**1. Contradictory authority hierarchies (review critical finding 1).** The bundle contains two documents that each command mandatory use of a different precedence order:

- `DELIVERY_README.md` ("Authority hierarchy") ranks: Brand DNA v3.0 → decisions recorded in 03 → ADR 0010 → the remaining numbered implementation documents → the dated sources (`project-master-document.md`, `spec-v0.md`, `execution-plan.md`) → Master Build Spec v1.0 → the supporting PDFs.
- `00_READ_ME_FIRST.md` §3 ranks: Brand DNA v3.0 → ADRs 0001–0009 → `project-master-document.md` → `spec-v0.md` → `execution-plan.md` → ADR 0010 "for dashboard and workflow UI implementation only" → Master Build Spec v1.0 → the PDFs. It never ranks implementation documents 04–17 at all, and it scope-limits ADR 0010.

Any conflict between an implementation document (04–17) and `spec-v0.md` or `project-master-document.md` resolves differently under the two orders, so the pack's own stop-and-write-an-ADR conflict protocol (DELIVERY_README "Authority hierarchy"; 00 §3 last paragraph) has no deterministic root.

**2. Release 0 acceptance authority silently rewritten in both directions (review major finding 1).** Doc 00 §8 makes docs 14 and 15 the conformance authority, yet doc 15 §2 ("Release 0 exit criteria"):

- **drops** four source exit criteria with no decision recorded in 03 or ADR 0010: mock structured output validates/stores; failed runs visible with stage states; prompt versions come from configuration; disabled-user sign-in blocked with history intact; and
- **adds** "A Project, Program, … can be created/versioned" to the R0 exit while Program creation is a Release 1 build item (15 §3 "Structured Project Brief and Program creation"), making the R0 gate either formally unsatisfiable or an unrecorded scope pull-forward.

## Decision

### D1 — Authority hierarchy

1. **`DELIVERY_README.md`'s "Authority hierarchy" order governs.** It is the single conflict-resolution root for the bundle.
2. **`00_READ_ME_FIRST.md` §3 is subordinated.** It is amended to defer verbatim to `DELIVERY_README.md` and is retained only as a description of source lineage (which dated documents consolidated ADRs 0001–0009). Where the two orders disagree, 00 §3 has no force.
3. This ruling is **Proposed pending a one-line human-owner ratification**, because both conflicting files claim mandatory authority and only the client can settle which was intended. **Recommended ruling: confirm the DELIVERY_README order.** Rationale: the recorded decisions (03), ADR 0010 and the numbered implementation documents are the pack's whole purpose — they exist precisely to reconcile and operationalize the dated sources. Ranking the raw dated sources above them would reopen every reconciliation already made and convert each build-time conflict into contestable rework. Until ratification lands, builders proceed under the DELIVERY_README order and flag any conflict whose outcome would flip under the alternative order.

### D2 — Release 0 exit criteria restored

The following four source exit criteria are **restored** to the Release 0 exit list in doc 15 §2, alongside the six criteria already listed there:

1. Mock structured output validates and stores (structured output from the mock AI adapter is schema-validated and persisted as an artifact version; ticket 0.9 scope, 15 §2).
2. Failed runs are visible with stage states (a run that fails surfaces in the execution view with its per-stage states and failure classes; tickets 0.10/0.13 scope).
3. Prompt versions come from configuration (prompts resolve from the versioned prompt registry, never hardcoded strings; ticket 0.8 scope, cf. 07 §6 manifest freezing).
4. Disabled-user sign-in is blocked with history intact (session revocation on membership disable per 11 §8, while audit/approval history survives per 11 §13 "Do not let a user delete history by disabling their account"; tickets 0.5/0.6 scope).

The per-ticket specification files authored against the 15 §9 template must carry these criteria as acceptance criteria of the owning tickets named above.

### D3 — "Program" in the Release 0 exit

The first R0 exit criterion ("A Project, Program, artifact, workflow version and run can be created/versioned", 15 §2) is interpreted and fixed as follows:

- **In scope for R0:** Project and Program records exist as versioned rows created through schema and API — the `studio` tables in ticket 0.4 and registry/provenance wiring in ticket 0.7, exercised through the endpoints of doc 10 §4.1. Creating a Program row via `POST /api/v1/studio/programs` with a synthetic fixture is sufficient for R0 exit. (Endpoint implementation ownership is assigned by ADR-0014, ticket 0.16.)
- **Stays Release 1:** the Program creation *flow* — structured Project Brief, Reference Board, Machine 01 concept work and the human concept gate (15 §3). No R0 ticket pulls this forward.

## Consequences

- The conflict-resolution protocol has a deterministic root; every reconciliation recorded in 03 stands unless the human owner overrules it. All build-time source conflicts now resolve identically for every implementing session.
- One open client action remains: the one-line ratification of D1. It is tracked with the doc 15 §12 client gates and blocks nothing in Release 0 except a conflict whose outcome would flip under the alternative order (none is currently known).
- The Release 0 gate becomes satisfiable: the exit list no longer names a flow that is not built in R0, and the four restored criteria re-enter conformance authority (00 §8) instead of silently disappearing.
- Tickets 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.10 and 0.13 gain explicit acceptance criteria from D2/D3; the ticket-file authoring pass must include them.
- Doc 14's standing invariants are unaffected; the restored criteria add positive tests, they do not weaken any existing one.

## Supersedes / Amends

- **Amends** `implementation/00_READ_ME_FIRST.md` §3: subordinated to `DELIVERY_README.md` "Authority hierarchy"; retained as lineage description only.
- **Amends** `implementation/15_RELEASE_PLAN_AND_TICKETS.md` §2: four exit criteria restored (D2); first exit criterion clarified per D3.
- **Clarifies** ticket 0.4/0.7 scope in 15 §2 (Project/Program rows via schema+API) without renumbering the 0.1–0.15 plan (15 §1 amendment rule preserved).
- Related parallel repairs: ADR-0014 (API ownership, ticket 0.16), ADR-0012 (state machine), ADR-0013 (approval write path).
