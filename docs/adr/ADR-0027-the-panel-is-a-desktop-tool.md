# ADR-0027 — The panel is a desktop tool

**Status:** accepted (owner, 2026-09-16)
**Amends:** 06 §15's "run this once on desktop and once on mobile"; 06 §16 and 02 §5's mobile
clauses; 04 §5's "execution status and approvals remain usable on mobile"; **AC-P7.6** and
**AC-P9.13**, both of which required a proven mobile walk.
**Does not amend:** anything about RTL, Persian, keyboard operation, focus, contrast or reduced
motion. Those were never mobile requirements and every one of them still holds.

---

## Context

Mobile has been a requirement since 02 §5, and the panel has carried it: three e2e viewport
matrices included 390×844, the brief's §15 QA scenario ran twice, three visual baselines were
committed at phone width, and six panel components branch on `useIsMobile`.

What that bought was never used. The owner works this panel from a desktop, and the surfaces it
is made of are dense by design — a board of concept cards, a calendar canvas with an unscheduled
tray beside it, a React Flow graph, a review sheet meant to sit at 560–720px next to the thing it
reviews. At 390px each of those collapses into a single column, the sidebar becomes a sheet that
covers the page, and the review sheet becomes a full-screen drawer with nothing to compare
against. It is not that the panel was broken there; it is that a person cannot do this work
there, so proving they could was proving the wrong thing.

It also cost. The QA scenario is one long continuous journey and it ran twice, making it the
longest test in the suite by a wide margin — and its second pass was the one that intermittently
lost the race for a worker, which I misread once as a defect before three serial and two full
parallel runs showed it was contention.

The owner ruled: **we don't need mobile.**

---

## Decision

### D1 — A phone is not a supported surface, and no test claims otherwise

390×844 is removed from all three Seam E viewport matrices, the three phone-width visual
baselines are deleted, and the §15 QA scenario runs once, at desktop.

Removed rather than skipped. A skipped test still asserts that the requirement exists — it sits
in the report as a thing that *should* pass — and the point of this decision is that it no longer
should.

### D2 — 1024 is the baseline floor and 768 is the audit floor

`shell-and-gallery.spec.ts` commits baselines at 1440 and 1024. `full-audit.spec.ts` sweeps
1440, 1024 and 768 for sideways scroll, focus and axe.

768 stays because it is a **narrow desktop window** rather than a tablet: half a screen, a split
view, a laptop someone has dragged in. It is also exactly where `useIsMobile` flips, so every
width still under test is one where the sidebar is still a sidebar.

### D3 — The responsive code stays

`useIsMobile`, the sidebar's sheet, and the six components that branch on width are not ripped
out. Three reasons, in order of weight:

1. They are load-bearing at 768, which is still supported. The branch that turns a side sheet
   into a drawer is what keeps the narrow window usable.
2. `sidebar.tsx` and `use-mobile.ts` are upstream shadcn as owned code. Deleting a branch from
   them is a divergence that every future update has to be reconciled against, bought for
   nothing.
3. Deleting working code to honour a scope decision is churn. The decision is about what the
   panel *promises* and what the suite *proves*, not about what the CSS happens to do at a width
   nobody uses.

What follows from this: behaviour below 768 is **unproven, not forbidden**. It may degrade. No
test will tell us, and no report should claim it works.

### D4 — What this does not touch

Accessibility is not a mobile concern and is unchanged: axe at WCAG 2.2 AA in both themes,
keyboard-only navigation with visible focus, focus return on sheet close, WCAG contrast on every
token pair (`tests/repo/theme-contrast.test.ts`), RTL and bidi isolation, reduced motion. A
person operating this panel by keyboard is a person the panel is for; a person operating it on a
phone is not.

---

## Consequences

- **AC-P7.6 and AC-P9.13 can no longer be satisfied as written.** They are superseded here rather
  than quietly failing. The desktop half of each still holds and still runs.
- The suite loses its longest duplicate pass. The §15 journey runs once.
- A reader of 02 §5, 04 §5, 06 §15 and 06 §16 will find mobile language that is no longer true.
  Those are historical briefs and are not being rewritten; this ADR is the authority over them,
  per the ADR-0011 authority order.
- If a phone ever becomes a surface, this is one decision to reverse and three viewport arrays to
  re-add — not a rebuild.
