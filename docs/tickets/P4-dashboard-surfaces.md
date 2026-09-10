# Ticket P4 — The start → concept → content → package → calendar journey, the review inbox and the global views

```yaml
ticket_id: "P4"
title: "apps/web: the full start → concept → content → package → calendar card journey, the global review inbox, Outputs and Calendar — TanStack Query and Zustand over the P2 interfaces and P3's worlds; reads and surfaces only"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "V2 04 §3 — the P4 row of the updated P-series mapping: full start → concept → content → package → calendar card journey, inbox and global views"
  - "V2 01 §3 — start flow: «شروع مسیر جدید», the two entry cards «بدون ورودی» (input: null) and «با رفرنس» (at least one valid reference), mock file handling, simulated reference processing, the Weekly Lens parent requirement"
  - "V2 01 §4 — concept batch, card anatomy, the four review actions, revise-versus-replace, «ادامه با کانسپت‌های تأییدشده (N)», pending/rejected proposals never blocking selected approved cards"
  - "V2 01 §5 — frozen approved version, research summary, Iranian/Persian and international counts, gaps and retrieval requests, per-item content review, critical missing evidence blocking only affected required content"
  - "V2 01 §6 — readiness from included branches and their latest active required versions; plan amendment with reason and history; stale packages remain labeled historical snapshots"
  - "V2 01 §7 — one idempotent calendar entry per package family; unscheduled tray with «تعیین تاریخ»; month/week/agenda; Asia/Tehran, Saturday week start, Jalali display; canonical date shapes; drag-with-undo plus keyboard date edit; planned is never published"
  - "V2 02 §3 — Overview: four compact counters, «Needs your attention» ordered by blocked required work then review then missing schedule, active project cards, next two weeks, concise activity; no empty charts, no oversized welcome blocks"
  - "V2 02 §4 — project list: grid/list toggle, search, type/stage/owner filters, sort by recent activity; open the last active tab with URL state preserved"
  - "V2 02 §5 — the seven project tabs and their main content; Content uses a concept selector and filter chips, not another full-width tab row; filters live in URL query parameters"
  - "V2 02 §6 — card anatomy, the 3/2/1 grid at about 300 px minimum, the resizable 560–720 px review sheet with tabs Preview / Sources-checks / Comments / Versions, footer actions showing the target version, focus return, and Global Reviews opening the SAME sheet through the SAME command path"
  - "V2 02 §7 — research coverage expansion (frozen target versus available, by bucket), the source row's fields, fictional-evidence labeling, blocked items explaining their dependency without faking verification"
  - "V2 02 §8 — Outputs' two views and the «3 of 4 required items approved» readiness sentence; calendar canvas, unscheduled tray, month-cell «+N», agenda keyboard access, event sheet"
  - "V2 02 §10 — every destination supports loading, useful empty, error with retry, offline/stale with content kept visible, permission-denied and success feedback; validate 1440/1024/768/390; Jalali month boundaries and timezone edges"
  - "V2 03 §1 — pages call query hooks and application services; TanStack Query holds query state, Zustand holds transient selection/filter/canvas state; no fixture imports in components; persistence goes through the repository adapter, never page-local storage"
  - "V2 04 §2 — minimum visible density: 6–8 project summaries over meaningful stages, at least three concept cards in the main journey, four content items in an active branch; stable IDs and timestamps; demo time starts 2026-09-06T09:00:00Z"
  - "V2 04 §4 — acceptance journeys A01–A20; A01, A02, A05, A06, A08, A10, A11, A14, A16, A17, A18 and A20 are readable on P4's surfaces"
  - "18 §4.1 — the state matrix every surface owes: loading, empty, error, offline, permission-denied and degraded"
  - "09 §9 central Persian labels; 09 §12 table/ID rules — Jalali display, LTR-isolated identifiers"
adr_constraints:
  - "ADR-0019 D2 — frontend only: no API route, no mock server, no fetch. Demo state lives in the single versioned key drop-panel-demo-v2 behind P3's repository adapter; surfaces never open their own localStorage entry"
  - "ADR-0019 D3 — MachineGateway gains no members and PanelGateway stays read-only with its seven; writes belong to PanelCommandGateway and targeted regeneration to RevisionGateway. P4 reads; P6 writes"
  - "ADR-0019 D4 — ReviewApplicationService.reviewItem is the sole constructor of ApprovalCommand and delegates to MachineGateway.submitApproval. One approval write path means one review sheet: the card, the project tab and Global Reviews reach the same component and the same port"
  - "ADR-0019 D5 — the card vocabulary (draft, in_review, revision_requested, approved, rejected) and the separate current/stale freshness axis are an additive presentation vocabulary reached through the named projection adapter; APPROVAL_DECISIONS and APPROVAL_REQUEST_STATES are untouched and ESCALATED keeps its recorded panel rendering"
  - "ADR-0019 D6 — stored codes are UPPER_SNAKE (stableCodeSchema); V2's lowercase literals are the mock-JSON wire form normalized at P3's loader boundary. Source.region maps to COVERAGE_CLASSES; Source.status is split back onto lifecycle, networkReachable and contentRetrievable (06 §5) and is never re-collapsed to suit the fixture shape"
  - "ADR-0019 D7 — PLANNED | CONFIRMED | DONE | CANCELLED stands and ADR-0015 D5 is not amended; unscheduled is PLANNED with date === null, planned is PLANNED with a date, and no calendar item ever reads published"
  - "ADR-0019 D8 — all-day dates use calendarDateSchema, timed events use instantSchema plus a separate display-timezone field; a formatted Persian/Jalali date is never a canonical value"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict(); PanelEvent is a distinct DTO whose unmapped types resolve through the null-tolerant mapping table, never by minting an audit name"
  - "ADR-0019 D10 — GATEWAY_ERROR_REASONS carries REVISION_CONFLICT, deliberately excluded from the retryable default; row-level isMock and receipt-level origin answer different questions and both render"
  - "ADR-0019 D12 — PRODUCT_STAGES is provisional and orthogonal to STAGE_STATUSES and RUN_STATUSES; the five-segment strip is a display grouping whose Review segment derives from open review counts, and the panel claims no run-stage-to-product-stage mapping"
  - "ADR-0019 D13 — six destinations and seven always-visible project tabs, built by P1-R and consumed here; /studio/requests redirects to /studio, whose «Needs your attention» list IS the work inbox; filter and sheet state lives in URL query parameters"
  - "ADR-0019 D16 — the demo clock is 2026-09-06T09:00:00Z; Date.now and Math.random are unreachable from fixture and adapter code; latency, offline, forbidden, failure and conflict are scenario-controlled, never random"
  - "ADR-0019 D18 — the graph is P5's; graph review shortcuts render disabled in P5 and are wired in P6. P4 keeps the same boundary: every write affordance renders in final form and routes to one named, unimplemented command port"
  - "ADR-0019 D20 — the frontier is P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8, strictly one at a time"
  - "ADR-0018 D3 — apps/worker and the eleven machine-oriented packages stay inert; placeholder-purity stays green"
in_scope:
  - "apps/web — TanStack Query and Zustand wired: a QueryClientProvider client boundary mounted INSIDE <body> beside ThemeProvider, a typed query-key registry, a retry policy that reads the P2 typed error model, and one Zustand store holding transient selection/expansion state only"
  - "apps/web — the composition root that injects a MachineGateway, a PanelGateway and (once P2's V2 additions land) the read side the V2 journey needs, resolved from @drop/machine-gateway; the dev/demo scenario selection surface lives in /studio/settings تنظیمات and nowhere in the production path"
  - "apps/web — dependency and transpile wiring: @drop/panel-domain, @drop/machine-gateway and @drop/mock-data added to apps/web/package.json AND to next.config.ts transpilePackages; @tanstack/react-query and zustand added exact-pinned (pnpm add -E)"
  - "Start flow — «شروع مسیر جدید» with the two entry cards «بدون ورودی» (input: null) and «با رفرنس» (at least one valid reference); optional working title, Program/Weekly Lens type (Program default), desired week, content types and notes; a Weekly Lens requires an approved parent and shows the inherited Bible version before start"
  - "Start flow — mock reference handling: PDF/DOCX/MD/TXT, at most 20 MB per file and 5 files, each row showing name, size, remove and a demo processing state; inline errors for unsupported and oversized files; HTTP(S)-only URL validation; pasted text rendered as plain text; the «Reference processing is simulated» demo notice; reference metadata persisted, raw bytes never"
  - "Overview /studio نمای کلی — four compact counters (active projects, pending reviews, blocked items, packages ready/unscheduled), the «Needs your attention» list ordered blocked-required-work → review → missing-schedule with one next action per row, active project cards carrying P1-R's stage strip and next action, the next two weeks of planned items, and a concise activity column"
  - "Projects /studio/projects پروژه‌ها — grid/list toggle, search, type/stage/owner filters, sort by recent activity, cards showing title, Program/Lens badge, parent, stage, review count, last update, owner and planned date; opening a card lands on its last active tab with URL state preserved"
  - "Project tab bodies inside P1-R's seven routes: خلاصه (input, scope, selected concepts, current blocker, milestones), کانسپت‌ها (candidate grid, status filters, batch CTA), محتوا و تحقیق (concept switcher, filter chips, research summary, coverage expansion, content cards), خروجی نهایی (required checklist, readiness, package preview and manifest), برنامه (project-scoped view of the same calendar records), تاریخچه (comments, decisions, attempts, plan changes, package and scheduling history)"
  - "One reusable review sheet — resizable 560–720 px on desktop, full-screen drawer on mobile via P1-R's sheet variant and useIsMobile; tabs Preview / Sources+checks / Comments / Versions; footer actions naming the target version and the actor's eligibility and already-recorded decision; two-pane version comparison with the revision reason; historical versions read-only; focus returns to the triggering card on close"
  - "Global Reviews /studio/reviews بررسی‌ها — Concepts / Content tabs and filters over the cross-project queue, opening the SAME sheet component through the SAME command port; bulk approvals deferred, bulk continue-with-approved supported"
  - "Outputs /studio/outputs خروجی‌ها — the Contents view grouped by concept/category and the Package versions view; readiness rendered as «۳ از ۴ مورد الزامی تأیید شده» with links to each unresolved card; package detail showing current/historical/stale badge, manifest, included versions, generated time and the Download control"
  - "Calendar /studio/calendar تقویم و برنامه — month, week and agenda views, the unscheduled tray with «تعیین تاریخ», filters, and the event sheet linking to the exact package version; month cells showing two or three compact entries plus «+N»; agenda giving complete keyboard access; Asia/Tehran default, Saturday week start, Jalali display through the date-fns-jalali already in packages/ui"
  - "The 18 §4.1 / V2 02 §10 state matrix on every destination and every tab, built from P1-R's primitives, with the stale case keeping content visible under a last-sync timestamp read from the demo clock"
  - "tests/e2e/panel/** — the Persian RTL journeys at 1440, 1024, 768 and 390 px with axe WCAG 2.2 AA, plus the keyboard-only A20 walkthrough"
out_of_scope:
  - "Every mutation. createProject, addComment, selectConcepts, amendOutputPlan, updateCalendar, updateCalendarPackage, exportPackage, subscribe, requestRevision and reviewItem are wired in P6 (ADR-0019 D3, D4). P4 renders each affordance and its dialog in final form behind one named, unimplemented port"
  - "The workflow graph and the گردش کار tab body — P5 (ADR-0019 D18). P1-R's prerequisites screen stays until then; no @xyflow/react import enters apps/web here"
  - "ZIP bytes and the PackageExport type (ADR-0019 D17) — the Download control renders with its reason and produces nothing until P6"
  - "New DTOs, schemas, gateway members or fixtures. P2 is the contract owner and P3 the world owner; a gap stops this ticket and goes back through them (15 §11 discipline), and an unresolved one is recorded for P8"
  - "New workspace packages — workspace-integrity.test.ts pins exactly sixteen and this ticket adds none"
  - "Real authentication, server-side RBAC, transport, polling or SSE (ADR-0019 D2, D9)"
  - "The full responsive/RTL/keyboard/visual QA sweep — P7. P4 must not ship a surface that would fail it"
contracts_changed:
  - "None. P4 consumes the P2 freeze and P1-R's component API; it defines no DTO and adds no gateway member."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  Panel-side presentation only (18 §4.2): affordances hide or disable by the demo actor's
  capability profile and forbidden reads render permission-denied without data leakage. Hidden
  UI is never a security boundary, and the demo capability and role strings are profiles mapped
  onto the closed CAPABILITIES and ACTOR_ROLES sets (ADR-0019 D6) — neither set gains a member.
failure_states:
  - "Disconnected (S13) — DegradedModeBanner above still-visible content with a last-sync timestamp and a retry affordance; OfflineState, which replaces the whole shell, is wrong here because V2 02 §10 requires stale content to stay on screen"
  - "Unauthorized (S14) — PermissionDeniedState with no privileged data in the rendered tree, not merely a hidden button"
  - "Blocked evidence (S08) — the affected required content item explains its missing dependency and its approval affordance is disabled with that reason; unrelated branches keep their own reviewable state"
  - "REVISION_CONFLICT — refresh-then-resubmit, never blind retry: the query client must not treat it as retryable (ADR-0019 D10)"
  - "A card status, event name or calendar status arriving outside the recorded sets renders the P1-R safe fallback badge and never crashes a list"
  - "Reduced motion disables decorative transitions; no surface animates a value it did not receive"
test_seams:
  - "Component seam (jsdom project): every surface, card, sheet tab, dialog, counter and state, plus the projection adapter's rendering and the query/Zustand split"
  - "Scenario seam: each of S01–S24 rendered through real surfaces, asserting its defining presentation; A01, A02, A05, A06, A08, A10, A11, A14, A16, A17, A18 and A20 asserted as read journeys"
  - "Seam E (e2e): tests/e2e/panel/** — the Persian RTL journey at four widths, axe WCAG 2.2 AA in both themes, deterministic screenshots, Jalali month boundary and Tehran timezone edge, keyboard-only review and date edit"
  - "Seam F (repo): the ESLint fixture zone stays green over the whole surface tree, check-pinned.mjs, workspace-integrity, placeholder-purity, and the adapter-swap check"
acceptance_criteria: "AC-P4.1 through AC-P4.14 — see the checkbox list below"
dependencies: ["P3"]
files_owned:
  - "apps/web/app/studio/** — the surface bodies inside P1-R's routes; P1-R's shell, layout, sidebar, redirects and tab scaffolding are consumed unedited except the badge-count wiring point its handoff names (V2 02 §2)"
  - "apps/web/components/** and apps/web/lib/** — cards, the review sheet, dialogs, query hooks, the query-key registry, the composition root and the Zustand store"
  - "apps/web/app/layout.tsx — the QueryClientProvider boundary only"
  - "apps/web/package.json, apps/web/next.config.ts — dependency and transpilePackages additions"
  - "tests/e2e/panel/** and its snapshots"
handoff_required: true
```

## What to build

The journey the V2 pack exists to deliver, rendered end to end: a start dialog, three concept
cards, two approved branches, four content items, a coverage report, an assembled package and a
calendar entry — plus the two global views that reach the same records from outside a project.
P1-R built the rooms; P2 froze the contracts; P3 built the worlds. P4 is where a reviewer opens
`/studio` and sees a working panel for the first time.

Nothing here writes. Every mutating control ships in its final visual and keyboard form, routed
to one named command port that P6 implements — the same boundary ADR-0019 D18 draws for P5's
graph review shortcuts. A disabled control states why it is disabled; an unexplained disabled
control is a defect (V2 02 §5, §10).

**Demoable when done:** select S15 in Settings, press «شروع مسیر جدید», choose «بدون ورودی»,
and read the three seeded candidates on the کانسپت‌ها tab. Switch to S17 and watch two approved
branches carry the «ادامه با کانسپت‌های تأییدشده (۲)» CTA while the third pending card sits
beside them without blocking it. Open S08 and expand Research coverage: the Iranian/Persian and
international buckets show frozen target versus available, the unavailable source shows its
retrieval request and its access state, and exactly one required content item is blocked while
its siblings stay reviewable. Open S11 and read «۳ از ۴ مورد الزامی تأیید شده» with links to the
unresolved card, then the calendar entry for 1405/06/21. Switch to S13 and watch every surface
keep its content under a degraded banner and a last-sync stamp. Switch to S14 and watch the same
screens deny cleanly. Open the same concept from its card, from the project tab and from
`/studio/reviews` — one sheet, one footer, one port.

Key mechanics:

1. **Wire the two libraries, then fix the two things that break.** `pnpm add -E
   @tanstack/react-query zustand --filter @drop/web` — a caret range fails
   `scripts/check-pinned.mjs`, which runs inside `pnpm lint`, not just in CI. Then:
   `@drop/panel-domain`, `@drop/machine-gateway` and `@drop/mock-data` must be added to both
   `apps/web/package.json` and `next.config.ts`'s `transpilePackages`, which today lists only
   `["@drop/ui", "@drop/workflow-ui", "@drop/pipeline", "@drop/contracts"]`. These packages
   export raw TypeScript from `src/index.ts`; without the transpile entry `next build` fails on
   their syntax, and without the manifest entry pnpm's strict layout will not resolve them.
2. **`@drop/mock-data` is a resolution edge, never an import.** It is listed because
   `@drop/machine-gateway`'s mock adapter pulls it in and Next must transpile it — not because
   apps/web may touch it. The P2 ESLint zone bans `@drop/mock-data` and
   `@drop/panel-domain/fixtures` across `apps/web/app/**`, `apps/web/components/**` **and
   `apps/web/lib/**`**, so the composition root cannot reach fixtures either; it constructs
   `MockMachineGateway` / `MockPanelGateway` from `@drop/machine-gateway`. Note the corollary:
   a new top-level tree such as `apps/web/features/**` would match **no** zone and the ban would
   silently not apply. Keep every component and hook under the three directories the zone
   already matches, or extend the zone in the same commit.
3. **`QueryClientProvider` goes inside `<body>`.** `apps/web/app/layout.test.tsx` calls
   `RootLayout({ children: null })` and asserts `el.type === "html"` with `props.lang` and
   `props.dir`. Wrapping `<html>` in a provider changes `el.type` and turns that test red.
   Mount the provider as a `"use client"` boundary beside `ThemeProvider`, inside `<body>`,
   mirroring `apps/web/app/theme-provider.tsx`. Create the `QueryClient` inside the client
   component (a module-level client leaks state between requests under App Router).
4. **The state split is a rule, not a preference** (V2 03 §1). TanStack Query owns everything
   that came from a gateway. Zustand owns transient selection, expansion and hover state — and
   nothing else. Filter, tab and sheet state lives in URL query parameters (ADR-0019 D13), so a
   Zustand mirror of a filter is a second source of truth that breaks A17's reload and the
   deep-linking D13 requires. Demo persistence belongs to P3's repository adapter behind
   `drop-panel-demo-v2`; a surface that calls `localStorage` directly violates ADR-0019 D2 and
   V2 03 §1 in one line.
5. **The retry policy must read the typed error model.** TanStack Query's default retries three
   times with backoff, which silently delays S13's degraded banner and — worse — retries
   `REVISION_CONFLICT`, which ADR-0019 D10 deliberately excludes from the retryable default
   because a conflict is resolved by refresh-then-resubmit. Derive `retry` from
   `GATEWAY_ERROR_REASONS`, never from the default.
6. **The last-sync timestamp comes from the demo clock, not the browser.** ADR-0019 D16 puts
   `Date.now` out of reach of fixture and adapter code, and a component calling `new Date()`
   re-introduces it one layer up: screenshots stop being deterministic and Seam E snapshots
   flake. Query's own `dataUpdatedAt` is `Date.now()`-derived and is therefore not the value to
   display; render the snapshot's or receipt's `occurredAt` from the injected clock anchored at
   `2026-09-06T09:00:00Z`.
7. **Lowercase is wire form.** `seed.json` says `"approved"`, `"planned"`, `"iran"`; stored
   codes are UPPER_SNAKE per `stableCodeSchema` and P3's loader normalizes at the boundary
   (ADR-0019 D6). A component that switches on a lowercase literal is reading un-normalized
   data — that is the defect, not a formatting choice. The card vocabulary reaches the recorded
   sets only through the named projection adapter (D5): `revision_requested` displays as
   `CHANGES_REQUESTED`, freshness is a second, separate badge, and `ESCALATED` keeps its
   recorded panel rendering rather than being dropped for having no V2 counterpart.
8. **One sheet, one port, three doors.** The card, the project tab and `/studio/reviews` mount
   the same sheet component and call the same review port, which P6 backs with
   `ReviewApplicationService.reviewItem` — the sole constructor of `ApprovalCommand`
   (ADR-0019 D4). A second sheet built "just for the inbox" is a second approval path in
   embryo; A14 exists to catch exactly that, and D19's `submitApproval`-stub invariant is what
   proves it later. Sheet identity and tab live in URL query parameters so the same link opens
   the same sheet from any door.
9. **Coverage renders the split, not the fixture shape.** `Source.status` in
   `mock/panel-contracts.ts` collapses availability into `available_demo | blocked`; ADR-0019
   D6 splits it back onto `lifecycle`, `networkReachable` and `contentRetrievable` per 06 §5.
   The source row shows title, language, `COVERAGE_CLASSES` region, that three-field access
   state, citation, rationale and provenance — and every row is labeled fictional/sample, with
   `.invalid` URLs and `isMock: true` carried through. Retry never flips a blocked source to
   verified; availability changes only with the scenario response (V2 02 §7). Neither coverage
   bucket may read zero.
10. **Blocking is local.** Critical missing evidence blocks approval of the affected required
    content item only. A blocked branch never freezes an unrelated branch, and a pending or
    rejected concept never blocks a selected approved one — A06/S17 and A08/S08 are the two
    tests that prove it. The same locality governs the stage strip: its Review segment derives
    from open review counts (ADR-0019 D12), and no stored `review` stage is added to make the
    arithmetic easier.
11. **Readiness is a sentence, not a bar.** «۳ از ۴ مورد الزامی تأیید شده», with each unresolved
    item linked. The denominator is the frozen output plan's required content IDs (V2 03 §7);
    unselected candidate concepts do not count against it (V2 01 §6). Do not reach for
    `packages/ui/src/components/ui/progress.tsx` — a bar asserts a global percentage the domain
    never computes, and V2 02 §8 forbids inventing one. V2 02 §1 forbids the neighbouring
    temptations too: no KPI charts, no oversized welcome block, no financial-dashboard filler.
12. **Dates have two canonical shapes and one display shape.** All-day entries persist through
    `calendarDateSchema` (`^\d{4}-\d{2}-\d{2}$`, arriving with P2's V2 additions); timed events
    persist as `instantSchema` UTC instants plus a separate display-timezone field; the Jalali
    string is display only (ADR-0019 D8). Format through `date-fns-jalali@4.4.0-0` and
    `@date-fns/tz@1.5.0`, both already in `packages/ui` — no second date library, no new
    dependency. Two edges are worth a test each: Shahrivar has 31 days, so the month boundary
    falls between `2026-09-22` (1405/06/31) and `2026-09-23` (1405/07/01); and Asia/Tehran is
    UTC+03:30, so an instant at `2026-09-22T21:00:00Z` is Mehr 1 in Tehran and Shahrivar 31 if
    formatted in UTC. The demo clock `2026-09-06T09:00:00Z` is 1405/06/15, a Sunday, so the
    demo week begins Saturday `2026-09-05` and the seeded entry `2026-09-12` (1405/06/21) falls
    inside Overview's two-week window.
13. **Planned is not published** (ADR-0019 D7). `unscheduled` renders as `PLANNED` with
    `date === null` — «آماده برنامه‌ریزی» in the tray behind «تعیین تاریخ» — and a dated item
    renders «برنامه‌ریزی‌شده». Choosing a date is a scheduling choice, not an approval gate and
    not a publication. Rescheduling ships two ways in P4: the drag affordance with its undo
    surface, and a keyboard-accessible date edit that is not an afterthought — A20 requires the
    whole journey to be walkable without a mouse. Both route to the same port. The project
    برنامه tab is a scoped view of these same records, never a second store.
14. **Every list needs its six states, and stale is the one that gets it wrong.** `LoadingState`,
    `EmptyState`, `ErrorState` with retry, `PermissionDeniedState`, success feedback — and for
    stale, `DegradedModeBanner` **above content that stays on screen**. `OfflineState` replaces
    the whole shell, which is exactly what V2 02 §10 forbids for a disconnect. Density comes
    from P3: 6–8 projects across meaningful stages, at least three concept cards, four content
    items in an active branch. If a world is thinner than that, it is P3's owner's fix, never an
    inline fixture in a surface.

## Blocked by

P3 (the twenty-four worlds, the shared repository, persistence and the mock adapters), which
carries P1-R and P2 transitively — the shell, tabs and tokens from P1-R, the frozen DTOs and
interfaces from P2. P2's V2 additions (the panel read members the journey needs,
`calendarDateSchema`, the projection adapter and the command envelope) must have landed before
this ticket opens; a missing read is a P2 question and, if it stays open, a P8 coordination
item — never a member added here.

P5 starts only after P4 completes (ADR-0019 D20).

## Acceptance criteria

- [ ] **AC-P4.1 Libraries wired without breaking the build** — `@tanstack/react-query` and
  `zustand` are exact-pinned; `@drop/panel-domain`, `@drop/machine-gateway` and `@drop/mock-data`
  appear in both `apps/web/package.json` and `next.config.ts` `transpilePackages`;
  `QueryClientProvider` sits inside `<body>` and `apps/web/app/layout.test.tsx` stays green;
  Query holds only gateway state and Zustand only transient selection, with filters, tabs and
  sheet identity in URL query parameters. *Seam: component seam + Seam F.*
- [ ] **AC-P4.2 Start flow** (V2 01 §3; A01, A02, A18) — «شروع مسیر جدید» opens both entry
  cards; «بدون ورودی» produces a literal `input: null`, not an empty reference list; «با رفرنس»
  requires at least one valid reference; PDF/DOCX/MD/TXT, 20 MB and 5-file limits show name,
  size, remove and the demo processing state, with inline errors for unsupported and oversized
  files; URLs accept HTTP(S) only and are never fetched; the demo notice states that reference
  processing is simulated; a Weekly Lens refuses to start without an approved parent and shows
  the inherited Bible version first (S07 refuses, S12 proceeds). *Seam: component seam +
  scenario seam.*
- [ ] **AC-P4.3 Overview is the inbox** (V2 02 §3; ADR-0019 D13) — four compact counters; the
  «Needs your attention» list ordered blocked-required-work → review → missing-schedule with one
  next action and context per row; active project cards with P1-R's stage strip and next action;
  the next two weeks of planned items; a concise activity column; an empty state that explains
  both entry modes and offers the CTA. No chart, no welcome block, no `Progress`. *Seam:
  component seam + scenario seam (S01 empty, S11 populated).*
- [ ] **AC-P4.4 Concepts** (V2 01 §4, 02 §6; A04, A06) — the candidate grid renders three
  columns at wide desktop, two at medium and one at mobile with a readable minimum near 300 px;
  status filters work; «ادامه با کانسپت‌های تأییدشده (N)» carries the live count and is
  unavailable with zero approved cards; pending and rejected proposals leave selected approved
  cards advanceable (S17); a rejected card stays visible with its reason and offers revise
  versus replace, and a replacement shows its `replacesConceptId` lineage while the original
  remains in history (S24). *Seam: scenario seam + component seam.*
- [ ] **AC-P4.5 Content and research** (V2 01 §5, 02 §5, §7) — the tab uses a concept switcher
  and filter chips, not a second full-width tab row; the top strip shows active concept,
  approved version and research summary; the coverage expansion shows frozen target versus
  available per `COVERAGE_CLASSES` bucket with neither bucket at zero; each source row shows
  language, region, the `lifecycle`/`networkReachable`/`contentRetrievable` access state,
  citation, rationale and provenance; every demo source is labeled fictional and carries
  `isMock`; a mocked retry never marks a blocked source verified. *Seam: component seam +
  scenario seam (S08).*
- [ ] **AC-P4.6 Blocking stays local** (A08) — on S08 the affected required content item is
  blocked with its missing-dependency explanation and its approval affordance disabled with that
  reason, while every unrelated content item in the same project and every unrelated branch
  keeps its own reviewable state. *Seam: scenario seam.*
- [ ] **AC-P4.7 One review sheet, three doors** (V2 02 §6; ADR-0019 D4; A14) — the sheet is
  resizable between 560 and 720 px on desktop and a full-screen drawer on mobile; its four tabs
  are Preview, Sources+checks, Comments and Versions; the footer names the target version and
  the actor's eligibility and recorded decision; version comparison is two-pane with the revision
  reason and historical versions are read-only; focus returns to the triggering card on close; a
  test asserts the card, the project tab and `/studio/reviews` mount the same component and call
  the same port — no second approval path exists in the tree. *Seam: component seam + Seam E.*
- [ ] **AC-P4.8 Outputs** (V2 01 §6, 02 §8) — the Contents view groups by concept and category
  and the Package versions view lists the family; readiness reads «۳ از ۴ مورد الزامی تأیید شده»
  with each unresolved item linked, computed from the frozen plan's required IDs, with no global
  percentage and no `progress.tsx` anywhere in the tree; package detail shows the
  current/historical/stale badge, manifest, included versions and generated time, and a stale
  package is labeled a historical snapshot rather than the current ready package; the Download
  control renders disabled with its reason until P6. *Seam: scenario seam (S11, S21) + component
  seam.*
- [ ] **AC-P4.9 Calendar** (V2 01 §7, 02 §8; ADR-0019 D7, D8; A10, A11) — month, week and
  agenda render; the unscheduled tray offers «تعیین تاریخ»; month cells cap at two or three
  entries plus «+N»; the event sheet links to the exact package version; the default timezone is
  Asia/Tehran and the week starts Saturday; Jalali display comes from `date-fns-jalali` with no
  new dependency; all-day values are ISO calendar dates and timed values UTC instants plus a
  timezone, with no formatted Persian date stored as canonical; an item reads «آماده
  برنامه‌ریزی» or «برنامه‌ریزی‌شده» and never «published»; tests cover the 1405/06/31 → 1405/07/01
  boundary and the `2026-09-22T21:00:00Z` Tehran edge. *Seam: component seam + Seam E.*
- [ ] **AC-P4.10 Two ways to reschedule** (A20) — the drag affordance with its undo surface and a
  keyboard-accessible date edit both exist and both route to the same command port; the complete
  review-and-schedule journey is walkable with the keyboard alone at 390 px, proven in Playwright
  without a single mouse action. *Seam: Seam E.*
- [ ] **AC-P4.11 Six states everywhere** (18 §4.1; V2 02 §10) — every destination and every tab
  renders loading, useful empty, error with retry, permission-denied and success feedback; the
  disconnected case (S13) keeps its content visible under `DegradedModeBanner` with a last-sync
  timestamp taken from the demo clock, and `OfflineState` is not used for it; the unauthorized
  case (S14) renders `PermissionDeniedState` with no privileged data in the rendered tree.
  *Seam: component seam + scenario seam.*
- [ ] **AC-P4.12 Seam purity and the no-redesign check** — the ESLint zone passes over the whole
  surface tree and a committed bad fixture proves it still fires from `apps/web/lib/**`; no
  component imports `@drop/mock-data` or `@drop/panel-domain/fixtures`; swapping the injected
  mock adapter for P2's in-test reference stub leaves every page-level test green (18 §12);
  `workspace-integrity.test.ts` still counts sixteen packages and `placeholder-purity` stays
  green. *Seam: Seam F + component seam.*
- [ ] **AC-P4.13 Determinism, honesty and the RTL journey** — the Persian RTL journey (start →
  concepts → content → outputs → calendar → reviews) runs in Playwright at 1440, 1024, 768 and
  390 px with axe WCAG 2.2 AA green in both themes and byte-stable screenshots across repeat
  runs; no outbound network request is made in demo mode; the «حالت نمایشی» badge, row-level
  `isMock` and receipt-level `origin` all render, and no UI string claims a real machine
  operation, a real publication or real research. *Seam: Seam E.*
- [ ] **AC-P4.14 Checks green** (16 §7) — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  pass and `pnpm test:e2e` passes with its new panel specs; `check-pinned.mjs` and
  `check-token-literals.mjs` stay green. *Seam: Seam F.*
