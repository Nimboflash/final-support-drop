# ADR-0026 — Motion is a system, not a series of choices

**Status:** accepted (owner, 2026-09-16)
**Amends:** nothing recorded. 09 §14 names reduced motion; no document named durations, curves or
press feedback, which is why every surface had chosen its own or none.
**Does not amend:** ADR-0022 (the palette) or ADR-0025 (the theme).

---

## Context

Counted before this existed: five `transition-colors`, three `transition-transform`, one
`transition-shadow`, a handful of ad-hoc durations, and **no press feedback anywhere**. A button
could be pressed and nothing acknowledged it — for a machine call, the only confirmation arrived
tens of seconds later. The colour and spacing of the panel were designed; the twenty
milliseconds after a click were not.

The owner asked for the reference's effects and behaviour. Emil Kowalski's design-engineering
skills are installed under `.claude/skills/` and were the reference for every value below.

---

## Decision

### D1 — Three durations, four curves, in `theme.css`, and nothing else

`--motion-fast` 90ms (a press, a colour), `--motion-base` 160ms (a lift, a border),
`--motion-slow` 240ms (something entering or leaving). `--ease-out`
`cubic-bezier(0.23, 1, 0.32, 1)` for anything the person initiated; `--ease-in-out`
`cubic-bezier(0.77, 0, 0.175, 1)` for something already on screen moving; `--ease-drawer`
`cubic-bezier(0.32, 0.72, 0, 1)` for the one thing that slides in from an edge; `--ease-spring`
only for a state the person caused and should notice. Built-in easings are too weak to read as
intentional; `ease-in` never appears on UI.

### D2 — Every pressable surface answers on press

`Button` scales to 0.97 on `:active`; `.drop-interactive` lifts one pixel under the pointer and
sinks *below* rest on press. One class, so the four card surfaces stop inventing their own.

### D3 — Overlays keep their budgets

Sheets enter at 320ms on the drawer curve and leave at 200ms — the exit faster than the
entrance. Dialogs 200ms, popovers and selects 150ms, tooltips 125ms, all on `--ease-out`,
all scaling from their trigger's origin; modals stay centred.

### D4 — What does NOT animate

Nothing keyboard-initiated. No stagger on lists a person scrolls past every day. No motion on a
read the person did not ask for. Reduced motion collapses every duration to ~1ms in one place
and keeps opacity and colour.

---

## Consequences

- `tests/repo/theme-contrast.test.ts` guards that `:root` stays one block, so the motion layer
  cannot hide tokens from the contrast sweep again.
- A surface that wants motion uses the tokens. A parallel system is a defect.
