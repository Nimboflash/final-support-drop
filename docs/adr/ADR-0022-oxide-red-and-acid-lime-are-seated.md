# ADR-0022 — Oxide Red and Acid Lime are seated, and Acid means one thing

**Status:** accepted (owner, 2026-09-10)
**Amends:** ADR-0019 D14 (which approved four colours and left the accents PROVISIONAL), and
closes the accent half of doc 03 §3.10.
**Does not amend:** ADR-0010 D10 (exactly one Lens accent) or ADR-0010 D11 (colour never carries
state alone). Both survive intact, and D11 is the reason this ADR is safe.

---

## Context

Doc 03 §3.10 has carried this gap since the beginning:

> The Lite deck shows Oxide Red and Acid Lime but does not make both permanent simultaneous
> accents.
> **Decision:** Centralize all values as tokens and mark the initial values `PROVISIONAL`.

So the panel shipped `--drop-lens-accent: #b23a26` — a guess at Oxide Red, marked PROVISIONAL,
used for focus and selection and nothing else. Every other state reached for the same muted
amber. The result is a workspace that is Charcoal on Charcoal with a thin rust line on it, and
the owner's description of it was accurate: dark, and without soul.

The owner supplied the Brand DNA base-colour page and confirmed the two accents are real.

**The values are the deck's own.** They were read out of `DROP_BRAND_DNA_LITE_FA.pdf`'s
compressed content streams rather than sampled from an image, so they are exact:

| | Value | On Charcoal | On Paper |
|---|---|---|---|
| Oxide Red | `#8F382D` | 2.47:1 | 6.95:1 |
| Acid Lime | `#C8FF32` | 15.88:1 | 1.08:1 |

Those two numbers decide almost everything below. Oxide Red is a **print** value: it passes on
Paper and fails outright on the dark workspace. Acid Lime is its mirror — unusable as text on
Paper, and one of the highest-contrast marks available on Charcoal.

---

## Decision

### D1 — Both accents are seated, as layer-1 primitives

`--drop-oxide` and `--drop-acid` join the four approved colours in `packages/ui/src/theme.css`,
marked APPROVED. They are the deck's values, unmodified.

The deck's content streams also carry `#44344F`, `#716F6B`, `#D8D6D0`, `#F2F0EA` and `#FFFEF9`.
**None of those is adopted.** The owner named two accents, the four base colours are recorded as
"timeless and unchangeable", and V2 02 §1 forbids a warm sepia palette — which is exactly what
those paper tones are. They are noted here so the next reader knows they were seen and refused,
rather than missed.

### D2 — Oxide Red becomes the Lens accent; the dark theme derives from it

`--drop-lens-accent: var(--drop-oxide)`. ADR-0010 D10 said exactly one Lens accent and it still
holds — this replaces a provisional guess with the real value, it does not add a second.

The dark theme cannot use it raw. At 2.47:1 on Charcoal it fails every threshold, so the dark
theme sets a lightened tone of the same hue that reaches 5.43:1 with Charcoal on it and 4.83:1
as a focus ring against a raised card. **That value is marked DERIVED, not APPROVED.** It is the
panel's arithmetic, not the brand's decision, and it must not be quoted back as a brand colour.

### D3 — Acid Lime is `--attention`, and means exactly one thing

A person is the blocker. Nothing else may use it.

It is split out of `--warning`, which it had been sharing. That sharing was the defect: "this is
waiting for YOU" rendered in the same amber as "this is paused" and as every other muted state,
on the one product whose entire thesis is surfacing the first. Three surfaces changed with the
token — the `waiting` status tone, the `AWAITING_REVIEW` node on the Engine canvas, and the
attention rows on the overview, which had been styled identically to project cards.

`--warning` keeps its amber for states that are off but not yours. `--success` stays deliberately
quiet: finished work has no claim on anyone's attention.

Acid is always a **filled mark with Charcoal on it**, never coloured text. That is one treatment
that works in both themes — 15.9:1 either direction — and it is the only way to use it in the
light theme at all.

### D4 — Aluminium is used as MATERIAL, not as a fill

The Brand DNA's colour-usage note asks for Aluminium "as material (foil, metal, metallic ink)
where possible", and the deck draws its swatch as brushed metal rather than as flat grey. Colour
tokens alone cannot honour that, and a first pass that only added accents did not: the workspace
was still Charcoal boxes on a Charcoal ground with two coloured edges on it.

On a screen the material is two things and only two, both of them Aluminium `#b3b6b9` at low
alpha, and both defined beside the palette rather than sprinkled through components:

- `--sheen` — a raking gradient down a raised surface.
- `--edge-highlight` — a one-pixel lit top edge.

They are applied by one class, `.drop-material`, and they are structural rather than decorative:
`--background` `#121212` against `--card` `#1e1e1e` is six points of grey and reads as a single
flat plane. The sheen is what makes a card a card. Pushing the card lighter instead would have
dragged the whole dark workspace toward mid-grey and lost Charcoal as the ground.

`--border` in the dark theme becomes that same Aluminium hairline rather than an untinted grey,
and `.drop-rule` gives the deck's hairline to section headings — the rule under a title is most
of what makes the deck read as considered rather than merely dark.

### D4 — Colour still never carries state alone

ADR-0010 D11 is not amended and this ADR does not lean on it being relaxed. Every mark that
gained a colour already carried an icon and a Persian label, and still does. The colour is what
lets a person find the thing across a room; the label is what tells them what it is. The e2e
axe sweep runs WCAG 2.2 AA over every surface in both themes and is the check that keeps this
honest.

---

## Consequences

- Doc 15 §12's visual-identity gate closes further: base colours and accents are now settled.
  **Typography, iconography and imagery direction remain open.**
- The panel has exactly one loud colour, spent on exactly one meaning. If Acid Lime starts
  appearing on decoration, on branding, or on states that are not waiting for a person, this
  decision has been broken — and the way it will look is that nothing on screen stands out any
  more, because everything does.
- Visual baselines were regenerated. They are the record of what the palette looks like, so a
  future palette change is a visible diff rather than a silent one.
- The remaining PROVISIONAL values — the derived neutrals, `--success`, `--warning`,
  `--destructive` — are unchanged and still await the visual identity guide.
