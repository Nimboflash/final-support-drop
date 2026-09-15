import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Seam F — every colour pairing the panel actually renders meets WCAG 2.2 AA.
 *
 * The axe sweep in `tests/e2e/rtl/shell-and-gallery.spec.ts` measures what is ON
 * SCREEN, which is exactly why it could not catch this class of defect: an error
 * message is only painted when something has failed, so `--destructive` was
 * never in front of axe. It was measured here for the first time at 3.59:1
 * against a card in the dark theme — a straight AA failure, sitting on the one
 * kind of text a person cannot afford to miss.
 *
 * So this guard reads the tokens rather than the screen. It resolves
 * `theme.css` for both themes, composites any alpha over the surface underneath,
 * and checks each pairing against the target for the ROLE it is used in — 4.5:1
 * for body text, 3:1 for a border or other non-text boundary (WCAG 1.4.3 and
 * 1.4.11). The roles below are not invented: each one names a real class in a
 * real file, so a pairing stops being checked only when it stops being rendered.
 */
const THEME = join(__dirname, "..", "..", "packages", "ui", "src", "theme.css");

type Rgba = readonly [number, number, number, number];

/** Pulls one declaration block out of the stylesheet by selector. */
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `theme.css has no "${selector}" block`).toBeGreaterThan(-1);
  const end = css.indexOf("\n}", start);
  expect(end, `theme.css has an unterminated "${selector}" block`).toBeGreaterThan(start);
  return css.slice(start, end);
}

/** Every `--token: value;` in a block, comments stripped. */
function declarations(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    // Later wins, which is what the cascade does — and is why a token declared
    // twice in one block is a silent dead value rather than an error.
    out.set(m[1]!, m[2]!.trim());
  }
  return out;
}

function parseColor(value: string): Rgba {
  const hex6 = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex6 !== null) {
    const h = hex6[1]!;
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgba !== null) {
    const parts = rgba[1]!.split(",").map((p) => Number.parseFloat(p.trim()));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
  }
  throw new Error(`cannot parse colour ${JSON.stringify(value)}`);
}

/** Follows `var(--x)` chains until a literal falls out. */
function resolve(tokens: Map<string, string>, name: string, seen: readonly string[] = []): Rgba {
  expect(seen, `${name} is a circular var() chain`).not.toContain(name);
  const raw = tokens.get(name);
  expect(raw, `theme.css never declares ${name}`).toBeDefined();
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(raw!.trim());
  if (ref !== null) return resolve(tokens, ref[1]!, [...seen, name]);
  return parseColor(raw!.trim());
}

/** Paints `fg` (which may be translucent) onto an opaque `bg`. */
function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg[3];
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
    1,
  ];
}

function luminance(c: Rgba): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

function contrast(fg: Rgba, bg: Rgba): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * WCAG's two thresholds, named for why they differ rather than by number.
 * 1.4.3 governs text a person reads; 1.4.11 governs a boundary they only have
 * to SEE.
 */
const READS_AS_TEXT = 4.5;
const SEEN_AS_A_BOUNDARY = 3;

interface Pairing {
  /** What renders this pairing — a real class in a real file. */
  readonly where: string;
  readonly fg: string;
  /** The surface it sits on. */
  readonly on: string;
  readonly target: number;
}

const PAIRINGS: readonly Pairing[] = [
  // Body text, on both the page and a raised card.
  { where: "page text — body on --background", fg: "--foreground", on: "--background", target: READS_AS_TEXT },
  { where: "card text — <Card> body", fg: "--card-foreground", on: "--card", target: READS_AS_TEXT },
  { where: "secondary text — text-muted-foreground on the page", fg: "--muted-foreground", on: "--background", target: READS_AS_TEXT },
  { where: "secondary text — text-muted-foreground on a card", fg: "--muted-foreground", on: "--card", target: READS_AS_TEXT },

  // Error text. Six surfaces render this inside role="alert".
  { where: "error text — text-destructive on a card", fg: "--destructive", on: "--card", target: READS_AS_TEXT },
  { where: "error text — text-destructive on the page", fg: "--destructive", on: "--background", target: READS_AS_TEXT },
  // packages/ui/src/components/drop/status.tsx renders text-warning directly.
  { where: "warning text — text-warning on a card", fg: "--warning", on: "--card", target: READS_AS_TEXT },

  // Filled controls, where the label sits ON the colour.
  { where: "primary button label", fg: "--primary-foreground", on: "--primary", target: READS_AS_TEXT },
  { where: "secondary control label", fg: "--secondary-foreground", on: "--secondary", target: READS_AS_TEXT },
  { where: "destructive button label", fg: "--destructive-foreground", on: "--destructive", target: READS_AS_TEXT },
  { where: "selected/active nav label", fg: "--selected-foreground", on: "--selected", target: READS_AS_TEXT },
  // ADR-0022 D3 — the Acid pill is the one thing meant to carry across a room.
  { where: "«منتظر شما» pill label", fg: "--attention-foreground", on: "--attention", target: READS_AS_TEXT },
  { where: "hover tint label — bg-accent", fg: "--accent-foreground", on: "--accent", target: READS_AS_TEXT },

  // Boundaries: seen, never read.
  { where: "control boundary — --input on the page", fg: "--input", on: "--background", target: SEEN_AS_A_BOUNDARY },
  // Added because the light theme's outline Button had no measured boundary at
  // all: it drew a bare `border`, which resolves to --border (1.87:1 on the
  // page), while every other control used --input. Measuring the token on both
  // surfaces is what makes "use the derived control boundary" checkable.
  { where: "control boundary — --input on a card", fg: "--input", on: "--card", target: SEEN_AS_A_BOUNDARY },
  { where: "focus ring — --ring on the page", fg: "--ring", on: "--background", target: SEEN_AS_A_BOUNDARY },
  { where: "focus ring — --ring on a card", fg: "--ring", on: "--card", target: SEEN_AS_A_BOUNDARY },
  { where: "state border — border-warning on a card", fg: "--warning", on: "--card", target: SEEN_AS_A_BOUNDARY },
  { where: "state border — border-success on a card", fg: "--success", on: "--card", target: SEEN_AS_A_BOUNDARY },
  { where: "state border — border-destructive on a card", fg: "--destructive", on: "--card", target: SEEN_AS_A_BOUNDARY },
];

/**
 * A translucent BORDER is the case this guard was written without and which
 * carried a live defect: `border-success/60` composited to 2.63:1 on a light
 * card, under the 3:1 a boundary must reach, on the concept, content and output
 * cards all at once. A fill's alpha is obvious; a border's is easy to forget,
 * because the class looks like a colour and behaves like a blend.
 *
 * Each row is checked against BOTH sides — the card it sits on and the page
 * behind it — because a 1px line has two neighbours and only one of them is the
 * surface it was tuned against.
 */
const STATE_BORDER_TOKENS = ["--selected", "--success", "--warning", "--destructive"] as const;

/**
 * A tint is `bg-<token>/NN` with `text-foreground` on top: the alpha composites
 * over whatever is underneath, so the ratio that matters is the FOREGROUND
 * against that composite, never against the token itself.
 */
const TINTS: readonly { readonly where: string; readonly token: string; readonly alpha: number; readonly under: string }[] = [
  { where: "bg-warning/10 — the blocked-output note", token: "--warning", alpha: 0.1, under: "--card" },
  { where: "bg-warning/15 — the needs-input row", token: "--warning", alpha: 0.15, under: "--card" },
  { where: "bg-destructive/10 — the failed-content note", token: "--destructive", alpha: 0.1, under: "--card" },
  { where: "bg-destructive/15 — the failed-content row", token: "--destructive", alpha: 0.15, under: "--card" },
  { where: "bg-success/10 — the approved note", token: "--success", alpha: 0.1, under: "--card" },
];

const css = readFileSync(THEME, "utf8");
const light = declarations(block(css, ":root"));
// The dark block overrides the light one; anything it does not restate is
// inherited, exactly as the cascade delivers it.
const dark = new Map([...light, ...declarations(block(css, ".dark"))]);
const THEMES = [
  { name: "light", tokens: light },
  { name: "dark", tokens: dark },
] as const;

describe("theme contrast (WCAG 2.2 AA, 09 §3)", () => {
  for (const theme of THEMES) {
    describe(theme.name, () => {
      for (const p of PAIRINGS) {
        it(`${p.where} reaches ${String(p.target)}:1`, () => {
          const bg = resolve(theme.tokens, p.on);
          const fgRaw = resolve(theme.tokens, p.fg);
          const ratio = contrast(fgRaw[3] < 1 ? over(fgRaw, bg) : fgRaw, bg);
          expect(
            Number(ratio.toFixed(2)),
            `${p.fg} on ${p.on} in ${theme.name} is ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(p.target);
        });
      }

      for (const token of STATE_BORDER_TOKENS) {
        for (const surface of ["--card", "--background"] as const) {
          it(`border${token.replace("--", "-")} is visible on ${surface}`, () => {
            const under = resolve(theme.tokens, surface);
            const ratio = contrast(resolve(theme.tokens, token), under);
            expect(
              Number(ratio.toFixed(2)),
              `${token} on ${surface} in ${theme.name} is ${ratio.toFixed(2)}:1`,
            ).toBeGreaterThanOrEqual(SEEN_AS_A_BOUNDARY);
          });
        }
      }

      for (const t of TINTS) {
        it(`${t.where} keeps its text readable`, () => {
          const under = resolve(theme.tokens, t.under);
          const tint = resolve(theme.tokens, t.token);
          const composite = over([tint[0], tint[1], tint[2], t.alpha], under);
          const ratio = contrast(resolve(theme.tokens, "--foreground"), composite);
          expect(
            Number(ratio.toFixed(2)),
            `--foreground on ${t.token}/${String(t.alpha * 100)} over ${t.under} in ${theme.name} is ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(READS_AS_TEXT);
        });
      }
    });
  }

  /**
   * The rule, rather than the instances — because the instances are what kept
   * coming back. Five state borders were written with an alpha (`/40`, `/50`,
   * `/60`) and every one of them landed under 3:1 on both surfaces in both
   * themes: a boundary diluted until it is not a boundary. The arithmetic is
   * not close either. Even the strongest, `--selected/60`, reached 2.90:1 on the
   * lightest ground it ever sits on, and none of these tokens has the headroom
   * to survive any dilution at all — so the honest rule is that a state border
   * has no alpha, and a state that wants to be quieter says so with a lighter
   * token, not a thinner one.
   *
   * A FILL may still be diluted: `bg-warning/10` is checked above, where what
   * matters is the text on top rather than the tint itself.
   */
  it("no state border or focus ring is diluted with an alpha", () => {
    const roots = [
      join(__dirname, "..", "..", "apps", "web"),
      join(__dirname, "..", "..", "packages", "ui", "src"),
      join(__dirname, "..", "..", "packages", "workflow-ui", "src"),
    ];
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        for (const m of readFileSync(full, "utf8").matchAll(
          /*
            Two shapes, and the second was the one nobody could see.

            A state BORDER thinned with an alpha cannot reach 3:1 — the original
            rule. A FOCUS RING thinned the same way is worse, because on the
            borderless button variants it is the only indicator there is, and
            every control in the kit carried `ring-ring/50`: 2.16:1 on a dark
            card, against the 3:1 this same file asserts `--ring` reaches at full
            strength. A guard that measured the token while ignoring how the
            token was rendered was measuring the wrong thing.

            `ring-destructive/20` is deliberately NOT matched. That is a halo
            behind a full-strength `aria-invalid:border-destructive` — the border
            is the indicator and the wash is decoration. A rule that could not
            tell those apart would force a change that makes invalid fields
            louder without making anything more legible.
          */
          /\b(?:border-(?:[se]-)?(?:selected|success|warning|destructive|attention)|(?:ring|outline)-ring)\/\d+/g,
        )) {
          offenders.push(`${full}: ${m[0]}`);
        }
      }
    };
    for (const root of roots) walk(root);
    expect(offenders, "a diluted state border cannot reach 3:1 — drop the alpha").toEqual([]);
  });

  it("no token is declared twice in the same block", () => {
    for (const selector of [":root", ".dark"]) {
      const text = block(css, selector).replace(/\/\*[\s\S]*?\*\//g, "");
      const names = [...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!);
      const seen = new Set<string>();
      const twice = names.filter((n) => (seen.has(n) ? true : (seen.add(n), false)));
      expect(twice, `${selector} declares these more than once, so the first value is dead`).toEqual([]);
    }
  });

  it("every semantic token the dark theme inherits is declared in :root", () => {
    // A token declared ONLY in .dark renders as nothing in light — invisible
    // until someone switches themes and looks at the right surface.
    const darkOnly = [...declarations(block(css, ".dark")).keys()].filter((k) => !light.has(k));
    expect(darkOnly, "declared in .dark but never in :root").toEqual([]);
  });
});
