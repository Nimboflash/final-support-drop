# P9 — Studio simplification handoff

**Ticket:** P9 (ADR-0020)
**Status:** delivered
**Relationship to P8:** this document **supersedes sections 1 and 4** of
`docs/handoff/P8-frontend-to-machine-build.md` — the navigation, the surface list and the
composition-root description. Everything else in P8 stands unchanged and is still the
authoritative document for the machine build: its ten open decisions (§2), its provisional
contract register (§3), what was deliberately not built (§5), and its standing risks (§6).

**The hard stop still holds.** P8 stops *machine* work, and nothing here starts a machine, a
transport, a backend or a provider call. ADR-0020 D1 reopened the panel's own presentation on the
owner's simplification brief. That is panel scope, and this is the end of it.

---

## 1. What changed, and why

The panel was organised around a **process**: its navigation was named after the stages of that
process, a project was a container you entered before you could do anything, and every surface
repeated where that project sat inside the pipeline.

The owner's brief (`docs/frontend-v2/06_SIMPLIFICATION_BRIEF.md`) objects that a person does not
work on a stage. They work on a concept, a piece of content, an output, a date. ADR-0020 adopts
that, and P9 implements it.

### The navigation now (supersedes P8 §1's "six destinations, seven project tabs")

Six destinations, each earning its place by answering exactly one question. The question is
recorded in the navigation model itself, so a seventh cannot be added without stating what it
answers:

| Destination | Route | The question it answers |
|---|---|---|
| نمای کلی | `/studio` | الان چه چیزی به توجه من نیاز دارد؟ |
| کانسپت‌ها | `/studio/concepts` | چه ایده‌هایی داریم و کدام‌ها انتخاب شده‌اند؟ |
| محتوا | `/studio/content` | چه چیزی نوشته شده و چه چیزی منتظر من است؟ |
| خروجی‌ها | `/studio/outputs` | چه چیزی آمادهٔ تحویل است؟ |
| تقویم | `/studio/calendar` | چه چیزی کِی منتشر می‌شود؟ |
| Engine | `/studio/engine` | سیستم الان دقیقاً کجای کار است؟ |

Settings and history are not work; they moved to a secondary menu in the sidebar footer.

**The project is no longer a place.** It is a filter carried in the URL (`?project=p1`), applied
by a selector on the work-unit pages themselves. `/studio/projects/:id` and all seven of its tabs
now redirect.

### Why the redirects are load-bearing rather than tidy

`apps/web/app/studio/[...rest]/page.tsx` sits at the same depth as the retired route folders. A
deleted folder therefore does **not** produce a 404 — it produces a bare empty state at HTTP 200,
which reads to a user as a working page that happens to be empty. Every retired path keeps its
folder and redirects, and `studio-nav.test.ts` asserts each folder still exists on disk.

| Retired | Lands on |
|---|---|
| `/studio/projects` | `/studio/concepts` |
| `/studio/reviews` | `/studio/content` |
| `/studio/programs`, `/studio/lenses` | `/studio/concepts` |
| `/studio/requests` | `/studio` |
| `/studio/runs`, `/studio/workflows` | `/studio/engine` |
| `/studio/registries`, `/studio/team` | `/studio/settings` |
| project tabs: overview / concepts / content / outputs / plan / workflow / activity | `/studio` / concepts / content / outputs / calendar / engine / activity |

### Engine is what made the simplification safe

The honest question about removing the five-stage strip from every content surface is whether
that information was deleted or moved. **It moved.** `/studio/engine` renders the real execution
graph of the selected project — node status, the active path, what is waiting on a person, where
a failure is — built from application state, never hard-coded.

It is **read-first by decision**: no destructive operations, no forced skip, no manual state
edits. A node awaiting a person links to the surface where that work actually happens, and the
work happens there. The accessible stage list beside the canvas is built from the same view model
as the canvas, so the two cannot drift (ADR-0019 D18).

### The calendar became a calendar

The brief's objection was precise: the old surface was "merely a dated list wearing the
appearance of a calendar". This one has a month grid of six weeks including the borrowed days of
the adjacent months so the layout never jumps, today marked, a selected day, week and agenda
views over the same events, navigation with a return to today, and a date change that survives a
reload. The week starts Saturday; titles are Jalali.

---

## 2. The language rule is enforced, not intended

ADR-0020 D5 and D6 are rules about strings a person reads: no ticket names, no gateway or
dependency vocabulary, no version labels, no raw identifiers, no «بسته» as a product noun, and
one honest demo marker instead of a simulation notice repeated on every surface.

Nothing in a type system or a behaviour test notices a technical phrase appearing on a new page.
Such a rule is true on the day it is written and quietly false a month later, so it is a repo
check: `tests/repo/interface-language.test.ts`.

**What it scans:** `apps/web/app/studio`, `apps/web/components/panel`,
`packages/ui/src/components/drop`, and `packages/workflow-ui/src` — the Engine graph's labels are
interface text too, and were the one place the banned vocabulary survived precisely because an
earlier version of the guard stopped at the app.

**What it excludes, and why that is not a hole:** `labels-fa.ts`, `vocabulary.ts` and the
`status.tsx` badges that render them are the *recorded* domain vocabulary of doc 09 §9, whose
completeness `vocabulary-parity` enforces against the ADRs. `WAITING_FOR_DEPENDENCY` genuinely
means "waiting for a dependency"; editing that translation to satisfy a presentation rule would
corrupt the mapping. The rule the recorded vocabulary obeys instead is that **no panel surface
renders it directly**, which the same guard asserts.

If you add a surface, this guard is the first thing that will fail you. The fix is to say it in
the user's words — never to widen the exclusions.

---

## 3. Defects this work surfaced

Each is listed with the guard that now covers it, because a fix without a guard comes back.

| Defect | Why it survived every prior review | Guard now |
|---|---|---|
| Engine rendered raw `EDITORIAL` / `FILM` / `LANDING`, and the noun «بسته» | The Persian label map lived in `apps/web`, which `packages/workflow-ui` cannot import, so every graph node fell through its `?? item.type` escape | Map moved to `packages/panel-domain/src/projection/output-type-label.ts`, typed `Record<OutputType, string>`; language guard extended to `workflow-ui` |
| No navigation landmark existed | The sidebar's `aria-label` sat on a generic element, where it is discarded | Destinations sit in a real `<nav>`; the e2e queries the landmark |
| Two `main` landmarks | `SidebarInset` renders one and the layout nested a second inside it | An e2e asserts exactly one |
| Three English strings in a fa-IR-only product — "Toggle Sidebar", "Sidebar", "Displays the mobile sidebar" | They are screen-reader-only, so no visual review could see them | An e2e asserts no untranslated English on any surface |
| ISO dates and Latin digits on project cards, in the concept detail and in the Engine header | Nothing asserted the display format, only the value | Jalali display, one shared `toPersianDigits`, and the surfaces render no ASCII digit |
| **«افزودن منبع» had no handler at all** — it sat beside a message saying a source was missing, looked enabled, and did nothing | Typecheck cannot see a missing `onClick`; lint cannot either; and the e2e asserted the button was *visible and enabled*, which it was. The test certified the defect | `tests/repo/no-inert-controls.test.ts`, and an e2e that records a source and asserts the block lifts |
| Every route's `loading.tsx` boundary was deleted with the routes that held them, and none came back | A missing loading boundary is not a type error, not a lint error, and invisible to a test that waits for the page to settle. Only a person on a slow connection sees it — as nothing at all | `tests/repo/destination-states.test.ts` asserts a boundary per destination |
| No route had an **error** boundary at all, which brief §11 requires | Nothing ever asked for one | One boundary at the `/studio` segment root, with retry; the same guard asserts it exists, offers `reset`, and never renders the raw error |
| `/studio` read `?project=` without a Suspense boundary | `useSearchParams` in a page without one silently opts the route out of prerendering | The boundary is in place at page level, matching the other six |
| The project card was labelled «ادامه» — the exact word the brief names as its ambiguous example (§10) | Nothing checked button labels | `interface-language.test.ts` now rejects a control whose entire label is a word that says nothing, and the check is proven able to fail |
| The overview ignored `?project=`, so the filter silently vanished on one destination out of six | Only the brief's §8 route table says the project overview must land filtered | An e2e asserts `/studio?project=p1` narrows to one project and keeps the selector |

`StageStrip` was retired rather than kept. ADR-0020 D3 originally claimed `owned-set.test.tsx`
protected the component; it never listed it. The ADR text is corrected, and the read models that
fed only the strip (`stageSegments`, `overviewCounters`, `blockedCount`) went with it rather than
surviving as code only their own tests called.

---

### One demo-world behaviour changed, and it is reported rather than imposed

Making «افزودن منبع» real required the block to actually lift. No gateway member and no revision
route was added: `RESEARCH_REFRESH` already means "the research input changed", and the mock now
clears `generationState: "BLOCKED"` for that route and no other. Nothing is fetched or extracted
(ADR-0019 D2) — recording the reference is the whole effect.

**This is a provisional panel expectation, not a contract the machine build must accept.** It is
not in the conformance suite, because adding it there would impose it (18 §9: the panel "must not
silently impose internal implementation choices on the machine system"). It belongs beside P8
§2's open decisions:

> **Does supplying a missing source lift the block, and through which call?** The panel's
> provisional answer: yes, through the existing `RESEARCH_REFRESH` revision route, which returns
> the item to review rather than approving it. If the machine build rules otherwise — a separate
> upload call, or an asynchronous re-run that leaves the item blocked until it completes — the
> panel's content surface needs a pending state between "source supplied" and "unblocked", and
> the QA scenario's step 11→12 sequence changes shape. Two mock tests pin the current answer,
> including the negative: a `CONTENT_REWRITE` revision leaves a blocked item blocked.

---

## 4. What did NOT change — the test that D10 held

This was a presentation restructure, and the proof is what it did not touch:

- **`MachineGateway`** is byte-frozen and untouched; `tests/repo/verbatim-machine-gateway.test.ts`
  still passes.
- **`PanelGateway`** keeps its seven read-only members. Writes stay on `PanelCommandGateway` and
  targeted regeneration on `RevisionGateway`.
- **The single approval write path** (ADR-0013 D1) is unchanged, and its rejecting-stub proof —
  severing `submitApproval` and requiring the suite to go red — still runs.
- **The 24 scenarios and the conformance suites** are unchanged. Review moved to a different
  surface; who may review, and how, did not move.
- **Determinism** (ADR-0019 D16): the demo clock is still `2026-09-06T09:00:00Z`; `Date.now` and
  `Math.random` remain unreachable from fixture, adapter and surface code.
- **The workspace** is still exactly sixteen packages. The new projection module lives inside
  `panel-domain`; no package was added.
- **`packages/panel-domain` gained no entity, schema or gateway member** — one projection export
  only, for the reason given in §3.

### The composition root (supersedes P8 §4 item 2)

P8 named `apps/web/lib/demo/session.ts` as the single place adapters are injected. That is still
the composition root; what changed is where it is **mounted**. `DemoProviders` now mounts in
`apps/web/app/studio/layout.tsx` rather than the root layout, because the demo session belongs to
the panel and `/dev/gallery` has no use for a gateway.

There is deliberately **no Suspense boundary** around it, and this is not an oversight. A client
component calling `useSearchParams` at layout level suspends and never resolves in dev — the
panel sat on its loading fallback forever while the production build rendered fine, so all e2e
passed against a bug every developer would hit immediately. `DemoProviders` reads the scenario
from `window.location` instead. A boundary there would only hide it again.

---

## 5. Known limitations carried forward

P8 §6.1 through §6.6 all still stand. Two are amended and one is added:

- **§6.1 — CLOSED. CI exists.** `.github/workflows/checks.yml` runs all six canonical checks on
  every push and every pull request to `main`, and `tests/repo/ci.test.ts` fails if it stops
  running one of them. The browser job runs on macOS because the visual baselines are
  platform-pinned to darwin. This was the repository's highest standing risk for its whole life
  and it is no longer advisory.
- **§6.3 — the graph still has no committed pixel baseline.** ELK lays out asynchronously and
  React Flow fits on mount, so a baseline would be timing-sensitive. Engine's derived nodes and
  its stage-list equivalence are asserted instead. Unchanged by this work.
- **§6.5 — drag-to-reschedule is still not implemented.** The calendar gained real navigation and
  a date edit that survives a reload; the drag affordance with undo (V2 01 §7) is still not
  built, and the keyboard route remains the accessible one.
- **New — the interface-language guard cannot see composed strings.** It reads string literals in
  the surface tree. A banned word assembled at runtime from parts, or arriving from demo fixture
  content, will pass it. The e2e language assertions in `full-audit.spec.ts` read rendered text
  and cover that gap for the surfaces they visit; a surface no e2e visits is unguarded against
  composed strings.

---

## 6. The brief's own acceptance criteria (§14), mapped to evidence

Twenty-three criteria, each with the test that proves it. Where the evidence is the QA scenario,
it is proved twice — once at desktop and once at mobile, as §15 instructs.

| # | Criterion (abridged) | Evidence |
|---|---|---|
| 1 | One clear CTA starts concept generation from the overview | `qa-scenario` step 2 |
| 2 | Start from a prompt, file, link, prior reference, or nothing | `qa-scenario` steps 3–4; `full-audit` "the composer offers every start without asking for a mode first" |
| 3 | Each start yields 3–4 reviewable concepts | `qa-scenario` step 5 |
| 4 | The concept card carries title, summary, date, useful preview — nothing else | `qa-scenario` step 6 asserts no version identifier |
| 5 | Concept detail is a readable document plus a space to converse | `full-audit` "the concept assistant accepts a request and records it" |
| 6 | A concept can be selected for content, or set aside | `full-audit` "selecting a concept moves it out of the new state"; `qa-scenario` step 8 |
| 7 | The content page shows only content, grouped under its parent concept | `full-audit` "content is grouped under its parent concept"; `qa-scenario` step 9 |
| 8 | Each content item can be viewed, edited, improved, **sourced** and approved | `qa-scenario` steps 10–12; `no-inert-controls`; the two mock tests on `RESEARCH_REFRESH` |
| 9 | No parallel Review page and no Concept Review tab | `shell-and-gallery` nav assertions; `qa-scenario` step 9 |
| 10 | A concept's outputs are one coherent, reviewable set | `qa-scenario` step 13 |
| 11 | An approved output can enter the calendar's undated tray | `qa-scenario` steps 14–15 |
| 12 | The calendar item keeps its project, concept and output materials | `qa-scenario` step 17 |
| 13 | The overview has no five-stage strip and no "next two weeks" | `qa-scenario` step 1, asserted against the pre-restructure strings |
| 14 | No internal identifier or technical text in the main UI | `interface-language` (static) + `full-audit` and `qa-scenario` (rendered) |
| 15 | Important old routes redirect without a broken page | `qa-scenario` "no retired route shows a broken or empty page"; `studio-nav.test.ts` |
| 16 | Mobile works with no horizontal scroll and correct RTL | `qa-scenario` at 390px asserts document scroll width at every surface |
| 17 | Existing relevant tests pass; new tests cover the main flow | 655 unit / 46 files; the QA scenario is the new main-flow coverage |
| 18 | The calendar supports a real month grid, navigation, day selection, event detail and date change | `full-audit` "the calendar behaves like a calendar" (5 cases) |
| 19 | Week and agenda views use the same real event data | `full-audit` "switches between month, week and agenda over the same events"; `qa-scenario` step 19 |
| 20 | Engine shows the selected project's workflow with real nodes, edges and status | `full-audit` "renders the graph and its accessible equivalent from one model"; `qa-scenario` step 20 |
| 21 | Active path, running, needs-action and error are distinguishable in Engine | `engine-legend` states them in words; `full-audit` selects by `data-state` |
| 22 | Selecting a node opens details and links to the related item | `full-audit` "a node needing attention links to where the work happens"; `qa-scenario` step 23 |
| 23 | Engine uses React and existing shadcn/ui components, with no hard-coded final graph | `buildProductGraph` derives every node from the snapshot; `product-graph.test.ts` |

---

## 7. Verified check results

Recorded when the ticket closed, and re-run on every push since CI landed (§5).

| Command | Result |
|---|---|
| `pnpm typecheck` | green |
| `pnpm lint` | green (`eslint`, `check-pinned`, `check-token-literals`) |
| `pnpm test` | green — **668 tests** across 47 files |
| `pnpm test:db` | green (inert no-op through `scripts/inert-gate.mjs`; panel scope has no database) |
| `pnpm test:e2e` | green — **160 Playwright tests**, run three times consecutively; axe WCAG 2.2 AA clean in both themes on every destination and every overlay |
| `pnpm build` | green |

Four pre-restructure specs were retired — `panel-journey`, `workflow-graph`, `commands` and
`panel-visual` all asserted the old route structure — and their behaviours are covered by
`full-audit.spec.ts` across every surface, `shell-and-gallery.spec.ts`, and the new
`qa-scenario.spec.ts`, which walks the brief's own §15 scenario end to end at desktop and mobile.

A browser run actually occurred; the e2e result is not inferred from unit tests (V2 04 §5).

### Preview

```bash
export PATH="$HOME/.local/bin:$PATH" && CI=true pnpm install --frozen-lockfile && pnpm dev
```

`http://localhost:3110/studio`, default demo state, `DROP_DEMO=1`. The pnpm store path and the
`pnpm` shim are not durable on the build machine; restore them before trusting any check result.

---

## 8. Governance state

- **ADR-0020** is recorded and adopted. It supersedes ADR-0019 D13 (destinations and project
  tabs) and withdraws ADR-0019 D12's stage strip from content surfaces. Everything else in
  ADR-0019 stands.
- **ADR-0010 D10 is still not amended.** `--drop-lens-accent` survives as the single brand accent.
- **Doc 15 §12's visual-identity gate remains partially closed**: the four approved colors are
  recorded; typography, iconography and imagery direction remain open.
- **No older proposed ADR was ratified** by this work, and Ticket 0.1 was not reopened.

---

## 9. Stop

Panel scope ends here. The machine build is a separate delivery and does not begin automatically
(ADR-0019 D20). Anything in P8 §2 needs a named decision before implementation, not an
improvisation.
