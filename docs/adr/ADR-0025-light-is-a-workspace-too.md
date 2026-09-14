# ADR-0025 — Light is a workspace too, and the theme is a visible choice

**Status:** accepted (owner, 2026-09-15)
**Amends:** V2 02 §1's "light is for preview sheets", as adopted by ADR-0019 D14.
**Does not amend:** ADR-0022 (the palette and the material) or ADR-0010 D11 (colour never alone).

---

## Context

`theme-provider.tsx` carried this, and had since P1:

> No system detection — theme is an explicit choice (the visible toggle arrives with P4's
> settings surface).

P4 came and went. The toggle did not. So the theme was an explicit choice that could only be
expressed by editing `localStorage` by hand — which means in practice it was not a choice at all,
and the light theme has been shipping untested by anyone except the e2e axe sweep.

The owner asked for a panel that can sit lighter.

---

## Decision

### D1 — Dark stays the default; light stops being a second-class citizen

Charcoal is what the brand is built on and it remains what the panel opens in. What changes is
that light is a workspace rather than "for preview sheets": it is expected to be lived in, and it
is judged as a working surface.

### D2 — The theme is chosen in Settings, and `system` is honoured

Three choices — «مثل سیستم»، «روشن»، «تیره» — as a segmented control where the current one is
FILLED and the alternatives are quiet. `enableSystem` is on, so a person who has expressed a
preference to their operating system is not overridden by ours.

The control renders only after mount. `next-themes` cannot know the stored choice on the server,
so anything drawn before hydration is a guess, and a guess here shows the wrong option selected
for a frame.

### D3 — It is also the first filled button in the panel

Not decoration. An audit found **thirty-five `variant="outline"` buttons and no primary anywhere** —
every action on every surface rendered at the same weight, so nothing read as the thing to press.
The reference set is unanimous on this: one filled primary per surface, paired with a quiet
secondary. This control is the first place that rule is applied; the rest of the panel follows.

---

## Consequences

- The light theme is now on the hook for the same standard as dark: the axe WCAG 2.2 AA sweep
  already runs over both, and its neutrals and the Acid attention mark were designed against it
  (ADR-0022 D3 — Acid is 1.08:1 on Paper and is therefore always a filled mark, never text).
- Visual baselines are captured in dark and are unaffected: the e2e sets `localStorage("theme")`
  explicitly, which is what it always did.
- The "toggle arrives with P4" comment is deleted rather than re-dated. A promise that outlived
  the ticket it named is worse than no promise.
