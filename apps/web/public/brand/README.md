# The DROP wordmark goes here

Drop the **approved horizontal wordmark** in as:

    drop-wordmark.svg

and it appears in the studio sidebar and the shell header automatically. Nothing
else to wire — `BrandMark` looks for exactly this filename, and falls back to
the text wordmark when it is absent.

## Why it is not already here

Brand DNA v3.0 §538: *"The approved horizontal `DROP` wordmark is the primary
identifier. The `DOT` is the flexible secondary device."* Its construction lives
in `DROP_VISUAL_IDENTITY_APPLICATION_GUIDE` (§569) — a document this repository
does not have.

What it does have is `docs/source-material/DROP_LOGO_CONCEPT_FINAL_STATION.pdf`,
and everything in there is labelled CONCEPT 01 and CONCEPT 02 — two competing
explorations, neither marked approved. Doc 03 §3.11 is explicit that the concept
PDF *"does not authorize arbitrary replacement of the wordmark with exploratory
marks"*, so no mark was chosen from it.

## What the file should be

- **SVG**, so it stays sharp at 20px in a header and survives any zoom.
- `currentColor` for the mark wherever possible, or a single flat fill. The panel
  renders it on Charcoal AND on Paper (ADR-0025), so a mark baked to one colour
  will be invisible in the other theme. If it must be two files, add
  `drop-wordmark-dark.svg` and say so — the component can take a second source.
- Trimmed to the mark. Padding inside the file fights the layout's own spacing.
- No embedded raster. A JPEG of a slide is not a logo.
