# DROP OS — Studio Module: Project Master Document

**Version:** 1.0 — 2026-08-15
**Status:** Consolidated definition of record. Derives from Master Build Spec v1.0 + Brand DNA
v3.0 + ADRs 0001–0009. Where this document and an ADR conflict, the ADR wins; where an ADR and
the spec conflict, the ADR wins.
**Audience:** the builder, build agents, and the client's technical reviewers.

---

## 1. What we are building

**DROP OS** is the long-term internal operating platform for DROP — the House of Taste
(پاتوقِ سلیقه), a curated cultural and hospitality brand in central Tehran. **DROP Studio OS**
is its first bounded module and the current build: a Persian-native, multi-user web system that
takes a project brief and turns it — through five governed AI machines with human gates — into
researched, evidenced, approved creative programs, and from those programs derives Weekly Lens
editions and concrete outputs (articles, playlists, briefs, landing pages, print packs,
operator guides).

It is a **creative operating system, not a chatbot**: every artifact is versioned, every claim
cites evidence, every approval is attributed, every run is reproducible, and failure never
silently advances the workflow.

One sentence: *references become structured evidence; evidence becomes concepts; research
becomes a defensible direction; direction becomes required outputs; humans approve at every
gate; and every decision remains explicable forever.*

## 2. Why it exists

DROP's product is **taste** — selecting less, composing better, explaining why. Its rhythm is a
dependable house with a changing Weekly Lens. Operating that rhythm by hand does not scale:
research is shallow or unrecorded, concepts drift from evidence, Persian copy degrades into
translation, and nobody can explain later why a direction was chosen. The system exists to make
DROP's curatorial doctrine *mechanical where it can be* (gates, provenance, coverage, versioning)
and *human where it must be* (taste, approval, Persian authorship, cultural judgment).

Two authoritative documents govern it:

| Document | Role |
|---|---|
| [`DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md`](DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md) | System architecture: five machines, schemas, releases, QA |
| [`DROP_BRAND_DNA_v3.0.md`](DROP_BRAND_DNA_v3.0.md) | The brand constitution (owner: DROP Guardian) — source of the Rule Registry |

## 3. The production hierarchy (ADR 0001)

```
Deep Program  ──full pipeline──▶  Approved Program Package (Concept Bible, evidence,
   │                              directions, lens_territories, principles, constraints)
   └─▶ Weekly Lens Edition  ──lighter workflow + mandatory current-context scan──▶
          └─▶ Specific outputs (articles, menus, playlists, videos, pages, briefs)
```

- The **full pipeline runs only when a new deep program is required** — never 52×/year.
- `program_type` (`SEASONAL_PROGRAM | THEMATIC_PROGRAM | EVENT | COLLABORATION |
  SPECIAL_PROJECT`) and `lens_mode` (`NONE | SINGLE_LENS | LENS_SERIES`) belong to the
  **Program**.
- `programming_layer` (`HOUSE_CORE | ROTATING_ASSORTMENT | LENS_ALIGNED`) belongs to **each
  candidate/selection**, and drives the mechanical gate table:

| Programming layer | DROP FIT | LENS RELEVANCE |
|---|---:|---:|
| `HOUSE_CORE` | Required | — |
| `ROTATING_ASSORTMENT` | Required | — |
| `LENS_ALIGNED` | Required | **Required** |

- A Weekly Lens is a **child record** (`parent_concept_id`) and always includes a lightweight
  current-context scan before commissioning outputs — never a pure extract of Bible material.

## 4. The five machines

| # | Machine | In | Out | Human gate |
|---|---|---|---|---|
| 01 | Reference-Driven Concept Discovery | Project brief, optional references, Constitution rules | 3–5 materially different Concept Cards, critiques, comparison | Concept selection (ACCEPT/PROMISING/REVISE/REJECT/HOLD) |
| 02 | Controlled Research | Approved Concept Card | Research Package: frozen plan, evidence library, candidate pools, Persian synthesis, coverage report | Non-critical gap acceptance; retrieval requests |
| 03 | Synthesis, Weighting & Decision | Research Package | Three coherent Direction systems, scored; approved **Concept Bible** | Direction approval (Guardian) |
| 04 | Output Definition & Production Control | Concept Bible | Output Manifest, subagent jobs, validated artifacts, Execution Manifest | Output approval; revision routing |
| 05 | Calendar, Request Feed & Handoff | Production & Handoff Package | Portfolio/Concept calendars, request feed, feedback, completion record | All request approvals |

Specialized output subagents (editorial, playlist, visual, landing page, print, operator guide…)
are **owned by Machine 04** behind a generic `SpecializedOutputAgent` interface — registry-routed
by `output_type`, stubbed in V0. There is deliberately **no Machine 06**: QA is embedded in each
machine; Machine 05 routes human review but never claims QA of physical work.

Machine 02's working model (ADR 0008): load approved context → **create and freeze the Research
Plan** → query the Source Registry → discover additional sources (as `CANDIDATE`, never silently
promoted) → test reachability *from the real Iranian deployment* → retrieve, or create lawful
human `RESEARCH_REQUEST`s → validate and extract with claim-level citations → evaluate coverage
against the frozen plan's **evidence slots** (blocked evidence stays in the denominator; only
qualified equivalents may fill a slot; critical gaps block; any manual change to the frozen plan
requires an approval event and rationale — ADR 0004).

Every research run requires **both** Iranian/Persian and international evidence (ADR 0004) —
neither can be zero, and foreign findings must be examined for Tehran relevance.

## 5. Shared platform layers

- **Rule Registry** — Brand DNA converted into versioned rules (`MUST … ESCALATE_IF`); only the
  Guardian publishes. The DNA's `DROP FIT` (6 questions) and `LENS RELEVANCE` (3 questions)
  filters are the first extracted rules.
- **Prompt Registry** — prompts live outside code, versioned, with model profiles.
- **Example Library** — approved/rejected/borderline outputs with explanations; one preference
  never silently becomes a rule.
- **Artifact Registry** — every meaningful output: stable ID, version, producer, sources,
  prompt/model versions, status, approvals, immutable audit history.
- **Orchestrator** — starts/resumes runs, validates inputs, enforces stage order, routes human
  decisions, stops loops; **never creates content**.
- **AI Gateway (ADR 0003)** — every machine calls the gateway, never a provider SDK. Model
  profiles configure provider adapter, endpoint, budgets, fallback. Unconfigured provider ⇒
  `PROVIDER_CONFIGURATION_REQUIRED`: AI stages block, everything else keeps working.
- **Learning layer** — observes decisions, revisions, costs; proposes changes; never changes
  production behavior without approval and versioning.

## 6. Reproducibility (ADR 0009)

Every pipeline run freezes a `pipeline_run_manifest`: constitution/rule/plan versions, source
registry snapshot, machine schema + prompt versions, model profiles, input/output artifact
versions, approvals, feedback, usage and cost. Historical runs are immutable; edits create
versions; reruns create runs (optionally referencing a parent); raw AI responses are stored
separately from validated outputs; the dashboard can diff two runs. Stage execution follows an
explicit state machine (`DRAFT … WAITING_FOR_APPROVAL … FAILED_RETRYABLE | FAILED_FINAL |
SUPERSEDED`) with attempt number, failure code, checkpoint, budget consumption and next
permitted action — pause, retry, recovery and human gates are deterministic and reconstructable
from PostgreSQL alone.

## 7. People and permissions (ADR 0002)

The product is a **client-operated dashboard**. The builder holds no approval rights unless the
client assigns them. Actors (`HUMAN | MACHINE | SERVICE`) receive **roles** (administrative
authority: Workspace Owner, DROP Guardian, Project Lead, Reviewer/Editor, Contributor, Viewer,
Technical Maintainer) and **capabilities** (competences like `FA_EDITORIAL`) separately, scoped
to `WORKSPACE | MODULE | PROJECT`. Approval policies are per-gate (`AUTHORIZED_ROLE`,
`SELF_APPROVAL_ALLOWED` — labelled, `DISTINCT_REVIEWER_REQUIRED`), and every approval event
records actor **and** acted-as role. Missing required humans produce named blocked states
(`GUARDIAN_ASSIGNMENT_REQUIRED`, `FA_EDITORIAL_REVIEWER_REQUIRED`) — work stays saved and
visible, publication waits.

## 8. Persian-native product (ADR 0005)

All human-facing generated artifacts are **authored natively in Persian** (`NATIVE_FA`);
mechanical translation is prohibited; English exists only as controlled glossary terms
(`WEEKLY DROP`, `HOUSE CORE`…), original evidence, and explicitly commissioned separate
artifacts (`content_family_id` links locales — never auto-translation). Every publishable
Persian artifact passes a human `FA_EDITORIAL` gate; automation flags mixed-language paragraphs,
ی/ک codepoints, نیم‌فاصله, RTL punctuation and glossary violations, but cannot certify natural
authorship. The dashboard ships **FA-first, RTL from the first component**: `lang="fa-IR"`,
`dir="rtl"`, Vazirmatn, logical CSS properties, externalized strings, Persian statuses and
errors, Solar Hijri operational calendars over UTC storage, Tehran-time display, correct bidi
for IDs/URLs/citations.

## 9. Architecture and deployment (ADRs 0003, 0006, 0007)

**Stack:** Node 24 LTS · TypeScript strict · pnpm monorepo · Next.js App Router (standalone
Docker output) · Zod 4 contracts (JSON-Schema-exportable for provider structured output) ·
React Hook Form · TanStack Table/Query · Tailwind (direction-aware) · Better Auth (identity
only; RBAC is a custom domain module) · PostgreSQL + Drizzle with committed SQL migrations ·
BullMQ/Redis · S3-compatible storage (MinIO fallback) · `date-fns-jalali` · Vitest + Playwright.

**Shape:** modular monolith, two processes (web, worker), business logic in shared packages —
never in Next.js routes. PostgreSQL is the authoritative state; Redis holds reconstructable
dispatch state only; jobs carry IDs, not content; every stage is idempotent; human gates park
runs as `WAITING_FOR_APPROVAL` in PostgreSQL with **no** job left running.

```text
apps/    web/  worker/
packages/ core/    # identity, workspaces, roles, approvals, audit, files, comments, notifications
          studio/  # sources, research, concepts, directions, concept-bibles, weekly-lenses, outputs
          contracts/ db/ ai-gateway/ pipeline/ storage/ ui/ config/
```

Database schemas mirror the module boundary (`core.*` / `studio.*`); shared records carry a
`module_key`. Product identity is **DROP OS / Studio**; URLs live under `/studio/*`; a module
selector appears only when a second real module exists.

**Deployment:** client-approved **Iranian infrastructure** first; self-hostable and portable
always; Docker Compose is the *reference* deployment; no *mandatory* PaaS dependency (an Iranian
managed Postgres/S3 is fine if replaceable); server-side AI calls only; no remote font/CDN
dependency. AI provider accounts, credentials and billing are **client-owned**; the architecture
never assumes proxies, VPNs or restriction bypasses.

**Scope protection (ADR 0007):** hospitality standards, staffing, inventory, suppliers,
finance, physical execution and general venue operations are **outside** Studio — they enter
only as separately specified future DROP OS modules.

## 10. Safety and integrity model

- **Fail closed** — missing input, schema-invalid model output, failed hard rule, unattributable
  version, or missing human decision ⇒ stop; never auto-approve. Malformed AI output: one repair
  retry, then the run fails; the raw response is kept for diagnosis.
- **Untrusted content** — references and webpages are data, never instructions; model-produced
  IDs are validated against real registries; unknown films/books/tracks fail identity
  validation; URLs alone are not evidence.
- **Immutability** — approved Concept Cards, Research Packages, Concept Bibles, artifacts, run
  manifests and approval history are never overwritten.
- **Provenance** — every final artifact traces to source artifacts and exact configuration
  versions; every claim carries citations; facts, interpretations, opinions and hypotheses stay
  typed.
- **Budgets** — per-stage token/cost/iteration budgets with `ESCALATE` on exhaustion; retrieval
  is three-pass (40–80 metadata scan → 25–50 validated → 12–18 deep reads) so research stops by
  saturation, not token exhaustion.

## 11. What the client provides, and when (ADR 0008)

| Input | When | Blocks build? | Blocks first real run? |
|---|---|---:|---:|
| Constitution + Brand DNA | ✅ provided | No | No |
| Source seeds + discovery rules | ✅ provided | No | No |
| One real project brief | Before the real vertical slice | No | **Yes** |
| Workspace Owner named | Before client UAT | No | **Yes** |
| DROP Guardian named | Before brand approval gates | No | **Yes** |
| `FA_EDITORIAL` holder named | Before publishable Persian approval | No | **Yes** |
| Project references, past examples | Optional | No | No |
| AI entity, providers, credentials | Before live AI execution | No (mock adapters) | **Yes** |

Synthetic fixtures may test schemas, prompts, queues, failure handling and UI states — never
taste learning, creative-prompt calibration, brand-fit evaluation or creative acceptance.

## 12. Definition of done (V0)

The spec's §23 twenty-step end-to-end definition stands, refined by the ADRs: one real project
travels brief → references/analyses → 3–5 concepts → human selection → dual-coverage research
(25–50 sources, 12–18 deep reads) → normalized candidates → three Directions → Guardian-approved
Concept Bible → Output + Execution Manifests through stub subagents → calendar and request feed
→ one tracked human handoff → one revision loop back to Machine 04 → closed with complete audit,
run manifests, and Persian-editorial-approved outputs.

## 13. Canonical glossary

| Term | Meaning |
|---|---|
| **DROP OS** | Umbrella internal platform (long-term product) |
| **DROP Studio OS** | This module: concepts, research, curation, lenses, editorial production |
| **Deep Program / Concept** | Unit produced by one full pipeline run |
| **Concept Bible** | Immutable, approved creative direction document |
| **Weekly Lens** | Time-bound child edition derived from a Bible + context scan |
| **Lens territory** | A viable lens direction packaged inside a Program |
| **`DROP FIT` / `LENS RELEVANCE`** | The DNA's two selection filters, applied by `programming_layer` |
| **Evidence slot** | A frozen Research Plan requirement (track+layer+geography+quality), fillable by qualified equivalents |
| **Run manifest** | Immutable record of every version used by a pipeline run |
| **Machine Actor** | Non-human actor type executing pipeline stages — holds capabilities, never approval authority |
