# ADR-0023 — The overview is a board, and attention is a property of a card

**Status:** accepted (owner, 2026-09-12)
**Amends:** ADR-0020 D1's adoption of `06_SIMPLIFICATION_BRIEF.md` §7.1, in one respect.
**Does not amend:** ADR-0020 D2 (six destinations, project as a URL filter), D5 (the interface
speaks the user's units), D11 (an affordance must act), or ADR-0022 (the palette).

---

## Context

The overview shipped exactly what brief §7.1 asked for: a CTA, a «نیازمند اقدام شما» section, and
open projects as «کارت‌های ساده». And it read as repetition, because it was.

Both sections are derived from the same `readinessFor(world, project)` call. «نیازمند اقدام شما»
rendered a project's blocker as a row; «پروژه‌های باز» rendered the **same project** with the
**same sentence** as a card. On the seeded world that is five attention rows above seven project
cards, four of which restate a row directly above them.

The brief anticipated half of this:

> اگر یک مانع واقعی وجود دارد، آن را با زبان انسانی در «نیازمند اقدام شما» نمایش بده.

If the blocker belongs in the attention section, the card repeating it is a defect — that much was
always in scope. What the brief did not provide is where the work actually *stands*: neither
section answers "how far has this idea got", and the panel's whole subject is a five-stage journey.

The owner asked for the overview to show each idea's process as a board, with the detail behind a
panel. Doing that restores something §7.1 explicitly removed, so it is recorded here rather than
quietly shipped.

---

## Decision

### D1 — A project appears once, in the stage it has reached

Five columns, the five recorded `PRODUCT_STAGES`, named in the user's words: «ورودی»،
«کانسپت‌ها»، «تحقیق و محتوا»، «خروجی»، «تقویم». Every stage is drawn, including empty ones — an
empty «تقویم» says no work has reached the end yet, and a board whose columns come and go is one
whose shape a person cannot learn.

The stage is derived from FACTS, never from a stored status. The panel has no `stage` column and
inventing one would be a state the V2 pack never defines: the furthest artefact that exists is the
stage the work has reached. A calendar entry counts only when it is **dated** — an output sitting
in the unscheduled tray has not reached the calendar, and saying otherwise would be the panel
lying about its own journey.

### D2 — Needing a person is a property of a card, not a second list

«نیازمند اقدام شما» stops being a parallel list of the same projects and becomes a mark on the
card, in Acid (ADR-0022 D3), with a count. The card then says exactly one sentence: the blocker if
there is one, where the work stands if there is not. Never both, which is what the duplication was.

The mark is a small filled pill rather than a full-width bar. Acid must be filled — as text it is
1.08:1 on Paper and unusable in the light theme — but four filled bars across seven cards floods
the board with the one colour that exists to stand out.

### D3 — The detail lives in a panel, reached by pressing the card

Which blocker, in which words, with which action — plus the ways into that project's concepts,
content and flow. This is what lets the card be small: the information the old cards competed over
has somewhere better to be.

### D4 — What §7.1 removed, and what this restores

The brief's «حذف شود» list includes **«نوار پنج مرحله‌ای داخل هر کارت پروژه»** — a five-stage
strip repeated *inside every project card*, five stages redrawn seven times on one screen. That
stays removed, and this is its opposite: **one** board, each project on it once.

Everything else on that list stays gone: the four counter tiles, «۲ از ۴ مورد الزامی تأیید شده»,
the «دو هفته آینده» section, and dependency warnings in technical language.

---

## Consequences

- Brief §7.1's «ساختار» list no longer describes the built overview. The brief is the owner's
  document and is not edited here; this ADR is the amendment, in the pattern ADR-0020 D1 set up.
- The stage derivation is a READ MODEL over a snapshot, in `apps/web/lib/demo/read-models.ts`. It
  deliberately does not reuse `PRODUCT_STAGES` from `@drop/panel-domain`: that enum belongs to the
  machine contract, and collapsing the two would make a UI grouping look like part of it.
- A machine snapshot carries no package and no calendar entry until OD-2 is ruled on (ADR-0021),
  so in REAL mode every project lands in «تحقیق و محتوا» at the furthest. That is honest — the
  panel cannot show a stage the data does not reach — and it is another thing OD-2 is holding up.
- The e2e still drives `project-card`, its per-project count under `?project=`, and
  `start-concept`. Those were never about the layout, and they still pass.
