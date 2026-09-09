# Ticket P9 — Studio simplification: navigation by work unit, the Engine surface, and the language guard

```yaml
ticket_id: "P9"
title: "apps/web + packages/{ui,workflow-ui,panel-domain,mock-data}: restructure /studio around work units, relocate execution detail to a new Engine destination, make the calendar a calendar, replace the repeated simulation notices with one honest marker, and add the repo guard that keeps the interface speaking the user's language"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "docs/frontend-v2/06_SIMPLIFICATION_BRIEF.md §1 — the mission: the panel is a workspace organised around the things a person works on, not a dashboard organised around a process"
  - "06 §2 — the execution rules, including the closed list of what must never appear in the user's interface: internal identifiers, ticket names, gateway and dependency vocabulary, version labels, per-surface simulation notices"
  - "06 §4 — the new conceptual model: Program, Project, Concept, Content, Output, Calendar Item, with the project demoted from a place to a context"
  - "06 §5 — the information architecture: the destinations, the renames and merges, and the navigation principle that each destination answers exactly one question"
  - "06 §6 — the five-step user flow: start → review and select concepts → produce content → assemble output → schedule"
  - "06 §7.1 — the overview: what it keeps, and the explicit removal list (the four counter tiles, the repeated stage strip, «۲ از ۴ مورد الزامی», the two-week section, the duplicated dependency warnings)"
  - "06 §7.2 / §7.3 — the concepts grid and the concept detail: one document surface with a conversational assistant, not version management"
  - "06 §7.4 — the content page: grouped under its parent concept, and a blocked item states what it needs in one human sentence with the action beside it, rather than disabling every control"
  - "06 §7.5 — outputs: one output model; the «بسته» split disappears"
  - "06 §7.6 — the calendar must behave like a calendar, not a dated list wearing a calendar's appearance"
  - "06 §7.7 — Engine: the one operational surface where execution detail lives, read-first"
  - "06 §10 — the product language: the four nouns, and the rule that the label, the description and the call to action for a state all come from one place"
adr_constraints:
  - "ADR-0020 D1 — precedence: the simplification brief governs the panel's presentation; the recorded ADR vocabularies are untouched beneath it. Nothing here renames a domain enum"
  - "ADR-0020 D2 — navigation is by work unit, not by container. Six destinations; the project is a filter carried in the URL, never a destination. This SUPERSEDES ADR-0019 D13's five destinations plus Settings, and its seven always-visible project tabs"
  - "ADR-0020 D3 — the five-stage strip is withdrawn from the content surfaces. `PRODUCT_STAGES` remains a valid domain vocabulary; only its repetition across surfaces is withdrawn. The `StageStrip` component is retired outright: Engine expresses the same information as a graph, and the component was never a member of the 09 §7 owned set"
  - "ADR-0020 D4 — Engine is a separate operational surface, read-first: no destructive operations, no forced skip, no manual state editing. Its graph is built from real application state; a hard-coded graph is not acceptable. Engine's existence is what makes D3 safe"
  - "ADR-0020 D5 — product language: the interface speaks the user's units. «خروجی» not «بسته»; no gateway, dependency or version vocabulary; no ticket names; no raw identifiers. This SUPERSEDES V2 02 §8's «۳ از ۴ مورد الزامی تأیید شده»; the no-percentage rule survives"
  - "ADR-0020 D6 — honesty survives the notice removal: the repeated per-surface simulation notices go, and ONE global «حالت نمایشی» marker in the shell keeps 18 §12 true. Nothing may imply that real machine work, research or publication happened"
  - "ADR-0020 D7 — simplified presentation states: one projection module owns the label, the description and the call to action for every state a surface renders"
  - "ADR-0020 D8 — concept improvement is conversational; version management is not the experience"
  - "ADR-0020 D9 — the calendar must be a calendar: a month grid with adjacent-month days, week and agenda views, real navigation, today, and a date change that survives a reload"
  - "ADR-0020 D10 — what is preserved: the gateways, the scenarios, the conformance suites, the determinism, the RTL and accessibility baseline, and the single approval write path"
  - "ADR-0020 D11 — an affordance must act: a panel button acts, delegates through an asChild trigger, submits, or is explicitly disabled; and the action needs a real effect. Supplying a missing source lifts the block through the existing RESEARCH_REFRESH route — a provisional panel expectation reported to the machine build, never imposed through the conformance suite"
  - "ADR-0019 D2 — frontend only; demo state in one versioned browser key; no backend, no external network request from any surface"
  - "ADR-0019 D3 — MachineGateway gains no members; PanelGateway keeps its seven read-only members; writes stay on PanelCommandGateway and RevisionGateway. A presentation restructure touches none of them"
  - "ADR-0019 D16 — the demo clock stays 2026-09-06T09:00:00Z; `Date.now` and `Math.random` stay unreachable from fixture, adapter and surface code"
  - "ADR-0019 D18 — the graph is never the only way to act, and the accessible stage list is built from the SAME view model as the canvas"
  - "ADR-0018 D3 / ADR-0019 D20 — the twelve frozen workspaces stay inert; no new workspace package (workspace-integrity.test.ts pins exactly sixteen)"
  - "02 D11 (ADR-0010) — WCAG 2.2 AA on core journeys; colour alone never communicates status; every canvas action has a non-canvas equivalent"
in_scope:
  - "apps/web/app/studio/_shell/studio-nav.ts — the six work-unit destinations, each carrying the one question it answers; the secondary menu; the redirect tables for every retired route and every retired project tab"
  - "apps/web/app/studio/_shell/studio-sidebar.tsx — the six destinations inside a real navigation landmark, with the secondary menu in the footer"
  - "apps/web/app/studio/layout.tsx — the single «حالت نمایشی» marker, and one main landmark rather than two"
  - "The new surfaces under apps/web/components/panel/: concepts-page, concept-detail, new-concept-composer, content-page, outputs-page, calendar-page, engine-page, activity-page, project-selector, and a slimmed overview"
  - "apps/web/lib/demo/presentation.ts — the single presentation projection (D7): one label, description and call to action per state"
  - "apps/web/lib/demo/calendar-grid.ts — the month/week grid model, Saturday week start, Jalali titles"
  - "packages/panel-domain/src/projection/output-type-label.ts — the one Persian name per output type, in the projection layer because BOTH the app surfaces and the Engine graph in packages/workflow-ui render it and workflow-ui cannot import from the app"
  - "packages/workflow-ui — the Engine graph's own interface strings brought under the same language rule as the app surfaces"
  - "Retirement of the surfaces the brief dissolves: concept-grid, content-view, outputs-view, project-list, reviews-queue, start-journey, workflow-graph, calendar-view, review-sheet, review-actions, and the seven project tab routes"
  - "Retirement of StageStrip and the read models that fed only it (`stageSegments`, `overviewCounters`, `blockedCount`)"
  - "tests/repo/interface-language.test.ts (new, Seam F) — the D5/D6 guard over the surface tree, the shared drop components and the Engine graph, excluding the recorded domain vocabulary and asserting instead that no panel surface renders it"
  - "tests/e2e/rtl/full-audit.spec.ts and tests/e2e/rtl/shell-and-gallery.spec.ts retargeted to the work-unit structure, with the visual baselines regenerated"
  - "tests/e2e/rtl/qa-scenario.spec.ts (new, Seam E) — the brief's own §15 QA scenario, all twenty-three steps as one continuous journey, run at desktop AND mobile as §15 instructs, with a no-horizontal-scroll assertion at every surface it visits (§16)"
  - "tests/repo/no-inert-controls.test.ts (new, Seam F) — no button on a panel surface may be an affordance that does nothing"
  - "tests/repo/destination-states.test.ts (new, Seam F) — every destination has a loading boundary, and the segment has one error boundary that offers retry and never renders the raw error"
  - "apps/web/app/studio/*/loading.tsx and apps/web/app/studio/error.tsx — the loading and error states of brief §11 and V2 02 §10"
  - "The overview honouring ?project= like every other destination, per the brief's §8 route table"
  - "The `RESEARCH_REFRESH` revision route lifting a content block in the mock world, so «افزودن منبع» has a real effect (brief §14.8). No gateway member and no route is added; an existing recorded route gains the behaviour its name already means, and it is reported to the machine build as a provisional expectation rather than imposed"
  - "Defect fixes surfaced by the restructure where they change no contract"
out_of_scope:
  - "Any change to MachineGateway, PanelGateway's seven members, PanelCommandGateway, RevisionGateway or the P2 DTOs. This is a presentation restructure; a needed shape change stops the ticket and becomes an ADR question"
  - "Renaming a recorded domain enum, or editing packages/ui/src/components/drop/labels-fa.ts to satisfy a presentation rule. D5 hides the recorded vocabulary from the interface; it does not rename it"
  - "New scenarios, new commands, or changes to the deterministic demo world beyond interface copy in the seeded project titles"
  - "A new workspace package — workspace-integrity.test.ts pins exactly sixteen"
  - "Backend of any kind; machine work of any kind (ADR-0019 D2, D20)"
  - "Weakening or deleting an existing assertion, or regenerating a snapshot, to reach green. Baselines regenerate only because the surfaces they photograph were deliberately rebuilt"
contracts_changed:
  - "None to any gateway or DTO. One additive projection export in packages/panel-domain: OUTPUT_TYPE_LABEL_FA / outputTypeLabelFa, typed Record<OutputType, string> so a new output type without a Persian name is a compile error rather than a raw identifier on screen. MachineGateway remains byte-frozen and untouched"
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None new. The restructure moves where review happens (onto the content surface) without
  changing who may do it or how: the single approval write path through
  MachineGateway.submitApproval is untouched, and its rejecting-stub proof still runs.
  Panel-side role checks remain UX only and are never a security boundary.
failure_states:
  - "A retired route that 404s is a defect, not a cleanup: apps/web/app/studio/[...rest]/page.tsx sits at the same depth, so deleting a folder renders an empty state at HTTP 200 — a dead end that looks like a working page. Every retired path keeps its folder and redirects"
  - "An interface string that names a ticket, a gateway, a dependency, a version or a raw identifier fails tests/repo/interface-language.test.ts. The fix is to say it in the user's words, never to widen the guard's exclusions"
  - "A surface that renders the recorded domain label table directly defeats the guard without tripping it; that is asserted separately"
  - "A check that was not run is reported as not run"
test_seams:
  - "Seam A (component): the new surfaces, each against a real scenario world through the P3 loader"
  - "Seam E (browser): the retargeted full-audit and shell-and-gallery specs, including the calendar's real behaviours, the Engine graph and its accessible equivalent, and the regenerated visual baselines at 1440/1024/390"
  - "Seam F (repo): interface-language, logical-properties, placeholder-purity, workspace-integrity, verbatim-machine-gateway, vocabulary-parity, claude-md, eslint-zone-terminality, determinism, panel-contract-invariants"
acceptance_criteria: "AC-P9.1 through AC-P9.14 — see the checkbox list below"
dependencies: ["P8"]
files_owned:
  - "apps/web/app/studio/** (navigation, shell, routes and redirects)"
  - "apps/web/components/panel/** (the work-unit surfaces)"
  - "apps/web/lib/demo/{presentation.ts,calendar-grid.ts,read-models.ts,commands.ts}"
  - "packages/panel-domain/src/projection/output-type-label.ts (new) and its index export"
  - "packages/workflow-ui/src/{model/product-graph.ts,canvas/node-presentation.ts} (interface strings only)"
  - "packages/ui/src/components/ui/sidebar.tsx (Persian screen-reader copy) and the retirement of components/drop/stage-strip.tsx"
  - "packages/mock-data/src/seed/density.ts (seeded project titles only)"
  - "tests/repo/interface-language.test.ts (new)"
  - "tests/repo/no-inert-controls.test.ts (new)"
  - "tests/repo/destination-states.test.ts (new)"
  - "apps/web/app/studio/**/loading.tsx (new) and apps/web/app/studio/error.tsx (new)"
  - "tests/e2e/rtl/qa-scenario.spec.ts (new)"
  - "packages/machine-gateway/src/mock/mock-world.ts (RESEARCH_REFRESH unblock) and its commands.test.ts cases"
  - "tests/e2e/rtl/{full-audit,shell-and-gallery}.spec.ts and their snapshots"
  - "docs/adr/ADR-0020-*.md, docs/frontend-v2/06_SIMPLIFICATION_BRIEF.md, docs/tickets/README.md, docs/handoff/**"
handoff_required: true
```

## What to build

Not new capability — a different organising idea for the capability that exists. The panel was
built around a process, so its navigation was named after the stages of that process and every
surface repeated where a project sat inside it. The brief's objection is that a person does not
work on a stage. They work on a concept, a piece of content, an output, a date.

Tracer-bullet: a person opens `/studio`, sees only what needs them, follows one project through
concepts → content → outputs → calendar without ever visiting a "project page", and at no point
reads a word that belongs to the machinery underneath.

### The one question per destination

Each destination earns its place by answering exactly one question (brief §5). This is recorded
in the navigation model itself, not only in prose, so a seventh destination cannot be added
without stating what it answers:

| Destination | The question it answers |
|---|---|
| نمای کلی | الان چه چیزی به توجه من نیاز دارد؟ |
| کانسپت‌ها | چه ایده‌هایی داریم و کدام‌ها انتخاب شده‌اند؟ |
| محتوا | چه چیزی نوشته شده و چه چیزی منتظر من است؟ |
| خروجی‌ها | چه چیزی آمادهٔ تحویل است؟ |
| تقویم | چه چیزی کِی منتشر می‌شود؟ |
| Engine | سیستم الان دقیقاً کجای کار است؟ |

Settings and history are not work, and left the primary bar for a secondary menu.

### Why the project stopped being a place

A project page forces a person to choose a container before choosing a task, and then repeats
the same seven tabs inside every container. The brief demotes it to context: the project is a
filter carried in the URL (`?project=p1`), applied by a selector that lives on the work-unit
pages themselves. Every project route and every project tab therefore had somewhere to land, and
all of them redirect.

The redirects are load-bearing rather than tidy. `app/studio/[...rest]/page.tsx` sits at the same
depth as the retired folders, so deleting a folder does not produce a 404 — it produces a bare
empty state at HTTP 200, which reads to a user as a working page with nothing in it. Every
retired path keeps its folder and redirects, and a repo test asserts that folder exists.

### Engine is what made the simplification safe

D3 removes the five-stage strip from the content surfaces, and the honest question is whether
that information was deleted or moved. It moved. Engine renders the real execution graph of a
selected project — node status, the active path, what is waiting on a person, where a failure is
— built from application state, never hard-coded. It is read-first: no destructive operations, no
forced skip, no manual state edits. A node that needs a person links to the page where the work
actually happens, and the work happens there.

The accessible stage list beside the canvas is built from the same view model as the canvas, so
the two cannot drift (ADR-0019 D18).

### The calendar had to become a calendar

The brief's objection to the previous surface was precise: it was "merely a dated list wearing
the appearance of a calendar". A calendar has behaviours, and this one now has them — a month
grid of six weeks including the borrowed days of the adjacent months so the layout never jumps,
today marked, a selected day, week and agenda views over the same events, real navigation with a
return to today, and a date change that survives a reload. The week starts on Saturday, and the
titles are Jalali.

### The language guard, and why it is a repo check

D5 and D6 are rules about strings a person reads. Nothing in a type system or a behaviour test
notices a technical phrase appearing on a new page — they would have been true on the day they
were written and quietly false a month later. `tests/repo/interface-language.test.ts` scans the
surface tree, the shared `drop` components and the Engine graph for the phrases the brief names,
and asserts the shell still carries the one honest demo marker.

It deliberately excludes the recorded domain vocabulary — `labels-fa.ts`, `vocabulary.ts` and
the `status.tsx` badges that render them. `WAITING_FOR_DEPENDENCY` genuinely means "waiting for a
dependency", and editing that translation to satisfy a presentation rule would corrupt the
mapping `vocabulary-parity` protects. The rule the recorded vocabulary obeys instead is that no
panel surface renders it, which the same guard asserts — so the exclusion is not a hole.

### Defects the restructure surfaced

Each is recorded with the guard that now covers it, because a fix without a guard is a fix that
comes back:

| Defect | Guard added |
|---|---|
| Engine rendered raw `EDITORIAL` / `FILM` / `LANDING` and the noun «بسته» — the label map lived in `apps/web`, which `packages/workflow-ui` cannot import, so every graph node fell through its `?? item.type` escape | The map moved to the projection layer, typed `Record<OutputType, string>`; the language guard's range extended to `workflow-ui` |
| The sidebar's `aria-label` sat on a generic element and was discarded — no navigation landmark existed | The destinations sit in a real `<nav>`; the e2e queries the landmark |
| `SidebarInset` renders a `<main>` and the layout nested a second one inside it | An e2e asserts exactly one main landmark |
| Three English strings shipped screen-reader-only in a fa-IR-only product ("Toggle Sidebar", "Sidebar", "Displays the mobile sidebar") — invisible to every visual review | An e2e asserts no untranslated English on any surface; React Flow's attribution is allowlisted, since removing it needs the Pro licence (an open client gate) |
| ISO dates and Latin digits reached project cards, the concept detail and the Engine header | Jalali display and one shared `toPersianDigits`; the surfaces render no ASCII digit |
| «افزودن منبع» sat beside a message saying a source was missing, looked enabled, and had **no handler at all** — the owner's report of the previous panel was "click is not working", and this was that defect, reintroduced | `tests/repo/no-inert-controls.test.ts`: a panel button must act, delegate through an `asChild` trigger, submit, or be explicitly disabled. The e2e now records a source and asserts the block lifts, instead of asserting the button is merely enabled |
| Every `loading.tsx` boundary was deleted with the routes that held them, and no route had an error boundary at all | `tests/repo/destination-states.test.ts` |
| `/studio` read `?project=` with no Suspense boundary, and the overview ignored the filter anyway | The boundary is in place; an e2e asserts the overview narrows and keeps its selector |
| The project card said «ادامه» — the brief's own named example of an ambiguous label | `interface-language.test.ts` rejects a control labelled with a word that says nothing |

## Blocked by

P8. P8 was the hard stop of the P-series and remains so for **machine** work: nothing here starts
a machine, a transport or a backend. ADR-0020 D1 reopens the panel's presentation only, on the
owner's brief, and P9 is that work.

## Acceptance criteria

- [x] **AC-P9.1** — The primary navigation is exactly the six work-unit destinations in order, each
      carrying the one question it answers; Settings and history are reachable only from the
      secondary menu. Asserted in `studio-nav.test.ts` and in the browser.
- [x] **AC-P9.2** — The project is not a destination. `/studio/projects/:id` and all seven retired
      tabs redirect to a work unit; every retired path keeps its folder, and none falls through to
      the catch-all.
- [x] **AC-P9.3** — The overview carries no counter tile, no stage strip, no «N از M مورد الزامی»
      and no two-week section; it answers one question and offers one way to start.
- [x] **AC-P9.4** — Content is grouped under its parent concept, and a blocked item states what it
      needs in one human sentence with the action beside it rather than disabling every control.
- [x] **AC-P9.5** — Outputs use one model; the word «بسته» does not appear on any surface, in the
      Engine graph, or in the seeded demo content.
- [x] **AC-P9.6** — The calendar renders a six-week month grid with adjacent-month days and today,
      switches to week and agenda over the same events, navigates and returns to today, and a date
      change survives a reload. The week starts Saturday and the titles are Jalali.
- [x] **AC-P9.7** — Engine renders the graph and its accessible stage list from ONE view model,
      with equal item counts; it is read-first; a node awaiting a person links to the surface where
      that work happens; and no content surface renders a stage strip or a canvas.
- [x] **AC-P9.8** — Exactly one «حالت نمایشی» marker exists, in the shell. No surface claims
      publication or real research.
- [x] **AC-P9.9** — `tests/repo/interface-language.test.ts` passes and is proven able to fail: no
      surface string names a ticket, a gateway, a dependency, a version or the noun «بسته», and no
      panel surface renders the recorded domain label table.
- [x] **AC-P9.10** — The shell has exactly one main landmark and a navigation landmark; no
      untranslated English reaches a reader, screen-reader text included.
- [x] **AC-P9.11** — Nothing recorded moved: MachineGateway is byte-frozen, PanelGateway keeps its
      seven read-only members, the scenarios and conformance suites are unchanged, the demo clock
      is unchanged, and the single approval write path still carries its rejecting-stub proof.
- [x] **AC-P9.12** — Every affordance acts. No panel button is enabled and inert, proven
      statically by `no-inert-controls.test.ts` and behaviourally by the QA scenario, which
      cannot reach its own step 12 unless step 11 actually changed state.
- [x] **AC-P9.13** — The brief's §15 QA scenario runs end to end at desktop **and** mobile, with
      no horizontal scroll at any surface it visits.
- [x] **AC-P9.14** — All six checks green, with the e2e evidence coming from an actual browser run.

## Handoff

`docs/handoff/P9-studio-simplification.md`, which supersedes the navigation and surface sections
of `docs/handoff/P8-frontend-to-machine-build.md` and leaves its open decisions, provisional
contracts and connection points standing.
