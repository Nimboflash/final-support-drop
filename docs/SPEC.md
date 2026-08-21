# DROP Studio OS — Product Specification (PRD)

## Scope status (ADR-0017)

**Panel-first scope correction adopted 2026-08-21** (doc 18,
`docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`; adoption recorded
in ADR-0017). The user stories below remain the product's full definition — none are
renumbered or deleted. **This delivery implements only the panel-visible stories**, on
deterministic mocks behind the `MachineGateway` interface (18 §6; ADR-0017 D4). The
machine-execution story ranges —

- **15–53** — Machines 01–05: concept generation, research retrieval, synthesis, production
  validation, handoff generation and Weekly Lens derivation;
- **86–88** — registry publishing and versioned configuration releases;
- **90–98** — pipeline runtime, run manifests and reproducibility (their run *views* stay
  panel-visible over mocked runs);
- **99–107** — AI gateway, providers, SSRF policy and compose/platform infrastructure —

are presented through the fourteen deterministic mock scenarios of (18 §7.2) and are
**deferred for real execution** to the separate machine build, which connects later through
`RealMachineGateway` (18 §9). The ADR-0012 state vocabulary and ADR-0014 event taxonomy are
the presentation vocabulary of those mocks; ADR-0013 approval semantics (N distinct human
approvers, single approval write path) are what the panel presents. No PostgreSQL, Redis,
queues or AI providers appear anywhere in panel scope (18 §4.2, §5).

> **Derived document.** This spec is synthesized from the implementation bundle — primarily the Executive Implementation Brief (01), Product Surfaces and Information Architecture (04), the Release Plan (15) — with the spec-v0 source material's user stories as raw material. It exists for build-time convenience and never overrides the bundle. **Authority remains with the `docs/DELIVERY_README.md` hierarchy as repaired by ADR-0011** (DELIVERY_README's order governs; 00_READ_ME_FIRST §3 defers to it; pending human-owner ratification). Where this document reflects a repair to a bundle defect, the governing repair ADR (ADR-0011 through ADR-0016) is cited inline; everything else derives from the cited bundle documents.

## Problem Statement

DROP is a curated cultural and hospitality brand — House of Taste / پاتوقِ سلیقه — in central Tehran whose actual product is taste: selecting less, composing better, and explaining why. Its operating rhythm is a dependable house with a changing Weekly Lens, and today that rhythm runs on manual creative work (spec-v0).

For the DROP founder and team, this manifests as five compounding failures:

1. **Research is shallow or unrecorded.** Deep dual-coverage research (Iranian/Persian and international) is what separates a curated concept from a mood board, but under weekly pressure it either doesn't happen or leaves no trace.
2. **Concepts drift from their evidence.** By the time a concept ships, nobody can point from the final selection back to the source that justified it.
3. **Persian copy degrades into translation.** The brand voice is authored Persian; under time pressure it becomes mechanically converted English, which the brand explicitly forbids.
4. **Approvals live in chat threads.** Who approved what, wearing which hat, against which version of which rule — none of it is reconstructable. Governance evaporates with staff turnover.
5. **Nothing is reproducible.** Months later, no one can explain why a direction was chosen, what evidence supported it, which prompt or rule version was in force, or what changed between two attempts.

The consequence: the team cannot scale its weekly rhythm without either gutting research depth or losing the brand's discipline (spec-v0). Hiring more people does not fix it — the missing thing is an operating system that makes depth, provenance, and governance the default rather than heroics.

## Solution

Build **DROP Studio OS**: a Persian-native, multi-user, role-based, auditable operating system — the first bounded module of DROP OS — in which five governed AI machines with mandatory human approval gates turn a project brief into a deep, researched, approved **Program** (Concept Bible, evidence library, lens territories), from which lighter **Weekly Lens editions** and concrete outputs are derived (01 §1, spec-v0).

The system is a versioned creative operating system, not a giant chatbot (00 §4). Its guarantees:

- Every artifact is versioned and provenance-linked; every claim cites evidence.
- Every approval is attributed to a person acting under a named role.
- Every run freezes an immutable manifest so any two results can be explained by diffing.
- The system **fails closed**: a missing input, malformed AI response, unmet gate, or unassigned required human always blocks — never silently approves.
- The system stays useful in manual mode when no AI provider is configured (00 §4).

Three connected product surfaces share one domain model and one authorization system (01 §1):

1. **Operational dashboard** — Programs, Lenses, artifacts, research, approvals, requests, calendars, registries, users and audit (04 §1.1).
2. **Workflow canvas** — visual template authoring and live run inspection using React Flow; a real operating surface, not a decorative diagram (01 §4, 04 §1.2, 08).
3. **Artifact preview/export** — controlled, sandboxed preview and export of generated editorial, visual, print and landing-page artifacts; automatic external publication is out of scope (01 §1, 04 §1.3, §9).

The production model is five machines in fixed order — 01 Concept Discovery, 02 Controlled Research, 03 Synthesis and Decision, 04 Output and Production Control, 05 Calendar/Feed/Handoff — each with a mandatory human boundary (01 §3). A full run creates a deep Program; Weekly Lenses are lighter child editions derived from the approved Program plus a current-context scan (00 §4). The whole product is FA-first and RTL from the first component, deployable on client-approved Iranian infrastructure with no mandatory Western PaaS, remote font, CDN, proxy or bypass dependency (00 §4).

## User Stories

The stories below are adapted and renumbered from spec-v0's user stories, extended with dashboard, canvas, approval and audit stories implied by (04), (05) and (08), and updated wherever a repair ADR (ADR-0011…0016) settles behavior. Actors: **Workspace Owner**, **DROP Guardian**, **FA_EDITORIAL editor**, **workflow maintainer** (Technical Maintainer holding scoped workflow edit/publish capability, 08 §3), **studio operator** (Project Lead or operational team member working in the dashboard), **auditor**, plus Reviewer, Contributor and Viewer where the source stories require them.

### Workspace, identity and roles

1. As a Workspace Owner, I want to invite team members by email and disable them without deleting their history, so that membership stays controlled and audits stay intact.
2. As a Workspace Owner, I want a disabled membership to block sign-in immediately with session revocation while all historical actions remain attributed, so that departure never means either lingering access or vanished accountability (15 §2 ticket 0.5; restored R0 exit criterion, ADR-0011).
3. As a Workspace Owner, I want to assign roles and capabilities scoped to workspace, module or project, so that authority matches responsibility.
4. As a Workspace Owner, I want public signup to be impossible, so that only invited people ever see project material.
5. As a DROP Guardian, I want my approval rights to be mine alone and server-enforced, so that no other role can publish rules or approve directions in my name.
6. As a studio operator, I want one person to be able to hold several roles with every action recording which hat was worn, so that a small team stays honest without bureaucracy.
7. As a Reviewer, I want self-approval to be allowed, labelled, or forbidden per gate by policy, so that independence is a recorded fact, not an assumption.
8. As a workflow maintainer, I want deployment, model configuration and prompt releases separated from brand approvals, so that building the system never means governing the brand.
9. As a Viewer, I want read-only access to approved material, so that stakeholders can follow progress without editing risk.
10. As a Workspace Owner, I want every approval, rejection, rule change and exception in an append-only audit history, so that governance survives staff changes.

### Projects and briefs

11. As a studio operator, I want to create a project with a structured brief (title, program type, lens mode, objective, context, audience, time window, constraints, required outputs, materials, partners, notes), so that machines start from intent, not vague prompts.
12. As a studio operator, I want `program_type` and `lens_mode` recorded on the Program, so that a collaboration can also generate a lens series without schema contortions.
13. As a studio operator, I want to see each project's current stage, next action, blockers and pending decisions on a Persian dashboard, so that I always know what the system is waiting for.
14. As a studio operator, I want optional project references with why-selected / important-aspect / do-not-copy / intended-use / submitted-by, so that my hints guide research without replacing it (04 §6.4).

### Machine 01 — concept discovery

15. As a studio operator, I want 3–5 materially different Concept Cards generated from the brief and references, so that I choose between real alternatives, not variations.
16. As a studio operator, I want each concept's reference connections traceable, so that I can see what inspired what.
17. As a DROP Guardian, I want an independent critique (separate model profile) flagging themes masquerading as concepts, so that weak candidates die early.
18. As a studio operator, I want to decide ACCEPT / PROMISING / REVISE / REJECT / HOLD with structured feedback (preserve / remove / change / why), so that my reasoning becomes learning material.
19. As a DROP Guardian, I want reusable feedback to become candidate rules in DRAFT/OBSERVING that never activate automatically, so that one preference doesn't silently become law.

### Machine 02 — controlled research

20. As a studio operator, I want a Research Plan created and frozen before any retrieval — with research questions, tracks, required source layers, minimum Iranian/Persian and minimum international coverage, critical evidence and substitution rules — so that access problems can never quietly shrink the evidence bar.
21. As a DROP Guardian, I want any manual change to a frozen plan to require an approval event with rationale, so that the bar moves only in daylight.
22. As a Reviewer, I want the Source Registry editable in the dashboard with geography, language, layer and access-method dimensions, so that Persian scholarly sources sit beside JSTOR as peers, not afterthoughts.
23. As a Reviewer, I want machine-discovered sources to enter as CANDIDATE and be promoted only by an authorized human (CANDIDATE → VALIDATED → ACTIVE → DEACTIVATED → ARCHIVED), so that the trusted registry never grows silently.
24. As a workflow maintainer, I want every source's reachability tested from the real Iranian deployment — network status and content-retrieval status separately — so that "the homepage loads" is never mistaken for "the evidence is retrievable."
25. As a studio operator, I want blocked required evidence to stay in the coverage denominator and remain visible as gaps, so that saturation can't be declared over a hollowed-out registry.
26. As a Reviewer, I want a qualified equivalent source to fill an evidence slot (same track, layer, geography, quality) with the substitution recorded, so that one dead URL doesn't block a run forever.
27. As a Contributor, I want valid-but-inaccessible material to become a lawful RESEARCH_REQUEST assigned to me, with the retrieved file entering as a provenance-linked evidence artifact (who, how, usage rights), so that human access extends the machine without bypassing anything.
28. As a studio operator, I want three-pass retrieval (40–80 metadata scan, 25–50 validated, 12–18 deep reads) with per-stage budgets, so that research stops by saturation, not token exhaustion.
29. As a Reviewer, I want facts, interpretations, observations, opinions and hypotheses typed distinctly with claim-level citations, so that confidence is never borrowed.
30. As a studio operator, I want candidate pools (music, film, book, art & design, audience and urban signals) built source-linked with no premature selection, so that Machine 03 chooses from evidence, not from a machine's early favorite.
31. As a studio operator, I want every run's research synthesis authored natively in Persian with original titles and citations preserved, so that the team reads its own language over real evidence.
32. As a DROP Guardian, I want contradictions between sources kept visible in a contradiction map, so that disagreement informs rather than disappears.
33. As a studio operator, I want non-critical gaps acceptable only through a recorded human decision, so that "good enough" is always someone's named call.

### Machine 03 — synthesis and decision

34. As a studio operator, I want candidates normalized to a common schema without losing type-specific fields (BPM, duration, edition), so that cross-track comparison doesn't erase meaning.
35. As a DROP Guardian, I want every selected candidate to carry an explicit role and its `programming_layer`, so that DROP FIT applies to everything and LENS RELEVANCE applies exactly to lens-aligned selections.
36. As a DROP Guardian, I want hard-gate failures (unverified identity, unexplainable relationship, critical cultural risk, direct copy, unacceptable rights) to remove candidates regardless of score, so that arithmetic never launders a disqualification.
37. As a studio operator, I want three coherent Direction systems — not top-scoring items picked independently — so that I choose between compositions, not playlists of winners.
38. As a DROP Guardian, I want direction scoring with recorded weight profiles and confidence bands, so that the machine's conviction is calibrated and reproducible.
39. As a DROP Guardian, I want my direction approval to publish an immutable, versioned Concept Bible containing lens territories, mandatory elements, exclusions and anti-references, so that downstream work has a stable constitution.

### Machine 04 — outputs and production control

40. As a studio operator, I want proposed outputs classified REQUIRED / RECOMMENDED / OPTIONAL / DEFERRED / REJECTED with narrative roles, so that every output exists for a reason.
41. As a studio operator, I want an Output Manifest published before any subagent activates — purpose, audience, channel, format, language policy, constraints, acceptance criteria, budget — so that production is specified, not improvised.
42. As a workflow maintainer, I want specialized output subagents behind one generic interface with registry routing by output type and stub implementations in V0, so that creative logic can arrive later without core changes.
43. As a DROP Guardian, I want embedded validation gates (schema, manifest compliance, Bible compliance, citation support, no fabricated items, cross-output coherence) where a missing or malformed validator never auto-approves, so that invalid artifacts cannot reach handoff.
44. As a studio operator, I want every artifact's external requirements extracted into an Execution Manifest (decisions, creative work, expert review, physical production, rights, publishing, delivery), so that what the system cannot do becomes visible work for humans.

### Machine 05 — calendar, feed and handoff

45. As a studio operator, I want Execution Manifest items to become editable requests and calendar items automatically, so that coordination scaffolding builds itself.
46. As a team member, I want a request feed filtered by assigned-to-me / waiting-for-me / needs decision / needs review / needs approval / revision required / blocked / overdue, so that my queue is always visible in Persian (04 §6.9).
47. As a studio operator, I want dependency-blocked requests unable to start and blockers visible on requests and calendar items, so that sequencing is enforced, not remembered.
48. As a studio operator, I want portfolio and concept calendars with Solar Hijri display over UTC storage, so that dates read naturally in Tehran and sort correctly in the database.
49. As a Reviewer, I want structured feedback (decision, category, severity, location, required change, preserve, do-not-change, blocking) generating scoped revision requests back to the exact Machine 04 job and artifact version, so that revisions are surgical and versioned.
50. As a studio operator, I want physical completion tracked as declared states without the system ever claiming machine QA of work it cannot observe, so that our records stay honest.

### Weekly Lens workflow

51. As a studio operator, I want Weekly Lens editions derived from an approved Bible's lens territories as child records, so that the weekly rhythm draws from deep research without rerunning the pipeline 52 times a year.
52. As an FA_EDITORIAL editor, I want every lens edition to include a lightweight current-context scan before commissioning outputs, so that a lens is never a stale extract of old Bible material.
53. As a DROP Guardian, I want lens-aligned selections to pass DROP FIT + LENS RELEVANCE while house-core and rotating selections pass DROP FIT alone, so that the DNA's filter doctrine is mechanical.

### Persian-native product

54. As an FA_EDITORIAL editor, I want all human-facing generated artifacts authored natively in Persian with mechanical translation prohibited, so that the brand voice is written, not converted.
55. As an FA_EDITORIAL editor, I want English confined to a controlled glossary (WEEKLY DROP, HOUSE CORE, DROP FIT…) rendered direction-safely inside Persian text, so that bidi text stays designed rather than accidental.
56. As the FA_EDITORIAL capability holder, I want every publishable Persian artifact to require my review — with automation pre-flagging ی/ک codepoints, نیم‌فاصله, mixed-language paragraphs and unapproved terms — so that machines narrow my work and never replace my judgment.
57. As any user, I want the entire dashboard FA-first and RTL from the first release — navigation, statuses, forms, errors, notifications — so that the operating team works in its own language.
58. As a studio operator, I want a commissioned English artifact to be a separate natively authored record linked by content family, so that locales are siblings, never translations.

### Dashboard and navigation

59. As a studio operator, I want a workspace overview showing my waiting actions, active Programs by stage, blocked and failed runs, upcoming milestones, recent approvals and provider/configuration warnings, so that I can triage the day from one screen (04 §6.1).
60. As a studio operator, I want the Program list as a saved-view table with name, type, lens mode, current machine/stage, run status, next action, owner, target date, blockers and last-updated columns, so that portfolio state is scannable without opening each Program (04 §6.2).
61. As a studio operator, I want the active Program header to always show current stage, active workflow version, next permitted action, run status, pending human decisions, blockers, target date and Lens mode, so that context never has to be reconstructed from chat history (04 §3, 01 §5).
62. As any user, I want to land on a role-aware default view — Owner on workspace health, Guardian on pending approvals and rules, operators on active Programs and next actions, maintainers on runs and failures, Viewers on approved material — so that the first screen matches my job (04 §7).
63. As any user, I want every page to define first-use empty, loading-skeleton, permission-denied, configuration-required, retryable-failure and final-failure states, so that the product degrades legibly instead of breaking (04 §8).
64. As a studio operator, I want each request card to show required action, related artifact/version, owner, requester, due date, dependencies, blocker, status and one clear next CTA, so that acting never requires archaeology (04 §6.9).
65. As a Workspace Owner, I want actions hidden or disabled by permission in the UI while enforcement remains entirely server-side, so that the interface is clear and security never depends on hidden buttons (04 §2, 05 §9).

### Workflow canvas — template authoring

66. As a workflow maintainer, I want to create and edit draft workflow versions on a React Flow canvas — machines as groups, stages and gates as nodes, typed edges — so that the pipeline's structure is authored visually but governed formally (01 §4, 08 §2–§4).
67. As a workflow maintainer, I want server-side validation of a draft with findings carrying severity, node/edge reference, rule code and repair guidance, and clicking a finding focuses the offending element, so that only the server can declare a workflow publishable (08 §16).
68. As a workflow maintainer, I want publishing to produce an immutable workflow version — with definition/version CRUD, validate and publish owned by a dedicated Release 0 ticket (0.16) — so that a published template can never drift under running work (01 §4; ADR-0014).
69. As a workflow maintainer, I want the node library to list only the active node/executor types I am permitted to place, with an incomplete node remaining invalid and blocking publish, so that drafts cannot smuggle in unconfigured or unauthorized behavior (08 §11).
70. As a workflow maintainer, I want the semantic graph stored separately from canvas layout, with auto-layout creating a layout draft rather than a semantic version, so that visual tidying never counts as a workflow change (08 §7–§8).
71. As a workflow maintainer, I want semantic saves to carry an expected row version and idempotency key, with conflicts presented as a server-versus-local diff and never resolved last-write-wins, so that two editors cannot silently destroy each other's work (08 §9).
72. As a workflow maintainer, I want every drag/drop and edge connection to have a keyboard/form alternative with Persian aria labels, so that authoring is accessible and not mouse-only (08 §15).

### Workflow canvas — run execution and control

73. As a studio operator, I want a live execution view that loads a complete run snapshot then applies ordered SSE events from `afterSequence`, refetching on sequence gaps and showing an explicit stale/reconnecting state, so that what I see is either live or honestly labelled (08 §13; ADR-0014).
74. As a studio operator, I want the event stream to carry the full lifecycle — including run.completed, run.failed, run.cancelled, run.paused, run.resumed, stage.skipped, stage.cancelled and a heartbeat — so that the most important transitions are the ones I never miss (ADR-0014).
75. As a studio operator, I want to pause a run from RUNNING, READY or QUEUED into a resumable PAUSED state and resume it later, so that operational interruptions are a first-class state instead of an improvisation (ADR-0012).
76. As a studio operator, I want to cancel a run from any non-terminal state into CANCELLED, so that abandoned work terminates cleanly and auditably (ADR-0012).
77. As a studio operator with the skip capability, I want a governed manual skip that produces SKIPPED exactly as a condition-false edge does — recorded and capability-gated — so that skipping is a governed decision, never a workaround (ADR-0012).
78. As a studio operator, I want to satisfy an automated stage with a manually submitted input only when the published definition flags that stage `manual_fallback: allowed`, so that manual mode is genuinely usable without providers yet can never bypass stages that must run (ADR-0012; 00 §4).
79. As any user, I want node visuals driven by persisted states — with color never the only indicator and motion limited to the active RUNNING transition — so that the canvas is truthful, accessible and calm (08 §5–§6).
80. As a studio operator, I want dragging a node in execution mode to update only my personal layout preference, so that inspecting a run can never alter workflow semantics or the run itself (08 §3).

### Approvals

81. As a DROP Guardian, I want exactly one approval write path — the approval request/decision endpoint, with gate verbs removed from the runtime command set — so that the most governance-critical state in the system cannot be written through a side door (ADR-0013).
82. As a DROP Guardian, I want a gate requiring N approvals to require N distinct human actors, enforced by database constraint, so that one person can never satisfy a multi-approval quorum alone (ADR-0013).
83. As a Workspace Owner, I want only HUMAN actors to be able to decide approvals — machines and service actors structurally excluded — so that "machines never hold approval authority" is enforced, not aspirational (ADR-0013).
84. As an auditor, I want every approval event to record the actor, the acted-as role, the approval mode and the exact subject version decided upon, so that each decision is a complete attributable fact (spec-v0; 04 §6.11).
85. As a studio operator, I want the human approval gate node on the canvas to open the standard approval sheet — never approving directly in client state — so that the UI is a window onto the single write path, not a second one (08 §4.4; ADR-0013).

### Registries and versioned configuration

86. As a DROP Guardian, I want constitution, rule, prompt and example registries stored as versioned rows with explicit publish flows, so that the material governing generation has the same version discipline as the artifacts it governs (ADR-0015; 15 §2 tickets 0.4/0.8).
87. As a workflow maintainer, I want prompt versions to come from configuration rather than code, so that a prompt change is a recorded, versioned release (restored R0 exit criterion, ADR-0011).
88. As an auditor, I want executor and validator identity recorded in run manifests as code version plus checksum, so that "which code produced this" is answerable years later (ADR-0015).
89. As a studio operator, I want every UI-central entity — projects, programs, weekly lenses, requests, calendar items — to carry a fully enumerated status vocabulary, so that filters, saved views and dashboards rest on defined states (ADR-0015).

### Runs, reproducibility and audit

90. As a workflow maintainer, I want every run to freeze an immutable manifest (constitution, rule, plan and schema versions, prompt versions, model profiles, source snapshot, artifact versions, approvals, cost), so that any two results can be explained by diffing their manifests.
91. As a studio operator, I want stage execution to follow the complete explicit state machine — with attempt number, failure code, checkpoint, budget consumption and next permitted action, and with a defined run-level enum and stage-to-run aggregation rule — so that pause, retry, cancellation and recovery are deterministic (spec-v0; ADR-0012).
92. As a DROP Guardian, I want approved artifacts immutable, with edits creating new versions and reruns creating new runs, so that history is never rewritten.
93. As a studio operator, I want to compare two runs or artifact versions in the dashboard, so that "what changed and why" is a view, not an investigation.
94. As a workflow maintainer, I want raw AI responses stored separately from validated outputs, so that diagnosis never contaminates the artifact chain.
95. As a Workspace Owner, I want per-run token usage and estimated cost visible, so that the creative system has a legible bill.
96. As an auditor, I want failed runs to remain fully visible with their per-stage states, so that failure is inspectable evidence rather than something that disappears (restored R0 exit criterion, ADR-0011).
97. As an auditor, I want an append-only event history showing workflow, prompt, rule, example, schema and model versions, stage attempts and repairs, approval actor and acted-as role for every run, so that the complete causal chain of any output is reconstructable from the record alone (04 §6.11).
98. As an auditor, I want mock structured output to be validated and stored through the same contract path as live output, so that the audit chain is proven before a single live provider call is made (restored R0 exit criterion, ADR-0011).

### Platform, safety and failure

99. As a workflow maintainer, I want every machine to call one provider-agnostic AI gateway with configurable model profiles, budgets and fallbacks, so that providers are replaceable configuration, not architecture.
100. As a Workspace Owner, I want AI provider accounts, credentials and billing client-owned with calls made only server-side, so that access is lawful, attributable and never browser-exposed.
101. As any user, I want an unconfigured provider to produce a clear PROVIDER_CONFIGURATION_REQUIRED condition — mapped onto the canonical state model as WAITING_INPUT with a reason code — while the dashboard, registries, calendar and history keep working, so that a pending legal question degrades the product to manual, never to broken (ADR-0012).
102. As a studio operator, I want a missing Guardian or Persian editorial reviewer to produce named blocked states with work saved and visible, so that required humans are awaited, never waived.
103. As a workflow maintainer, I want malformed AI output retried once with a repair instruction and then failed with the raw response kept, so that the system never generates indefinitely toward approval.
104. As a security reviewer, I want references and fetched web content treated as untrusted data with model-produced IDs validated against real registries, so that prompt injection and fabricated candidates die at the boundary.
105. As a security reviewer, I want all server-side outbound fetching governed by a strict SSRF policy — http/https scheme allowlist, public-IP-only after DNS resolution, redirect re-validation, size and time caps, and no credentials on outbound requests — so that the research fetcher can never be turned against the deployment's own network (ADR-0016).
106. As a workflow maintainer, I want the whole system deployable by Docker Compose on client-approved Iranian infrastructure, built from a mirror-capable configuration (self-hosted registry mirrors or vendored images), so that the reference deployment is actually buildable from where it must run — with no bypass dependency (ADR-0016; 00 §4).
107. As a workflow maintainer, I want PostgreSQL authoritative with Redis holding only reconstructable dispatch state and human gates parking runs with no job running, so that a Redis flush can never lose an approval or a run.
108. As a Workspace Owner, I want the product to present as DROP OS with Studio as its active module under `/studio` routes, so that future modules arrive beside Studio, not inside it.
109. As a studio operator, I want to preview a generated artifact in an isolated preview origin that carries no dashboard cookies and a restricted CSP, so that unsafe or untrusted generated content can never reach my authenticated session (04 §9, 05 §11).
110. As a studio operator, I want controlled export of approved artifact versions — checksummed, authorized, and logged — while publication itself stays a manual human act, so that nothing the system produces auto-publishes anywhere (04 §1.3, 01 §8).

## Implementation Decisions

### Confirmed stack (01 §6, 05 §2)

| Concern | Decision |
|---|---|
| Runtime / language | Node.js 24 LTS, TypeScript strict |
| Monorepo | pnpm workspaces |
| Web | Next.js App Router, standalone Docker output |
| UI | shadcn/ui + Tailwind CSS, FA-first RTL from the first component |
| Workflow canvas | React Flow (`@xyflow/react`); open-source core until the Pro license gate clears |
| Client state | Zustand (ephemeral canvas), TanStack Query (server cache), TanStack Table, React Hook Form |
| Contracts | Zod 4 as the single runtime contract layer, with JSON-Schema export |
| Database | PostgreSQL + Drizzle + committed SQL migrations |
| Queue | BullMQ + Redis, fully reconstructable from PostgreSQL |
| Object storage | S3-compatible adapter, MinIO fallback |
| Identity | Better Auth for identity only; authorization is a custom RBAC domain module |
| Dates | UTC persistence, Asia/Tehran + Solar Hijri display, date-fns-jalali |
| Tests | Vitest, database integration tests, Playwright |

Architecture shape: a modular monolith with two processes (web and worker) around shared domain packages; business rules live in shared packages, never in route handlers, queue processors or React components (05 §1, §4). All writes go through explicit command/query services performing authorization, validation, domain writes and audit events in one transaction, followed by a transactional outbox (05 §6–§7).

### Product and machine model

- Five governed machines in fixed order 01 → 02 → 03 → 04 → 05; specialized output agents belong to the Machine 04 production boundary; Machine 05 ends the pipeline — there is no Machine 06 (00 §4, 01 §3).
- Hierarchy: Workspace → Studio Project → Deep Program → Weekly Lens editions as lighter child workflows with a mandatory current-context scan (01 §2).
- Every machine has a mandatory human boundary; machine-generated revision requests return to the relevant Machine 04 job (01 §3).

### Immutability and authority of record

- **PostgreSQL is authoritative.** Redis contains reconstructable dispatch state only; jobs carry IDs, not content; human gates park runs with no job running (00 §4, spec-v0).
- Published workflow definitions, approved artifacts, approvals and run manifests are **immutable**; edits create new versions, reruns create new runs (00 §4).
- Missing inputs, human approvals, validators or valid AI output **block progression** — the system fails closed, never open (00 §4).
- All permissions are enforced server-side; raw AI responses are stored apart from validated outputs (00 §4, spec-v0).

### Repair decisions (settled; recorded in ADR-0011…0016)

These repairs to bundle defects are treated as settled by this spec. They derive authority from their ADRs, not from this document.

- **(a) Authority hierarchy — ADR-0011.** The DELIVERY_README hierarchy governs; 00_READ_ME_FIRST §3 defers to it. Pending human-owner ratification, as flagged in ADR-0011. All conflict resolution in this spec follows that order.
- **(b) Release 0 exit criteria — ADR-0011.** The four dropped source exit criteria are restored: mock structured output validates and stores; failed runs are visible with stage states; prompt versions come from configuration; disabled-user sign-in is blocked with history intact. "Program" in the R0 exit means Project/Program records exist as versioned rows via schema and API (ticket 0.4/0.7 scope); the Program creation flow remains Release 1 (15 §3).
- **(c) Execution state machine — ADR-0012.** PAUSE_RUN produces PAUSED from RUNNING, READY or QUEUED, resumable via RESUME_RUN. CANCEL_RUN reaches CANCELLED from any non-terminal state. SKIPPED is produced by condition-false edges and by governed, capability-gated manual skip. PROVIDER_CONFIGURATION_REQUIRED maps to WAITING_INPUT with a reason code. SUBMIT_INPUT may satisfy an automated stage only when the published definition flags the stage `manual_fallback: allowed`. The run-level status enum, with a defined stage-to-run aggregation rule, is:

  ```text
  DRAFT | QUEUED | RUNNING | WAITING_INPUT | WAITING_APPROVAL
        | PAUSED | SUCCEEDED | FAILED | CANCELLED
  ```

- **(d) Approvals — ADR-0013.** The approval-requests/decisions endpoint is the only approval write path; run-command gate verbs are removed from the runtime command set. `minimum_approvals` requires N distinct human actors, enforced by database constraint. Only HUMAN actors may decide approvals.
- **(e) SSE taxonomy — ADR-0014.** The event taxonomy is extended with run.completed, run.failed, run.cancelled, run.paused, run.resumed, stage.skipped, stage.cancelled and a heartbeat, with snapshot-plus-event-id resume semantics.
- **(f) Release 0 API ownership — ADR-0014.** New ticket 0.16 owns the workflow definition/version CRUD, validate and publish engine, run command endpoints, the SSE stream, and the approval request/decision endpoints. Ticket 0.13 gains dependencies 0.4, 0.10 and 0.16; ticket 0.11 gains 0.8; ticket 0.5's UI screens depend on 0.12 while its server-side auth work is unblocked.
- **(g) Registries — ADR-0015.** Constitution, rule, prompt and example registries are versioned tables with publish flows (ticket 0.8 scope, schema in 0.4). Executor and validator identity is code version plus checksum, recorded in run manifests. The five missing status enums (projects, programs, weekly lenses, requests, calendar items) are enumerated in ADR-0015.
- **(h) Supply chain and outbound fetch — ADR-0016.** Builds happen from a mirror-capable configuration (self-hosted registry mirrors / vendored images, documented in the doc 13 amendment). The SSRF policy for all server-side fetching: scheme allowlist http/https, public-IP-only after DNS resolution, redirect re-validation, size and time caps, no credentials on outbound fetches.

### Language, brand and locale

- FA-first, RTL-first product; Persian authored natively, mechanical translation prohibited; controlled English glossary rendered direction-safely; publishable Persian requires the FA_EDITORIAL capability (00 §4, 01 §7, spec-v0).
- UTC storage, Solar Hijri display; language-neutral internal identifiers with Persian labels (05 §10).
- Brand direction: neutral permanent base, one active Lens accent at a time, motion reveals state and respects reduced-motion; exact hex values and final typography remain provisional tokens pending the visual identity gate (01 §7, 15 §12).

### Build sequencing

The R0–R6 release plan with the Release 0 dependency spine is authoritative sequencing (15 §1), as amended by ADR-0014's ticket 0.16 and dependency corrections. Each release ends with green tests, independent review, a tagged commit and a human-owner gate.

## Testing Decisions

Summarized here; the full strategy lives in `docs/testing-strategy.md`, which defers in turn to (14).

- Tests drive **external behavior at seams** — artifacts, events, states, HTTP responses — never internal call patterns (spec-v0).
- **Seam 1 (primary): the machine/stage contract seam** — machines and stages run through the pipeline executor with fixture inputs, frozen config and the mock gateway adapter. This seam covers machine behavior, hard gates, DROP FIT / LENS RELEVANCE, coverage and saturation arithmetic, budget enforcement, the complete state machine of ADR-0012 (including pause/resume, cancellation from every non-terminal state, skip production and manual-fallback input), run-manifest freezing and all fail-closed paths.
- **Seam 2: the HTTP application seam** — route handlers against real test PostgreSQL: auth, invitations, disable-without-delete, RBAC, the single approval write path with approver distinctness negative tests (ADR-0013), registry lifecycles, request feed and calendars.
- **Playwright** rides on top as a thin FA/RTL rendering smoke layer, not a behavior layer.
- Standing invariants that are never waived: gate failures cannot be score-offset; machine failure never defaults to approval; blocked sources stay in coverage denominators; frozen-plan edits require an approval event; approval history is append-only; self-approval is always labelled; SSRF policy violations are rejected with negative tests (ADR-0016); Redis flush is fully recoverable.
- Golden datasets — including prompt-injection and fabricated-candidate cases — accumulate from Release 1 and become the Release 6 regression suite.
- Synthetic fixtures may exercise schemas, prompts, queues, failure handling and UI states — never taste learning, creative-prompt calibration or creative acceptance (spec-v0; 15 §12).

## Out of Scope

Per (01 §8), Studio V0 does not build:

- Food/kitchen execution, inventory, staffing, suppliers or finance.
- Partner discovery, negotiation or general relationship management.
- Full creative logic for every specialized output agent (interfaces and stubs only).
- Automated public publishing or external communication.
- Vector/embedding infrastructure before structured retrieval proves insufficient.
- Multi-project portfolio optimization.
- English UI locale.
- Machine claims of complete QA over human or physical work.

Physical execution and general venue operations remain outside DROP Studio OS entirely; they may enter only as future DROP OS modules beside Studio, never inside it (00 §4, spec-v0).

## Further Notes

**Authority.** This spec is a derived convenience. When it and the bundle disagree, the `docs/DELIVERY_README.md` authority hierarchy governs, as repaired by ADR-0011 (00_READ_ME_FIRST §3 defers to it; the ruling awaits human-owner ratification). Repairs applied in this document carry the authority of ADR-0011 through ADR-0016, not of this file. Unresolved conflicts follow the bundle's protocol: stop and write a new ADR — never a silent resolution.

**The eight open client gates.** These gate acceptance and production readiness, not the Release 0 build; each has a documented fallback that keeps building lawful before the gate clears (15 §12; ADR-0016 for the supply-chain-adjacent items):

| # | Gate | Blocks | Behavior before the gate |
|---|---|---|---|
| 1 | React Flow Pro license decision | Direct Pro-template use | Open-source React Flow core implementation continues |
| 2 | Workspace Owner assignment | Production UAT | Seeded development actors only |
| 3 | DROP Guardian assignment | Direction and rule approval | Gate remains blocked, fail-closed |
| 4 | FA_EDITORIAL capability holder | Persian publication approval | Gate remains blocked, fail-closed |
| 5 | One real project brief | Release 1 creative acceptance | Mechanics run on synthetic fixtures, never taste calibration |
| 6 | Provider entity, credentials and configuration approval | Live AI execution | Mock adapter; manual dashboard remains fully usable |
| 7 | Visual Identity Application Guide (final typefaces and color values) | Final visual acceptance | Centralized provisional tokens |
| 8 | Persian/Iranian source vetting | Release 2 production research | Registry mechanics and lifecycle run on development sources |

Gate states are fail-closed by name: `GUARDIAN_ASSIGNMENT_REQUIRED`, `FA_EDITORIAL_REVIEWER_REQUIRED`, `PROVIDER_CONFIGURATION_REQUIRED` (the latter surfacing as WAITING_INPUT with a reason code per ADR-0012). A convincing UI demo without provenance, state guards, permissions, persistence and failure handling is not an accepted build (00 §8).
