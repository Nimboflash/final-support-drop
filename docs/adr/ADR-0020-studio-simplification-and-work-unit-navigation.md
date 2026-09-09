# ADR-0020 — Studio Simplification: navigation by work unit, and the Engine surface

**Status:** Accepted (owner-delivered brief, 2026-09-09)
**Date:** 2026-09-09
**Scope:** the Studio panel's navigation, page structure, product language and the workflow surface

## Context

The owner delivered `DROP_STUDIO_SIMPLIFICATION_BRIEF.md`, imported to
`docs/frontend-v2/06_SIMPLIFICATION_BRIEF.md`. It rules that the panel delivered under ADR-0019
"explains the state of the system rather than guiding the user along the path of making
content" (§3), and restructures it around the units of work rather than around process.

The governing sentence is §18's closing instruction: **the project is only context; the real
experience is building a concept, turning it into content, gathering content into an output, and
scheduling that output.**

This brief postdates ADR-0019 and supersedes parts of it. Those parts are named below rather
than left to be discovered.

## Decision

### D1 — Precedence

The simplification brief joins the V2 pack in the authority order at the same seat — below Brand
DNA v3.0, above doc 18, **for scope only** — and takes precedence over the earlier V2 documents
where they conflict, because it is later and explicitly corrective. ADRs continue to govern
domain vocabulary, workflow states and approval semantics, reached through projection adapters.

### D2 — Navigation is by work unit, not by container

ADR-0019 D13's six destinations are superseded. The primary navigation becomes:

1. نمای کلی — `/studio`
2. کانسپت‌ها — `/studio/concepts`
3. محتوا — `/studio/content`
4. خروجی‌ها — `/studio/outputs`
5. تقویم — `/studio/calendar`
6. Engine — `/studio/engine`

**Settings leaves the primary navigation** (ADR-0019 D13 put it there) and moves to a secondary
menu. **Project ceases to be a destination**: it is context, selected by a `ProjectSelector` in
the page header, and the seven-tab project detail page is removed.

Every legacy route redirects rather than 404s, for the reason ADR-0019 D13 already recorded: the
`[...rest]` catch-all turns a deleted folder into a silent HTTP 200 dead end.

### D3 — The five-stage strip is withdrawn from the content surfaces

ADR-0019 D12 introduced `StageStrip` as a display grouping on the project header and card. The
brief removes it from the overview and the project card (§7.1) as repeated process furniture.

The information it carried does not vanish — it moves to **Engine**, where a workflow view is
the point rather than an aside. `PRODUCT_STAGES` remains a valid domain vocabulary; only its
repetition across content surfaces is withdrawn.

The `StageStrip` component itself is **retired**. Engine expresses the same information as a
graph with an equivalent stage list, which is strictly richer, so re-adding a five-segment strip
beside it would reintroduce exactly the furniture this decision removes. It is not part of the
09 §7 owned set that `owned-set.test.tsx` protects, so nothing depended on its existence. Its
read model (`stageSegments`) and the four `overviewCounters` D7 removed go with it rather than
surviving as code only their own tests call.

One consequence is recorded honestly: the retired strip labelled the fourth segment «بسته», and
`packages/ui` was outside the scan range of `interface-language.test.ts`. Persian shipped from
`packages/ui` reaches a person's eyes exactly like Persian in `components/panel`, so the guard's
range widens to `packages/ui/src/components/drop` in the same commit — excluding `labels-fa.ts`,
`vocabulary.ts` and `status.tsx`, which are the RECORDED domain vocabulary of doc 09 §9 that D5
explicitly does not rename. `WAITING_FOR_DEPENDENCY` genuinely means "waiting for a dependency";
editing that translation to satisfy a presentation rule would corrupt the mapping
`vocabulary-parity` protects. The rule the recorded vocabulary obeys instead is that **no panel
surface renders it** — asserted in the same guard, so the exclusion is not a hole.

### D4 — Engine is a separate operational surface

A new destination renders the real workflow of a selected project or run: the path from input to
scheduled output, with node status, the active path, what is waiting on the user, and where a
failure is. It is **read-first** in this version: no destructive operations, no forced skip, no
manual state edits. Retry appears only for a failed node and only if the system already has it.

Engine exists so that execution detail has ONE home. Its creation is what makes D3 safe: the
concept, content and output pages can shed process furniture because it is not being deleted,
only relocated.

Engine's graph is built from real application state. A hard-coded graph is not acceptable; mock
data is permitted only in development and test, as everywhere else in panel scope.

### D5 — Product language: the interface speaks the user's units

The interface uses exactly four nouns — **کانسپت، محتوا، خروجی، تقویم** — consistently, with no
synonyms for one concept. The word **«بسته» / Package leaves the UI entirely**; the assembled
set of a concept's approved content is «خروجی».

The following must not appear in the user-facing interface (§2):

- internal identifiers (`p1`, `c1-v1`, `o2`)
- ticket names (`P4`, `P6`)
- provenance notices such as "read from the gateway" or "machine execution is simulated"
- technical vocabulary: dependency, target version, package build, workflow state
- bare internal counters such as «۲ از ۴ مورد الزامی» without human phrasing

This **supersedes V2 02 §8**, which explicitly required the «۳ از ۴ مورد الزامی تأیید شده»
phrasing. The rule underneath it survives unchanged: readiness is still never an invented global
percentage, and `Progress` is still absent from the tree. What changes is that the count is
spoken in human terms — «۲ محتوا به تأیید شما نیاز دارد» — or omitted where it does not help a
decision.

**What is hidden is not what is dropped.** 06 §2.2 and ADR-0013 require a decision to bind to an
exact immutable version, and that binding is unchanged: `ApprovalCommand` still carries
`subjectVersionId`. Only its *display* goes. The identifier remains available in development
diagnostics.

### D6 — Honesty survives the notice removal

§2 bans "machine execution is simulated" style messages. 18 §12 forbids any UI state that
falsely claims a real machine operation occurred, and V2 04 §1 requires demo evidence to be
labelled fictional. These are reconciled, not traded:

- the repeated per-surface simulation notices are **removed**;
- **one** persistent, unobtrusive «حالت نمایشی» marker remains in the shell;
- no string anywhere asserts that real research, real AI output or a real publication happened.

A quieter interface may not become a dishonest one. The concept assistant is scripted and
contains no AI (ADR-0017 D5 stands); the global marker is what keeps that truthful without
narrating it on every card.

### D7 — Simplified presentation states

The brief's state model (§12) is adopted as **presentation vocabulary**, mapped from the
recorded internal states exactly as ADR-0019 D5 established for the card review axis:

- Concept: `generating → new → selected | set_aside`
- Content: `draft → needs_input | ready_for_review → approved`
- Output: `assembling → ready_for_approval → approved → scheduled`

`APPROVAL_DECISIONS`, `APPROVAL_REQUEST_STATES` and the ADR-0012 stage and run enums are
untouched. The brief says so itself: internal state may stay complex provided the UI maps it to
a small human set. One central mapping supplies label, description and CTA, so no surface
invents its own wording.

`REVISION_REQUESTED` and `REJECTED` cease to be foreground card states: improvement happens
through conversation, which produces a revision. The underlying decisions are unchanged and are
still recorded through the single approval write path.

### D8 — Concept improvement is conversational

Concept detail gains a document view and an assistant panel. A request in the panel produces a
new revision through `RevisionGateway.requestRevision` — never `retryStage`, per ADR-0019 D4 —
and version management stops being the dominant experience: history is reachable from a small
menu rather than a primary tab.

The assistant is scripted demo content. It performs no generation, calls no provider, and is
covered by the D6 marker.

### D9 — The calendar must be a calendar

§7.6 rules that the current view is "merely a dated list wearing the appearance of a calendar".
The surface must provide a real month grid with adjacent-month days, today, day selection,
month and week navigation, a `today` control, events inside their day cell, week and agenda
views over the same event data, event detail on click, date change with an accessible
alternative to drag, and persistence across refresh — in correct Persian locale, RTL and the
project timezone.

Existing dependencies are reused rather than adding a library: `react-day-picker`,
`date-fns-jalali` and `@date-fns/tz` are already present and pinned. ADR-0019 D8's storage rule
is unchanged — all-day values are ISO calendar dates, timed values are UTC instants plus a
timezone, and a formatted Persian date is never canonical.

### D10 — What is preserved

Capabilities and data are not removed to make the interface look simpler (§2.1). The backend
contracts, gateway seams and mock scenarios are unchanged; complexity is hidden or consolidated
in the interface layer. All 24 scenarios and their fixtures stay, because they are how the
simplified surfaces are proven against real states. RTL, Persian, mobile behaviour and
accessibility are preserved. Nothing outside `/studio` changes.

## Reported conflicts

| Existing instruction | Simplification ruling |
|---|---|
| ADR-0019 D13 — six destinations including Settings | Superseded: six work-unit destinations; Settings moves to a secondary menu (D2) |
| ADR-0019 D13 — seven always-visible project tabs | Superseded: the project detail page is removed; project is context (D2) |
| ADR-0019 D12 — the five-segment stage strip on project surfaces | Withdrawn from content surfaces; relocated to Engine (D3, D4) |
| V2 02 §8 — readiness reads «۳ از ۴ مورد الزامی تأیید شده» | Superseded by human phrasing; the no-percentage rule survives (D5) |
| V2 02 §6 — the review sheet names its exact target version | The binding is unchanged; the identifier is no longer displayed (D5) |
| V2 02 §2 — Reviews as a cross-project queue | Removed; content review happens on the content surface (D2) |
| V2 01 §6 — "package" as a product noun | The UI noun is «خروجی»; package survives only in domain code (D5) |
| ADR-0019 D18 — the graph as a project tab | The graph becomes the standalone Engine destination (D4) |

## Consequences

- The e2e navigation and visual baselines regenerate again; the full-audit spec's surface list
  changes wholesale.
- `packages/panel-domain` gains no new entity. This is a presentation restructure: the gateways,
  the scenarios and the conformance suites are untouched, which is the test that D10 held.
- A language guard is added to the repo checks, asserting the banned strings of D5 do not appear
  in the surface tree — the rule is otherwise unenforceable and would rot on the first new page.
- Ticket P9 records this work; the P-series handoff in `docs/handoff/` is updated at its end.
