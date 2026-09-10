# Ticket P1-R — Five-destination shell, seven project tabs and the approved brand tokens

```yaml
ticket_id: "P1-R"
title: "apps/web + packages/ui: collapse the studio navigation to five destinations plus settings, add the seven project tabs, adopt the four approved DROP colors, and repair three RTL/token defects"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "V2 02 §2 — one persistent sidebar, five main destinations plus settings; badge counts come from the same gateway data as work-item tabs"
  - "V2 02 §5 — sticky project header, compact five-stage indicator, one stable seven-tab row; keep all tabs visible; a not-yet-available stage shows prerequisites with a link to act"
  - "V2 02 §1 — the four approved colors, restrained dark editorial UI, no warm sepia palette, status by icon plus label, base text 14-16px, card padding 20-24px"
  - "V2 02 §6 — card layout and the resizable review sheet (560-720px desktop, full-screen mobile drawer)"
  - "V2 02 §10 — every destination supports loading, empty, error+retry, offline/stale, permission-denied and success feedback; validate 1440/1024/768/390"
adr_constraints:
  - "ADR-0019 D13 — six destinations; seven always-visible project tabs; removed routes REDIRECT and are never deleted (the [...rest] catch-all turns a deletion into a silent HTTP 200 dead end); the catch-all is retained; /studio/requests redirects to /studio (owner ruling); this ADR explicitly authorizes reopening committed ticket P1"
  - "ADR-0019 D14 — the four approved colors are adopted dark-first, the warm tint is removed, and --drop-lens-accent is RETAINED as the single brand accent (owner ruling); ADR-0010 D10 is NOT amended; three named defects are repaired in the same change"
  - "ADR-0010 D10 — exactly one Lens accent; unchanged"
  - "ADR-0019 D5 — the card review vocabulary is additive presentation; APPROVAL_DECISIONS is untouched"
  - "ADR-0018 D3 — packages/ui is panel-active; the twelve frozen workspaces stay inert"
in_scope:
  - "apps/web — STUDIO_NAV collapses to six entries: /studio نمای کلی, /studio/projects پروژه‌ها, /studio/reviews بررسی‌ها, /studio/outputs خروجی‌ها, /studio/calendar تقویم و برنامه, /studio/settings تنظیمات (settings visually secondary)"
  - "apps/web — redirect pages for the five removed destinations: /studio/programs -> /studio/projects?type=program, /studio/lenses -> /studio/projects?type=lens, /studio/requests -> /studio (ADR-0019 D13 owner ruling), /studio/runs -> /studio/projects, /studio/workflows -> /studio/projects, /studio/registries -> /studio/settings, /studio/team -> /studio/settings. Redirects are page bodies calling next/navigation redirect(), unit-testable in the jsdom project"
  - "apps/web — the seven project tabs as REAL route folders under app/studio/projects/[id]/: overview, concepts, content, outputs, plan, workflow, activity; a shared sticky header with title, type, owner, stage badge and one next-step CTA; a compact five-segment stage strip; each tab gets its own loading.tsx; a not-yet-available stage renders prerequisites, never a hidden or unexplained-disabled tab"
  - "apps/web — global header: breadcrumbs, search affordance, notifications, current demo actor, and a discreet persistent «حالت نمایشی» badge"
  - "packages/ui — theme.css adopts the four approved colors dark-first; the warm light tint is removed; --accent is split from --drop-lens-accent so it is a neutral hover tint again; --success, --warning, --node-surface, --table-header-bg and --badge-neutral-bg are mapped in apps/web @theme inline"
  - "packages/ui — add the card primitive (flat file, never a subdirectory under components/ui/); widen index.ts exports for the status internals P4 needs (Tone, StatusBadge, StateShell, useIsMobile); add a sheet width variant reaching 560-720px on desktop with a full-screen mobile drawer"
  - "packages/ui — explicit dir on every portal wrapper (alert-dialog, dialog, drawer, sheet, dropdown-menu, context-menu, hover-card, select, popover) and the Toaster"
  - "packages/ui — review status badges for the additive card vocabulary (draft, in_review, revision_requested, approved, rejected) plus the separate current/stale freshness badge, each icon-plus-label"
  - "Guard amendments, each in the commit that forces it and each citing ADR-0019: vocabulary-parity.test.ts (APPROVAL_STATES gains REJECTED); logical-properties.test.ts (the --accent must-contain-var(--drop-lens-accent) assertions, given D14's de-aliasing); the e2e navigation assertion moves from eleven destinations to six and all ten baseline snapshots regenerate"
out_of_scope:
  - "Any data fetching, gateway call, TanStack Query wiring or Zustand store (P4)"
  - "Card content, review sheet behaviour, commands (P4/P6); the graph (P5)"
  - "Typography, iconography and imagery direction — still an open client gate (ADR-0019 D14)"
contracts_changed:
  - "None. This ticket is presentation only; it consumes no gateway and defines no DTO."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None. Actor and role appear as presentation data only; panel-side checks are never a security
  boundary (18 §4.2).
failure_states:
  - "A removed route must never render a bare empty state at HTTP 200 — it redirects"
  - "A not-yet-available project tab explains its prerequisites and links to the action that unblocks it"
  - "Reduced motion disables decorative transitions"
test_seams:
  - "Seam A (component): redirect page bodies, nav membership, stage strip derivation, tab prerequisite rendering"
  - "Seam E (e2e): six destinations, RTL at four widths, portal direction, axe WCAG 2.2 AA in both themes, regenerated snapshots"
  - "Seam F (repo): amended vocabulary-parity and logical-properties guards"
acceptance_criteria: "AC-P1R.1 through AC-P1R.10 — see the checkbox list below"
dependencies: ["P1"]
files_owned:
  - "apps/web/app/studio/** (shell, redirects, project tab routes)"
  - "packages/ui/src/theme.css, src/components/ui/**, src/components/drop/**, src/index.ts"
  - "apps/web/app/globals.css (@theme inline mappings)"
  - "tests/e2e/rtl/** and its snapshots"
  - "tests/repo/vocabulary-parity.test.ts, tests/repo/logical-properties.test.ts (amendments only)"
handoff_required: true
```

## What to build

The shell the V2 journey needs, and the token base every later ticket renders against. P1 built
eleven destinations against doc 04 §2; the owner's V2 pack collapses those to five plus settings
and adds a seven-tab project surface that does not exist at all. ADR-0019 D13 authorizes
reopening P1 for exactly this.

Nothing here fetches data. The tabs render prerequisites and empty states; P4 fills them.

Key mechanics:

1. **Redirect, never delete.** `app/studio/[...rest]/page.tsx` sits at the same depth as the
   static route folders. Deleting `app/studio/runs/` does not produce a 404 — the catch-all
   matches and renders a bare `EmptyState` with HTTP 200, which looks like a working page that
   simply has nothing in it. Every removed destination keeps its folder and becomes a
   `redirect()` body. The catch-all stays (the committed e2e depends on it).
2. **Real tab folders, not `[[...tab]]`.** Seven folders under `app/studio/projects/[id]/` so
   each gets its own `loading.tsx` and its own prerequisites screen, and so the active tab is
   statically analysable. Filter state lives in URL query parameters.
3. **The stage strip is a display grouping** (ADR-0019 D12). Its five segments are Concepts,
   Research/Content, Review, Package, Calendar, but `PanelProject.stage` enumerates no `review`
   member — the Review segment derives from open review counts. Do not add a stored `review`
   stage to make the strip easier.
4. **The accent split is load-bearing.** `--accent` currently aliases `--drop-lens-accent`,
   which is why every loading skeleton renders rust. Splitting them fixes that, and it **turns
   `logical-properties.test.ts` red** because that test currently asserts `--accent:` contains
   `var(--drop-lens-accent)`. Amend the assertion in the same commit, citing ADR-0019 D14 — do
   not work around it by leaving the alias in place.
5. **Never create a subdirectory** under `packages/ui/src/components/ui/`.
   `logical-properties.test.ts` does a non-recursive `readdirSync` + `readFileSync` there and
   throws `EISDIR` on any directory. New primitives are flat files.
6. **Adding exports is free; removing is not.** `owned-set.test.tsx` pins that its listed symbols
   exist, so widening `packages/ui/src/index.ts` is safe and renaming is not.

## Blocked by

P1 (done and committed). This ticket supersedes P1's navigation and token decisions on the
record; it does not reset P1's font pipeline, RTL root, owned shadcn set or gallery route.

## Acceptance criteria

- [ ] **AC-P1R.1 Six destinations** — the sidebar renders exactly the six V2 entries with their
  Persian labels, settings visually secondary; the e2e assertion is updated from eleven to six.
  *Seam: E.*
- [ ] **AC-P1R.2 Redirects, not dead ends** — each of the seven removed paths issues a redirect to
  its recorded target (`/studio/requests` → `/studio` per the ADR-0019 D13 owner ruling); a test
  proves none of them renders a 200 empty state. *Seam: A.*
- [ ] **AC-P1R.3 Seven tabs** — all seven project tabs exist as routes, all are visible at once,
  the active one is marked, and a not-yet-available stage renders its prerequisites with a link
  to act rather than a hidden or unexplained-disabled tab. *Seam: A, E.*
- [ ] **AC-P1R.4 Approved tokens** — `theme.css` carries Charcoal `#121212`, Paper White
  `#F5F5F5`, Aluminum `#B3B6B9` and Logo Charcoal `#1E1E1E`; no warm-tinted neutral survives;
  the default theme is dark; `check-token-literals.mjs` stays green. *Seam: F.*
- [ ] **AC-P1R.5 One accent** — `--drop-lens-accent` remains the single brand accent and is still
  defined at most twice; `--accent` no longer aliases it; loading skeletons render neutral.
  *Seam: F.*
- [ ] **AC-P1R.6 Utility tokens reachable** — `--success`, `--warning`, `--node-surface`,
  `--table-header-bg` and `--badge-neutral-bg` are mapped in `@theme inline` and render from a
  Tailwind class. *Seam: A.*
- [ ] **AC-P1R.7 Portal direction** — every portal wrapper and the Toaster set `dir` explicitly;
  an e2e check opens a sheet, a dialog, a select and a dropdown and asserts RTL inside each.
  *Seam: E.*
- [ ] **AC-P1R.8 Progress is direction-safe** — `progress.tsx` no longer uses an inline physical
  `translateX`; it flips correctly under RTL. *Seam: A.*
- [ ] **AC-P1R.9 Review badges** — the five card review statuses and the separate current/stale
  freshness badge each render icon plus label, never color alone; `vocabulary-parity.test.ts` is
  amended in the same commit to allow `REJECTED` in `APPROVAL_STATES`. *Seam: A, F.*
- [ ] **AC-P1R.10 Checks green** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass;
  `pnpm test:e2e` passes with regenerated snapshots and axe WCAG 2.2 AA clean in both themes at
  1440, 1024, 768 and 390 px. *Seam: E, F.*
