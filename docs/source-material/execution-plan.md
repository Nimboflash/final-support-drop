# DROP OS — Studio Module: Execution Plan

**Version:** 1.0 — 2026-08-15
**Status:** Approved plan of record for the build. Companion to
[`project-master-document.md`](project-master-document.md). No implementation has started;
this document defines how it will run when it does.

---

## 1. Build method: a governed agent organization, not a solo coding stream

The build itself runs under the **VSO framework** ([`../executive-multi-agent-model/`](../executive-multi-agent-model/))
with Claude Code as the execution engine and the repo's 41 skills as the working vocabulary.
The same philosophy the product enforces on creative work — one owner per decision, validated
handoffs, non-overridable gates, no self-approval — governs the building of the product.

### 1.1 VSO configuration for this project

- **Profile:** `standard` base (UI + API + workers), with `data_or_ai` additions for the
  pipeline/gateway work. Activated roles beyond core: `frontend-engineer` lane,
  `database-engineer` (migrations discipline), `release-manager` (from Release 4),
  `documentation-engineer` (bilingual docs debt).
- **Role mapping:**

| VSO role | Held by |
|---|---|
| `human-owner` | Nima — final approval on every release gate |
| `orchestrator` | The main Claude Code session — coordinates, never decides scope |
| `product-manager` | Agent lane guarding spec §3 scope + ADR 0007 scope-protection rule |
| `cto` / arbiter | Agent lane owning architecture conformance to ADRs 0003/0006/0007/0009 |
| implementation lanes | Per-ticket fresh agent contexts (backend / frontend / db) |
| `qa-engineer` | Gate-runner: spec §19 test layers per ticket and per release |
| `security-engineer` | Scoped veto: auth/RBAC, injection defenses, fail-closed paths, secrets |
| `code-reviewer` | Independent review agent — **never the implementing context** |

- **Non-negotiables inherited from VSO:** implementation and approval are separate contexts;
  a failed blocking gate stops the release; incomplete handoffs are rejected, not repaired;
  interrupted work resumes from committed state, since every ticket ends in a commit.

### 1.2 The per-ticket loop

Each ticket is sized for **one fresh agent context** and runs:

```
read ticket + the ADR/spec sections it implements
  → /tdd at the pre-agreed seam (tests first, frozen before implementation)
  → implement (business logic in packages/, never in routes)
  → /code-review (independent context)
  → commit (conventional message, ticket ID)
```

Multi-agent **workflows** (parallel fan-out with adversarial verification) are used at three
points: contract design reviews (judge panel over alternative schema shapes), per-release audit
sweeps (independent finders + refuting verifiers over the diff), and the golden-set regression
runs from Release 6 onward.

### 1.3 Parallelism rules

Parallel lanes open **only after contracts freeze** (VSO file-ownership rule):

- **Serial spine:** contracts → db schema → registries → gateway → pipeline runtime (the
  Release 0 dependency table is the authoritative graph; the spine names its longest path).
  Each layer freezes its Zod contracts before dependents start.
- **Parallel once contracts exist:** UI components ∥ worker stages ∥ storage adapter;
  machine-by-machine work in later releases; FA string authoring ∥ feature work.
- **Never parallel:** migrations on the same schema; edits to `packages/contracts`; anything
  touching approval/audit semantics.

## 2. Release plan

Releases follow spec §22, amended by ADRs. Each release ends with: green test suite, independent
review sweep, a tagged commit, and a human-owner acceptance gate. **Do not start release N+1
before N's gate passes.**

### Release 0 — Foundation (the big one; ADR 0002 grew it deliberately)

Builds the platform everything else stands on. **No unresolved client input blocks Release 0
construction** — AI runs against mock adapters.

| # | Ticket | Depends on |
|---|---|---|
| 0.1 | pnpm monorepo scaffold: `apps/web`, `apps/worker`, nine packages, strict TS, Vitest wiring | — |
| 0.2 | Docker Compose reference stack: Postgres, Redis, MinIO, web, worker, Nginx; env via `packages/config` (typed, validated) | 0.1 |
| 0.3 | `packages/contracts` v1: Zod schemas for spec §11/§12 + ADR schemas (workspace, membership, role/capability assignment, approval policy/event, module, content_artifact, project_brief, run manifest, stage status) — with `schema_id`/`schema_version` envelope | 0.1 |
| 0.4 | `packages/db`: Drizzle schema mirroring `core.*`/`studio.*`, committed SQL migrations, integration-test harness | 0.3 |
| 0.5 | Identity: Better Auth (email/password, invitations only, no public signup) on Postgres | 0.4 |
| 0.6 | RBAC domain module: actors, roles, capabilities, scopes, approval policies; server-side checks; audit events; membership lifecycle incl. user disable (`DISABLED` — never hard-delete, history preserved and attributed) | 0.4, 0.5 |
| 0.7 | Artifact Registry + Machine Run Registry: versioning, immutability guards, provenance links | 0.4 |
| 0.8 | Prompt / Rule / Example registries: file-backed seeds + DB version metadata; Guardian-only rule publishing (enforced via 0.6 RBAC) | 0.6, 0.7 |
| 0.9 | AI Gateway: model profiles, mock adapter, structured-output validation via contracts, raw-response storage, `PROVIDER_CONFIGURATION_REQUIRED` state | 0.3, 0.4 |
| 0.10 | Pipeline runtime: BullMQ flows, stage state machine (ADR 0009), idempotent stages, checkpoints, budget accounting, Postgres-authoritative reconstruction | 0.7, 0.9 |
| 0.11 | Run manifests: freeze-on-start, immutable storage, run/version comparison queries | 0.10 |
| 0.12 | FA-first RTL shell: `fa-IR`/`rtl` root, Vazirmatn bundled, direction-aware `packages/ui` primitives, externalized Persian strings, Jalali date display utilities | 0.1 |
| 0.13 | Dashboard skeleton: login → workspace → `/studio/projects` list; Persian statuses; audit view | 0.6, 0.12 |
| 0.14 | `packages/storage`: S3-compatible object-storage adapter (MinIO fallback, ADR 0006), signed/streamed file access, artifact-record linkage (spec §14.4) — required before Release 1's file/image reference intake | 0.2, 0.3, 0.7 |
| 0.15 | Release 0 audit sweep: security review (authz, fail-closed paths, secrets), independent code review, §19 layers 1–3+7 green | all |

**Exit criteria:** a project, artifact and machine run can be created and versioned; structured
(mock) model output validates and stores; failed runs are visible with stage states; prompt
versions come from configuration; two users with different roles see permission-correct Persian
UI; a disabled user can no longer sign in while their past approvals and audit events remain
intact and attributed; Redis flush loses nothing.

### Release 1 — Machine 01 vertical slice

Structured project-brief intake and persistence (ADR 0008 `project_brief` schema — title,
program_type, lens_mode, objective, context, audience, time window, constraints, required
outputs, materials, partners, notes), Reference Board (with `why_selected / important_aspect /
do_not_copy / intended_use / submitted_by` — reconciled with spec §11.2's `added_by`:
supplier-of-reference vs record-creator), reference analysis, Pattern & Tension Map, concept
generation (3–5, `program_type` + `lens_mode`), independent critique (separate model profile),
comparison scorecard, human decision with structured feedback, candidate-rule extraction.
Mechanics proven on synthetic fixtures; **the creative slice is accepted only on the client's
real brief** (ADR 0008).

### Release 2 — Machine 02 controlled research

Source Registry CRUD in dashboard (geography/language/access-method dimensions, full ADR 0008
`source_status` lifecycle — `CANDIDATE | VALIDATED | ACTIVE | DEACTIVATED | ARCHIVED`,
human-only promotion, no destructive removal of sources used by historical runs), Research Plan
freeze with dual-coverage minimums and governed manual plan changes (approval event + rationale,
ADR 0004), three-pass retrieval, deployment-origin reachability checks, discovery
classification, evidence extraction with claim-level citations, Persian synthesis,
contradiction map, candidate-pool construction (music / film / book / art & design pools +
audience & urban signals, source-linked, no premature selection — spec §7.14/§7.15),
evidence-slot coverage + saturation gate, human `RESEARCH_REQUEST` flow into Machine 05's feed
(stub feed until R5).

### Release 3 — Machine 03 direction & Concept Bible

Candidate normalization (type-specific metadata preserved), dedup/clustering, role assignment,
`DROP FIT` / `LENS RELEVANCE` hard gates by `programming_layer`, weight profiles, Direction
A/B/C construction, direction scoring + confidence bands, Guardian approval, immutable Concept
Bible with `lens_territories`.

### Release 4 — Machine 04 outputs & handoff extraction

Output classification and priority, narrative distribution, Output Manifest (with ADR 0005
`language_policy`), `SpecializedOutputAgent` interface + registry routing + stub agents,
embedded validation gates, `FA_EDITORIAL` review gate wiring, Execution Manifest extraction.

### Release 5 — Machine 05 calendar, feed & the Weekly Lens workflow

Portfolio/Concept calendars (Solar Hijri display), request generator from Execution Manifests,
request feed with the full filter set, ownership and dependency states (request readiness
respects dependencies — dependency-blocked requests cannot start), blocker tracking (blockers
visible on requests and calendar items), structured feedback, revision loop to Machine 04,
completion records — **plus the ADR 0001 Weekly Lens child workflow**: lens editions from
`lens_territories`, mandatory current-context scan, lens approval, output commissioning.

### Release 6 — Hardening & real-run learning

Golden regression suite (including prompt-injection and fabricated-candidate cases), cost
dashboard, run-comparison UI (ADR 0009), failure diagnostics, feedback analysis, proposed
prompt and rule improvements derived from feedback (spec §5.7 learning-layer proposals —
versioned, approval-gated, applied only through the ticket 0.8 registries, never auto-applied),
permission hardening, data export policy + backup/restore + migration drill on a second host
(portability proof), UAT with client-assigned roles.

## 3. Client-side track (parallel, non-blocking until its gates)

| When | Client action |
|---|---|
| During R0–R1 | Name Workspace Owner, Guardian, `FA_EDITORIAL` holder (one person may hold several, recorded per-hat) |
| During R1–R2 | Write the one real project brief |
| Before live AI | Entity, permitted providers, credentials via server config; external-data-transmission approval |
| Before R2 production research | Vet Persian/Iranian seed candidates; source access credentials where needed |
| R6 | UAT from ordinary Iranian networks; acceptance |

## 4. Verification strategy

- **Per ticket:** TDD (tests frozen first), typecheck, lint, independent `/code-review`.
- **Per release:** spec §19 layers walked explicitly (schema → domain rule → state transition →
  prompt contract → source validation → provenance → permission → workflow integration →
  golden → E2E); adversarial multi-agent audit sweep over the release diff (finders + refuting
  verifiers; only confirmed findings block).
- **Standing invariant tests** (never waived): hard-gate failures cannot be score-offset;
  machine failure never defaults to approval; blocked sources stay in coverage denominators;
  frozen-plan edits require an approval event with rationale; approval history is append-only;
  `SELF_APPROVAL` is always labelled; Persian UI renders RTL with no hardcoded strings; a Redis
  flush is fully recoverable from Postgres.
- **Security review** at R0, R4 (output boundary) and R6, with the scoped-veto rule: a security
  block ships with an alternative, and only the human owner can accept residual risk.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI provider/entity unresolved | Gateway + mocks keep all releases buildable; `PROVIDER_CONFIGURATION_REQUIRED` keeps the product usable |
| Iranian hosting unknowns (TLS, images, egress) | Compose reference stack, no mandatory PaaS, portability drill in R6; test from ordinary Iranian networks early |
| Western sources unreachable from deployment | ADR 0004 machinery is designed for it: slots, substitutions, human retrieval |
| RTL/bidi defects | Direction-aware primitives from ticket 0.12; Playwright RTL smoke tests; no LTR-only CSS allowed into `packages/ui` |
| FA editorial bottleneck | Gate is per-publishable-artifact, not per-ticket; automation pre-flags; client names holder early |
| Scope creep toward venue operations | ADR 0007 scope-protection rule; `product-manager` lane rejects at triage |
| Client approval latency | `WAITING_FOR_APPROVAL` parks runs losslessly; request feed makes pending decisions visible |
| Agent context limits | Tickets sized for one context; VSO handoffs; committed state is the only memory |
| Synthetic-data contamination of taste | ADR 0008 boundary enforced at review: no prompt calibration or creative acceptance on fixtures |

## 6. Working agreements

- ADRs are the change mechanism: material decisions land as `docs/adr/NNNN-*.md` before code.
- The frozen spec v1.0 is never edited; a consolidated spec v1.1 is cut only after V0 ships.
- Every commit message references its ticket; every release is tagged.
- English for engineering docs and identifiers; Persian for everything users see; bilingual
  glossary maintained from Release 0.
- The build starts only on the human owner's explicit go — and stops at every release gate for
  the same.
