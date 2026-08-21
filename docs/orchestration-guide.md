# Orchestration Guide — Running the DROP Studio OS Build as a Governed Multi-Agent Process

**Status:** Operating manual. This document is procedure, not contract. It derives from the
delivery bundle and the VSO framework (`executive-multi-agent-model/`) and never overrides either.
Where it reflects a repaired defect, the repair is recorded in ADR-0011 through ADR-0016 — the ADR
is the authority, this guide only operationalizes it.

## 1. Precedence

When any two texts disagree during the build, resolve in this order:

1. **The bundle's governance hierarchy as recorded in `DELIVERY_README.md` ("Authority
   hierarchy").** Per ADR-0011 D1 this order governs and `00_READ_ME_FIRST.md` §3 defers to it.
   The ruling is pending a one-line human-owner ratification (flagged in ADR-0011); until it
   lands, build under the DELIVERY_README order and flag any conflict whose outcome would flip
   under the alternative order.
2. **Repair ADRs 0011–0016** (`docs/adr/`), which amend specific bundle statements under the
   bundle's own stop-and-write-an-ADR protocol. They outrank the statements they amend, nothing
   else.
3. **The bundle documents** in the DELIVERY_README order: Brand DNA v3.0 → decisions in 03 →
   ADR 0010 → numbered implementation docs 00–17 → dated sources → Master Build Spec v1.0 →
   supporting PDFs.
4. **The VSO framework** (`executive-multi-agent-model/framework/`) — method and org mechanics
   only; it never decides a product or architecture question.
5. **This guide** — operating procedure only. It has no authority over the build contract; if it
   conflicts with anything above, this guide loses and must be corrected.

## 2. Role mapping — VSO roster onto this build

The VSO canonical roster (framework/02) maps onto the DROP build as follows. Every role keeps the
VSO invariants: one owner per decision, no self-approval, gates outrank status, orchestrator holds
no decision authority (framework/05).

| VSO role | On this build | Authority and boundary |
|---|---|---|
| `orchestrator` | Session-level dispatch: selects the next permitted ticket, opens the build session with the doc 16 §4 prompt, validates the structured handoff, records state, triggers reviews and gates. | **No decision authority.** Never resolves a source conflict, never approves work, never overrides a red gate, never repairs an incomplete handoff silently (framework/05). |
| `backend-engineer` | The default implementation lane: contracts, db, registries, gateway, runtime, API band. One approved ticket at a time (00 §5.1; 16 §4). Builds the runtime to the ADR-0012 state machine, the 0.16 API band to ADR-0014, registries to ADR-0015. | Implements; never authors its own acceptance criteria and never decides policy. |
| `frontend-engineer` | Activates at tickets 0.12 (FA-first RTL foundation) and 0.13 (dashboard skeleton); also owns ticket 0.5's UI screens, which depend on 0.12 per ADR-0014 (server-side auth in 0.5 is unblocked). Follows the UI work protocol (16 §11). | Barred from redefining API contracts or run semantics; canvas state is never durable authority (14 §7). |
| `code-reviewer` | Independent review of every ticket using the doc 16 §8 prompt verbatim: adversarial, evidence-only, refute-before-confirm, smallest safe fix, no implementing. | Reviews against ticket + sources + ADRs, not against the builder's narrative. Findings return the ticket to the lane. |
| `qa-engineer` | Owns what blocks, not what builds: the doc 14 seams, layers, standing invariants (14 §4), release acceptance gates (14 §14), and the Release 0 exit criteria **including the four restored by ADR-0011 D2** (mock structured output validates/stores; failed runs visible with stage states; prompt versions from configuration; disabled-user sign-in blocked with history intact). "Program" in the R0 exit means versioned Project/Program rows via schema+API (0.4/0.7 scope); the Program creation flow stays Release 1 (ADR-0011). | Gates are non-overridable. A failed blocking gate stops the release; nobody, including the CTO, waves it through. |
| `security-engineer` | Authority over doc 11 plus ADR-0013 and ADR-0016: single approval write path, approver distinctness (N distinct human actors, DB-enforced), HUMAN-only approval decisions, SSRF outbound-fetch policy (scheme allowlist, public-IP-only after DNS resolution, redirect re-validation, size/time caps, no outbound credentials), supply-chain mirror policy. Writes and owns the doc 14 §9 security tests plus the ADR-0013/0016 negative tests. | Holds the one scoped veto (§3 below). Joins review on any ticket touching auth, approvals, audit, storage or outbound fetch. |
| `cto` | Arbitration terminus: when the §1 precedence order cannot resolve a conflict, the CTO drafts the new ADR and owns the technical ruling inside it. | Never overrides QA gates or the security veto; never merges the reviewer role into itself (framework/02 overlap rulings). |
| `product-manager` | Drafts decision-ready summaries for the human owner: gate status, blocker escalations, ADR ratification requests, release acceptance packets. | **Never decides.** Scope and acceptance decisions belong to the human owner; the PM's product is the summary, not the ruling. |
| `human-owner` | The Workspace Owner / DROP Guardian / `FA_EDITORIAL` holder. Every approval gate in the system terminates here: release acceptance (14 §14.8), ADR ratification (starting with ADR-0011 D1), client gates (§7). Seeded development actors stand in until real assignments exist; production gates stay blocked until then (15 §12; 00 §7). | The only authority that accepts a release or ratifies an ADR. |

## 3. Project profile

This build runs the **`data_or_ai` profile with `high_risk` traits** (see
`executive-multi-agent-model/project-profile.example.yaml`): AI pipelines and registries activate
the data_or_ai gate set; immutable approvals, money-adjacent governance and fail-closed human gates
justify high_risk's "all human approvals on".

- **Active:** orchestrator, product-manager, cto, backend-engineer, frontend-engineer (from 0.12),
  qa-engineer, security-engineer, code-reviewer, human-owner.
- **Scoped veto** (profile requires naming it): the security-engineer may veto any change that
  *opens a second write path to approvals or audit, weakens approver distinctness, or permits an
  unfiltered outbound fetch from the deployment origin* (ADR-0013, ADR-0016). The CTO and
  orchestrator cannot overrule it; a veto ships with an alternative.
- **Dormant roles and why:** `ml-engineer` (mock adapters only until the provider gate clears — no
  model work exists); `data-engineer` (no separate data substrate; PostgreSQL is the backend
  lane's, doc 06); `database-engineer` (migrations stay inside the backend lane so the migration
  file set has exactly one writer, 15 §11); `software-architect` (the bundle is the frozen
  architecture; the CTO only arbitrates); `product-owner`, `ux-design-system` (doc 09 specifies
  the design system; frontend implements with provisional tokens), `test-automation-engineer`
  (suites are built inside tickets; QA owns the gates), `devops-engineer` (Compose/ops work is
  ticket scope, 0.2/0.15, under ADR-0016's mirror policy), `release-manager` and
  `documentation-engineer` (their functions are carried by the QA gate list, the ADR discipline
  and the human-owner acceptance — do not add roles that would dilute single ownership).

## 4. Lanes and parallelism

**Serial spine (15 §11), never parallelized:**

```text
contracts (0.3) -> database (0.4) -> registries (0.7, 0.8) -> gateway (0.9) -> pipeline runtime (0.10)
```

**Fan-out after the contracts freeze (0.3 done):** UI foundation (0.12), storage (0.14), and
worker scaffolding may proceed in parallel lanes. Ticket 0.16 (workflow definition/version
CRUD+validate+publish, run commands, SSE, approval endpoints — created by ADR-0014) sits on the
spine after 0.10 begins and coordinates with it. Corrected dependencies (ADR-0014): 0.13 depends
on 0.4, 0.10 **and 0.16**; 0.11 additionally depends on 0.8; 0.5's UI screens depend on 0.12.

**Files that must never be edited in parallel** (one writer at any time; orchestrator enforces
file ownership per framework/15):

- `packages/contracts/**` (the frozen seam everything fans out from);
- any migration or schema file in `packages/db` (never two lanes in the same migration chain);
- approval and audit modules — the single approval write path of ADR-0013 must have a single
  code owner per ticket;
- published-workflow versioning/publish logic (immutability semantics, 15 §11);
- root toolchain config after 0.1 (tsconfig, lint, build scripts);
- `CLAUDE.md` and every governance document (§5 — ADR-only).

## 5. Contamination and independence rules

1. **The implementation lane never edits its own acceptance criteria.** Ticket
   `acceptance_criteria` (docs/tickets/, 15 §9 template), the doc 14 gate text, the doc 15 exit
   criteria and the standing invariant tests (14 §4) are QA-owned; a lane that needs them changed
   requests an ADR. Weakening a test "to make the code pass" is prohibited by 14 §1.
2. **The reviewer reads the ticket and its sources, not the builder's chat.** Inputs to review:
   the ticket file, the traceability sources (doc 17), affected ADRs, the diff and the tests.
   The structured handoff (§6) is metadata, not evidence. Attempt to refute each finding before
   confirming it (16 §8).
3. **Governance documents change only via ADR.** `docs/adr/`, ticket acceptance criteria, the
   implementation bundle and DELIVERY_README are never edited by an implementation session. A
   repair enters the repo as a new ADR plus the amendment it authorizes — never as a silent edit.
4. **No self-approval anywhere.** Builder, reviewer, and acceptance authority are three distinct
   actors per ticket — the org-level mirror of ADR-0013's distinct-approver rule for the product.
5. **The orchestrator writes coordination state only.** Gate results, approvals, security vetoes
   and release decisions are written by their authorities (framework/05, framework README
   invariants).
6. **Incomplete handoffs are rejected, never silently repaired** (framework/09 via USAGE §7).

## 6. The per-ticket loop

The loop from 15 §10, run with the doc 16 session mechanics:

1. **Dispatch.** Orchestrator confirms the previous handoff, dependencies and gate status, then
   opens a session with the doc 16 §4 prompt for exactly one ticket.
2. **Read.** The lane reads the ticket file, its traceability sources (doc 17), affected ADRs
   (including 0011–0016 where they touch the ticket), contracts and tests; runs the pre-ticket
   checklist (16 §5).
3. **Freeze tests/contracts** at the agreed seam (14 §1–2) before implementation.
4. **Implement** shared business logic first, then adapters/UI (15 §10; business rules never in
   routes or components, 00 §5.3).
5. **Check.** `pnpm typecheck / lint / test / build`, plus `test:db` when schemas change and
   `test:e2e` when critical journeys change (16 §7).
6. **Independent review** by code-reviewer with the 16 §8 prompt; security-engineer joins on
   auth/approval/audit/storage/outbound-fetch tickets. Findings return the ticket to the lane;
   retry history is recorded.
7. **QA verification** of the ticket's acceptance criteria and any release-gate criteria it
   completes.
8. **Commit with the ticket ID** and produce the structured handoff — verbatim from 16 §9:

```markdown
## Ticket handoff
- Ticket: <ID and title>
- Commit: <hash>
- Scope completed: <bullets>
- Contracts added/changed: <list>
- Migrations: <list and verification>
- Permissions/failure states: <list>
- Tests added: <list by seam>
- Checks: typecheck / lint / test / build results
- Independent review: pass or findings
- Deviations: none or linked ADR/decision
- Known limitations: <bullets>
- Next permitted ticket: <ID>
- Release gate status: waiting/pass/block reason
```

9. **Close.** Orchestrator validates the handoff for completeness, updates project state, and
   proposes the next permitted ticket. At a release boundary, the product-manager assembles the
   release report (16 §13) and the human owner accepts or blocks. No next agent reconstructs a
   ticket from chat history (16 §9).

## 7. Stop conditions and client gates

**Stop and request a named decision** (doc 16 §6) when a change would: alter machine
responsibility/order; grant a new role approval authority; overwrite or delete historical data;
require a missing provider credential or transmission approval; use Pro template source without a
confirmed license; run a migration that cannot preserve data/versions; expand into venue
operations, partner management or automatic publishing; hit a source conflict the §1 order cannot
resolve; or leave the ticket untestable at an agreed seam. On a stop: orchestrator parks the
ticket and raises a blocker with an owner; product-manager drafts the decision-ready summary; the
CTO arbitrates or drafts the ADR; the human owner decides. Do not stop for replaceable details
already delegated to configuration (16 §6).

**The eight client gates** (17 §5; build behavior from 15 §12). Gates fail closed; the build
continues on the documented fallback:

| # | Gate | Blocks | Build behavior until cleared |
|---|---|---|---|
| 1 | React Flow Pro license | Direct Pro-template source use | Open-source React Flow only |
| 2 | Workspace Owner assignment | Production UAT | Seeded dev actors only |
| 3 | DROP Guardian assignment | Direction/rule production approvals | Gate remains blocked |
| 4 | `FA_EDITORIAL` holder | Publishable Persian approval | Gate remains blocked |
| 5 | Real project brief | R1 creative acceptance | Synthetic fixtures, mechanics only |
| 6 | Live AI provider/config approval | Live AI execution | Mock adapter; manual dashboard |
| 7 | Final visual identity values | Final visual sign-off | Provisional centralized tokens |
| 8 | Persian/Iranian source vetting | R2 production research | R0/R1 build unaffected |

Every release additionally requires the eight release acceptance gates of 14 §14 (green tests,
typecheck/lint/build, migration verification, independent review, security review where required,
docs/traceability, tagged commit, human-owner acceptance). Do not start the next release while a
blocking gate fails.
