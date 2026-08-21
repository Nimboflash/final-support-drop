# Spec: DROP OS — Studio Module V0

**Status:** ready-for-agent · 2026-08-15
**Derived from:** Master Build Spec v1.0 + Brand DNA v3.0 + ADRs 0001–0009 + the verified
planning documents. ADRs win over the spec wherever they conflict. Terms are used per the
[master document glossary](project-master-document.md#13-canonical-glossary).

## Problem Statement

DROP is a curated cultural and hospitality brand (House of Taste / پاتوقِ سلیقه) in central
Tehran whose product is taste: selecting less, composing better, and explaining why. Its
operating rhythm — a dependable house with a changing Weekly Lens — currently runs on manual
creative work. Research is shallow or unrecorded; concepts drift from their evidence; Persian
copy degrades into translation; approvals live in chat threads; and no one can reconstruct
months later why a direction was chosen, what evidence supported it, or which version of which
rule was in force. The team cannot scale its weekly rhythm without either gutting research
depth or losing the brand's discipline.

## Solution

DROP Studio OS: a Persian-native, multi-user, role-based dashboard — the first bounded module
of the DROP OS umbrella platform — in which five governed AI machines with human gates turn a
project brief into a deep, researched, approved **Program** (Concept Bible, evidence library,
lens territories), from which lighter **Weekly Lens editions** and concrete outputs are derived.
Every artifact is versioned and provenance-linked, every claim cites evidence, every approval is
attributed to a person acting under a named role, every run freezes an immutable manifest, and
the system fails closed: a missing input, malformed AI response, unmet gate, or unassigned
required human always blocks — never silently approves.

## User Stories

### Workspace, identity and roles

1. As a Workspace Owner, I want to invite team members by email and disable them without
   deleting their history, so that membership stays controlled and audits stay intact.
2. As a Workspace Owner, I want to assign roles and capabilities scoped to workspace, module or
   project, so that authority matches responsibility.
3. As a Workspace Owner, I want public signup to be impossible, so that only invited people ever
   see project material.
4. As a DROP Guardian, I want my approval rights to be mine alone and server-enforced, so that
   no other role can publish rules or approve directions in my name.
5. As a Project Lead, I want one person to be able to hold several roles with every action
   recording which hat was worn, so that a small team stays honest without bureaucracy.
6. As a Reviewer, I want self-approval to be allowed, labelled, or forbidden per gate by policy,
   so that independence is a recorded fact, not an assumption.
7. As a Technical Maintainer, I want deployment, model configuration and prompt releases
   separated from brand approvals, so that building the system never means governing the brand.
8. As a Viewer, I want read-only access to approved material, so that stakeholders can follow
   progress without editing risk.
9. As a Workspace Owner, I want every approval, rejection, rule change and exception in an
   append-only audit history, so that governance survives staff changes.

### Projects and briefs

10. As a Project Lead, I want to create a project with a structured brief (title, program type,
    lens mode, objective, context, audience, time window, constraints, required outputs,
    materials, partners, notes), so that machines start from intent, not vague prompts.
11. As a Project Lead, I want `program_type` and `lens_mode` recorded on the Program, so that a
    collaboration can also generate a lens series without schema contortions.
12. As a Project Lead, I want to see each project's current stage, next action, blockers and
    pending decisions on a Persian dashboard, so that I always know what the system is waiting
    for.
13. As a Project Lead, I want optional project references with why-selected / important-aspect /
    do-not-copy / intended-use / submitted-by, so that my hints guide research without replacing
    it.

### Machine 01 — concept discovery

14. As a Project Lead, I want 3–5 materially different Concept Cards generated from the brief
    and references, so that I choose between real alternatives, not variations.
15. As a Project Lead, I want each concept's reference connections traceable, so that I can see
    what inspired what.
16. As a DROP Guardian, I want an independent critique (separate model profile) flagging themes
    masquerading as concepts, so that weak candidates die early.
17. As a Project Lead, I want to decide ACCEPT / PROMISING / REVISE / REJECT / HOLD with
    structured feedback (preserve / remove / change / why), so that my reasoning becomes
    learning material.
18. As a DROP Guardian, I want reusable feedback to become candidate rules in DRAFT/OBSERVING
    that never activate automatically, so that one preference doesn't silently become law.

### Machine 02 — controlled research

19. As a Project Lead, I want a Research Plan created and frozen before any retrieval — with
    research questions, tracks, required source layers, minimum Iranian/Persian and minimum
    international coverage, critical evidence and substitution rules — so that access problems
    can never quietly shrink the evidence bar.
20. As a DROP Guardian, I want any manual change to a frozen plan to require an approval event
    with rationale, so that the bar moves only in daylight.
21. As a Reviewer, I want the Source Registry editable in the dashboard with geography, language,
    layer and access-method dimensions, so that Persian scholarly sources sit beside JSTOR as
    peers, not afterthoughts.
22. As a Reviewer, I want machine-discovered sources to enter as CANDIDATE and be promoted only
    by an authorized human (CANDIDATE | VALIDATED | ACTIVE | DEACTIVATED | ARCHIVED), so that
    the trusted registry never grows silently.
23. As a Technical Maintainer, I want every source's reachability tested from the real Iranian
    deployment — network status and content-retrieval status separately — so that "the homepage
    loads" is never mistaken for "the evidence is retrievable."
24. As a Project Lead, I want blocked required evidence to stay in the coverage denominator and
    remain visible as gaps, so that saturation can't be declared over a hollowed-out registry.
25. As a Reviewer, I want a qualified equivalent source to fill an evidence slot (same track,
    layer, geography, quality) with the substitution recorded, so that one dead URL doesn't
    block a run forever.
26. As a Contributor, I want valid-but-inaccessible material to become a lawful RESEARCH_REQUEST
    assigned to me with the retrieved file entering as a provenance-linked evidence artifact
    (who, how, usage rights), so that human access extends the machine without bypassing
    anything.
27. As a Project Lead, I want three-pass retrieval (40–80 metadata scan, 25–50 validated, 12–18
    deep reads) with per-stage budgets, so that research stops by saturation, not token
    exhaustion.
28. As a Reviewer, I want facts, interpretations, observations, opinions and hypotheses typed
    distinctly with claim-level citations, so that confidence is never borrowed.
29. As a Project Lead, I want candidate pools (music, film, book, art & design, audience and
    urban signals) built source-linked with no premature selection, so that Machine 03 chooses
    from evidence, not from a machine's early favorite.
30. As a Project Lead, I want every run's research synthesis authored natively in Persian with
    original titles and citations preserved, so that the team reads its own language over real
    evidence.
31. As a DROP Guardian, I want contradictions between sources kept visible in a contradiction
    map, so that disagreement informs rather than disappears.
32. As a Project Lead, I want non-critical gaps acceptable only through a recorded human
    decision, so that "good enough" is always someone's named call.

### Machine 03 — synthesis and decision

33. As a Project Lead, I want candidates normalized to a common schema without losing
    type-specific fields (BPM, duration, edition), so that cross-track comparison doesn't erase
    meaning.
34. As a DROP Guardian, I want every selected candidate to carry an explicit role and its
    `programming_layer`, so that DROP FIT applies to everything and LENS RELEVANCE applies
    exactly to lens-aligned selections.
35. As a DROP Guardian, I want hard-gate failures (unverified identity, unexplainable
    relationship, critical cultural risk, direct copy, unacceptable rights) to remove candidates
    regardless of score, so that arithmetic never launders a disqualification.
36. As a Project Lead, I want three coherent Direction systems — not top-scoring items picked
    independently — so that I choose between compositions, not playlists of winners.
37. As a DROP Guardian, I want direction scoring with recorded weight profiles and confidence
    bands (>0.08 strong, 0.04–0.08 medium, <0.04 human decision), so that the machine's
    conviction is calibrated and reproducible.
38. As a DROP Guardian, I want my direction approval to publish an immutable, versioned Concept
    Bible containing lens territories, mandatory elements, exclusions and anti-references, so
    that downstream work has a stable constitution.

### Machine 04 — outputs and production control

39. As a Project Lead, I want proposed outputs classified REQUIRED / RECOMMENDED / OPTIONAL /
    DEFERRED / REJECTED with narrative roles, so that every output exists for a reason.
40. As a Project Lead, I want an Output Manifest published before any subagent activates —
    purpose, audience, channel, format, language policy, constraints, acceptance criteria,
    budget — so that production is specified, not improvised.
41. As a Technical Maintainer, I want specialized output subagents behind one generic interface
    with registry routing by output type and stub implementations in V0, so that creative logic
    can arrive later without core changes.
42. As a DROP Guardian, I want embedded validation gates (schema, manifest compliance, Bible
    compliance, citation support, no fabricated items, cross-output coherence) where a missing
    or malformed validator never auto-approves, so that invalid artifacts cannot reach handoff.
43. As a Project Lead, I want every artifact's external requirements extracted into an Execution
    Manifest (decisions, creative work, expert review, physical production, rights, publishing,
    delivery), so that what the system cannot do becomes visible work for humans.

### Machine 05 — calendar, feed and handoff

44. As a Project Lead, I want Execution Manifest items to become editable requests and calendar
    items automatically, so that coordination scaffolding builds itself.
45. As a team member, I want a request feed filtered by assigned-to-me / waiting-for-me / needs
    decision / blocked / overdue, so that my queue is always visible in Persian.
46. As a Project Lead, I want dependency-blocked requests unable to start and blockers visible
    on requests and calendar items, so that sequencing is enforced, not remembered.
47. As an operations stakeholder, I want portfolio and concept calendars with Solar Hijri
    display over UTC storage, so that dates read naturally in Tehran and sort correctly in the
    database.
48. As a Reviewer, I want structured feedback (decision, category, severity, location, required
    change, preserve, do-not-change, blocking) generating scoped revision requests back to
    Machine 04, so that revisions are surgical and versioned.
49. As a Project Lead, I want physical completion tracked as declared states without the system
    ever claiming machine QA of work it cannot observe, so that our records stay honest.

### Weekly Lens workflow

50. As a Project Lead, I want Weekly Lens editions derived from an approved Bible's lens
    territories as child records, so that the weekly rhythm draws from deep research without
    rerunning the pipeline 52 times a year.
51. As an Editor, I want every lens edition to include a lightweight current-context scan before
    commissioning outputs, so that a lens is never a stale extract of old Bible material.
52. As a DROP Guardian, I want lens-aligned selections to pass DROP FIT + LENS RELEVANCE while
    house-core and rotating selections pass DROP FIT alone, so that the DNA's filter doctrine is
    mechanical.

### Persian-native product

53. As an Editor, I want all human-facing generated artifacts authored natively in Persian with
    mechanical translation prohibited, so that the brand voice is written, not converted.
54. As an Editor, I want English confined to a controlled glossary (WEEKLY DROP, HOUSE CORE,
    DROP FIT…) rendered direction-safely inside Persian text, so that bidi text stays designed
    rather than accidental.
55. As the FA_EDITORIAL capability holder, I want every publishable Persian artifact to require
    my review — with automation pre-flagging ی/ک codepoints, نیم‌فاصله, mixed-language paragraphs
    and unapproved terms — so that machines narrow my work and never replace my judgment.
56. As any user, I want the entire dashboard FA-first and RTL from the first release —
    navigation, statuses, forms, errors, notifications — so that the operating team works in its
    own language.
57. As a Project Lead, I want a commissioned English artifact to be a separate natively authored
    record linked by content family, so that locales are siblings, never translations.

### Runs, reproducibility and audit

58. As a Technical Maintainer, I want every run to freeze an immutable manifest (constitution,
    rule, plan and schema versions, prompt versions, model profiles, source snapshot, artifact
    versions, approvals, cost), so that any two results can be explained by diffing their
    manifests.
59. As a Project Lead, I want stage execution to follow an explicit state machine with attempt
    number, failure code, checkpoint, budget consumption and next permitted action, so that
    pause, retry and recovery are deterministic.
60. As a DROP Guardian, I want approved artifacts immutable with edits creating new versions and
    reruns creating new runs, so that history is never rewritten.
61. As a Project Lead, I want to compare two runs or artifact versions in the dashboard, so that
    "what changed and why" is a view, not an investigation.
62. As a Technical Maintainer, I want raw AI responses stored separately from validated outputs,
    so that diagnosis never contaminates the artifact chain.
63. As a Workspace Owner, I want per-run token usage and estimated cost visible, so that the
    creative system has a legible bill.

### Platform, safety and failure

64. As a Technical Maintainer, I want every machine to call one provider-agnostic AI gateway with
    configurable model profiles, budgets and fallbacks, so that providers are replaceable
    configuration, not architecture.
65. As a Workspace Owner, I want AI provider accounts, credentials and billing to be
    client-owned with calls made only server-side, so that access is lawful, attributable and
    never browser-exposed.
66. As any user, I want an unconfigured provider to produce a clear PROVIDER_CONFIGURATION_REQUIRED
    state while the dashboard, registries, calendar and history keep working, so that a pending
    legal question degrades the product to manual — never to broken.
67. As a Project Lead, I want a missing Guardian or Persian editorial reviewer to produce named
    blocked states with work saved and visible, so that required humans are awaited, never
    waived.
68. As a Technical Maintainer, I want malformed AI output retried once with a repair instruction
    and then failed with the raw response kept, so that the system never generates indefinitely
    toward approval.
69. As a Security reviewer, I want references and fetched web content treated as untrusted data
    with model-produced IDs validated against real registries, so that prompt injection and
    fabricated candidates die at the boundary.
70. As a Technical Maintainer, I want the whole system deployable by Docker Compose on
    client-approved Iranian infrastructure with no mandatory PaaS, no remote fonts/CDNs, and a
    documented migration path, so that the product is reachable by its users and portable
    between vendors.
71. As a Technical Maintainer, I want PostgreSQL authoritative with Redis holding only
    reconstructable dispatch state and human gates parking runs as WAITING_FOR_APPROVAL with no
    job running, so that a Redis flush can never lose an approval or a run.
72. As a Workspace Owner, I want the product to present as DROP OS with Studio as its active
    module under /studio routes, so that future modules arrive beside Studio, not inside it.

## Implementation Decisions

- **Production hierarchy (ADR 0001):** full pipeline → deep Program (Approved Program Package
  with Concept Bible + lens territories); Weekly Lens editions are child records derived
  through a lighter workflow with a mandatory current-context scan. `program_type` and
  `lens_mode` live on the Program; `programming_layer` lives on each candidate/selection and
  mechanically selects DROP FIT vs DROP FIT + LENS RELEVANCE gating.
- **Actor model (ADR 0002):** `actor_type HUMAN | MACHINE | SERVICE`; roles (administrative
  authority), capabilities (e.g. FA_EDITORIAL) and per-gate approval policies
  (`AUTHORIZED_ROLE | SELF_APPROVAL_ALLOWED | DISTINCT_REVIEWER_REQUIRED`) are three separate
  assignments, scoped WORKSPACE | MODULE | PROJECT. Approval events record actor + acted-as
  role + approval mode. The builder holds no client approval authority.
- **Deployment (ADR 0003):** Iranian infrastructure first; self-hostable, vendor-portable;
  Docker Compose as reference deployment; server-side AI only; client-owned provider access;
  no proxies/VPNs/bypasses assumed; fail-closed `PROVIDER_CONFIGURATION_REQUIRED` keeps
  non-AI features alive.
- **Research (ADR 0004 + 0008):** editable multilingual Source Registry (geography, language,
  layer, access-method dimensions); frozen Research Plan whose denominator is evidence slots;
  dual mandatory coverage (Iranian/Persian AND international, neither zero); reachability tested
  from the deployment origin with network and retrieval status separate; audited equivalent
  substitution; lawful human-retrieval requests producing provenance-linked evidence artifacts;
  `source_status CANDIDATE | VALIDATED | ACTIVE | DEACTIVATED | ARCHIVED` with human-only
  promotion and no destructive removal of historically used sources.
- **Language (ADR 0005):** `language_policy` with `NATIVE_FA` authoring and prohibition of
  mechanical translation; locale-specific content artifacts linked by content family; controlled
  English glossary with direction-safe rendering; human FA_EDITORIAL gate on publishable
  Persian; FA-first RTL dashboard, Solar Hijri display, UTC storage, language-neutral internal
  identifiers with Persian labels.
- **Stack (ADR 0006):** Node 24 LTS, strict TypeScript, pnpm monorepo; Next.js App Router
  (standalone output) + Node worker as two processes of one modular monolith; Zod 4 as the
  single runtime contract layer (machines, gateway responses, API, forms, queue payloads;
  JSON-Schema export for provider structured output); Drizzle + committed SQL migrations on
  PostgreSQL; BullMQ/Redis for execution only; S3-compatible storage with MinIO fallback;
  Better Auth for identity with authorization in a custom RBAC domain module; Vitest,
  Playwright, DB integration tests. Business logic lives in shared packages, never in routes.
- **Module boundary (ADR 0007):** DROP OS master identity, `/studio/*` routes, `core.*` /
  `studio.*` package and database split, module-scoped role assignments, scope-protection rule
  excluding venue operations.
- **Reproducibility (ADR 0009):** immutable `pipeline_run_manifest` freezing all versions per
  run; stage state machine (`DRAFT … WAITING_FOR_APPROVAL … FAILED_RETRYABLE | FAILED_FINAL |
  CANCELLED | SUPERSEDED`) with attempt, failure code, checkpoint, budget and next permitted
  action; raw responses stored apart from validated outputs; dashboard run/version comparison.
- **Queue durability:** PostgreSQL is the source of truth; jobs carry IDs, not content; stages
  idempotent; human gates leave no job running; pending work reconstructable after Redis loss.
- **Client inputs (ADR 0008):** no mandatory reference package. One real project brief gates
  the first real creative slice; Workspace Owner / Guardian / FA_EDITORIAL assignments gate UAT
  and their approval gates; provider entity and credentials gate live AI only.
- **Build order:** the execution plan's R0–R6 with the 15-ticket Release 0 dependency graph is
  the authoritative sequencing.

## Testing Decisions

- A good test drives **external behavior at a seam** and asserts observable outputs — artifacts,
  events, states, HTTP responses — never internal call patterns or private state.
- **Seam 1 (primary): the machine/stage contract seam.** Machines 01–05 and individual stages
  run through the pipeline executor with fixture inputs, frozen config, and the ADR 0003 mock
  gateway adapter (an architectural boundary, reused — not a test invention). Tested here: all
  machine behavior, hard gates, DROP FIT / LENS RELEVANCE application, evidence-slot coverage
  and saturation arithmetic, budget enforcement, the stage state machine, run-manifest freezing,
  fail-closed paths, malformed-output repair-then-fail.
- **Seam 2: the HTTP application seam.** Route handlers/server actions against real test
  PostgreSQL: authentication, invitations, disable-without-delete, RBAC and capability checks,
  approval policies and events, registry CRUD and lifecycle transitions, request feed and
  calendars.
- **Playwright rides on top** as a thin FA/RTL smoke layer (critical flows render correctly in
  Persian, RTL, Jalali dates) — rendering verification, not behavior testing.
- Everything else (domain services, queries, storage adapter) is tested **through** these seams.
- Standing invariants (never waived, from the execution plan): gate failures cannot be
  score-offset; machine failure never defaults to approval; blocked sources stay in coverage
  denominators; frozen-plan edits require an approval event; approval history is append-only;
  SELF_APPROVAL always labelled; no hardcoded UI strings or LTR-only CSS; Redis flush fully
  recoverable.
- Prior art: none in-repo (greenfield). The spec's §19 ten test layers and §19.3 critical cases
  are the checklist; golden datasets (including prompt-injection and fabricated-candidate cases)
  accumulate from Release 1 and become the regression suite in Release 6.

## Out of Scope

- Physical product curation, food development, kitchen execution, partner discovery and
  negotiation, supplier logistics, staff scheduling, resource allocation (spec §3.2).
- All venue-operations domains — hospitality/service standards, training, inventory, purchasing,
  finance, physical execution management — excluded from Studio by ADR 0007's scope-protection
  rule; they enter only as future DROP OS modules.
- Detailed creative logic of specialized output subagents (interfaces + stubs only in V0).
- Automated publication or external communication without explicit authorization.
- Machine QA claims over human or physical work the system cannot observe.
- Vector/embedding retrieval infrastructure (structured filters and full-text first).
- Multi-project portfolio optimization; external calendar/messaging/PM integrations.
- English UI locale and NATIVE_PARALLEL bilingual authoring (fa-IR only in V0).
- Live AI provider selection and credentials (client-owned, pending; mock adapters in build).

## Further Notes

- The four client-side gates and their named fail-closed states: real brief →
  first creative slice; Workspace Owner → UAT; Guardian → `GUARDIAN_ASSIGNMENT_REQUIRED`;
  FA_EDITORIAL holder → `FA_EDITORIAL_REVIEWER_REQUIRED`; provider entity →
  `PROVIDER_CONFIGURATION_REQUIRED`.
- Synthetic fixtures may test schemas, prompts, queues, failure handling and UI states — never
  taste learning, creative-prompt calibration, brand-fit evaluation or creative acceptance
  (ADR 0008).
- The frozen Master Build Spec v1.0 is never edited; material changes land as new ADRs; a
  consolidated spec v1.1 is cut only after V0 ships.
- Direction/output scoring formulas' positive weights sum to 0.95 before the −0.05 penalty term
  (consistent across both formulas); the 0.08/0.04 confidence bands therefore sit on a 0.95
  scale — calibration in Release 6 should be aware of this.
- Sequencing, parallelism rules, VSO role mapping and the risk register live in the
  [execution plan](execution-plan.md); this spec defines *what* V0 is and *how it is verified*.
