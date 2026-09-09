import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Ticket P9, Seam F — the interface speaks the user's language (ADR-0020 D5).
 *
 * The brief's §2 rules are otherwise unenforceable: they describe what must NOT
 * appear in strings a person reads, and nothing in a type system or a test of
 * behaviour can notice a technical phrase creeping back onto a new page. This
 * check is what keeps that rule alive past the commit that introduced it.
 *
 * It deliberately scans only the surface tree. Domain code still calls a package
 * a package and a version a version — ADR-0020 D5 hides those from the
 * INTERFACE, it does not rename the domain.
 *
 * The shared components in `packages/ui/src/components/drop` are in range for
 * the same reason the panel tree is: they ship Persian of their own, and a label
 * rendered from a shared package reaches a person's eyes exactly like one
 * written on the page. The retired stage strip proved the gap — it carried
 * «بسته» past this guard while D5 banned the word from the interface.
 *
 * Three files there are excluded, and the exclusion is the point rather than a
 * convenience. `labels-fa.ts`, `vocabulary.ts` and the `status.tsx` badges that
 * render them are the RECORDED domain vocabulary of doc 09 §9, whose
 * completeness `vocabulary-parity` enforces against the ADRs.
 * `WAITING_FOR_DEPENDENCY` really is "waiting for a dependency" — renaming its
 * translation would corrupt the recorded mapping in order to make a presentation
 * rule pass. The rule the recorded vocabulary must obey is a different one: no
 * panel surface may render it. That is asserted below, and it is what keeps the
 * exclusion from being a hole.
 */
const ROOT = join(__dirname, "..", "..");
const PANEL_DIRS = [
  join(ROOT, "apps", "web", "app", "studio"),
  join(ROOT, "apps", "web", "components", "panel"),
];
const SURFACE_DIRS = [
  ...PANEL_DIRS,
  join(ROOT, "packages", "ui", "src", "components", "drop"),
  // Engine's graph labels are interface text too. They were the one place
  // «بسته» and the raw output-type identifiers survived D5, precisely because
  // this guard stopped at the app.
  join(ROOT, "packages", "workflow-ui", "src"),
];
const RECORDED_VOCABULARY = ["labels-fa.ts", "vocabulary.ts", "status.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (
      /\.tsx?$/.test(full) &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".test.tsx") &&
      !RECORDED_VOCABULARY.some((name) => full.endsWith(name))
    ) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Only USER-FACING string literals. Comments explain the rules — including by
 * naming the very phrases they ban — and identifiers like `packageVersionId`
 * are domain names the interface never renders.
 */
function userFacingStrings(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");

  const strings: string[] = [];
  for (const match of withoutComments.matchAll(/"([^"\\\n]{2,})"|'([^'\\\n]{2,})'/g)) {
    strings.push(match[1] ?? match[2] ?? "");
  }
  // JSX text between tags is user-facing too.
  for (const match of withoutComments.matchAll(/>\s*([^<>{}\n]{3,}?)\s*</g)) {
    strings.push(match[1] ?? "");
  }
  return strings;
}

/** Persian text a person reads; ASCII-only strings are class names and ids. */
function isPersian(value: string): boolean {
  return /[؀-ۿ]/.test(value);
}

describe("no ticket names reach the interface (ADR-0020 D5)", () => {
  it("no surface string mentions a P-ticket", () => {
    for (const file of SURFACE_DIRS.flatMap((d) => walk(d))) {
      for (const text of userFacingStrings(readFileSync(file, "utf8"))) {
        expect(
          /تیکت\s*P\d|ticket\s*P\d/i.test(text),
          `${file.slice(ROOT.length + 1)} names a ticket to the user: "${text}"`,
        ).toBe(false);
      }
    }
  });
});

describe("no technical vocabulary reaches the interface (ADR-0020 D5)", () => {
  /** Each entry is a phrase the brief names, with what to say instead. */
  const BANNED: readonly { pattern: RegExp; insteadFa: string }[] = [
    { pattern: /گیت‌?وی/, insteadFa: "say what the person sees, not where it came from" },
    { pattern: /شبیه‌?سازی\s*شده\s*است/, insteadFa: "the global demo marker carries this" },
    { pattern: /وابستگی/, insteadFa: "«منبع لازم است»" },
    { pattern: /نسخهٔ?\s*هدف/, insteadFa: "no version label in the interface" },
    // "بسته" as the product noun. Excludes «باز و بسته» ("open and close"),
    // where the same letters mean "closed" and carry no product meaning.
    { pattern: /(?<!باز و )بستهٔ?(?=\s|$)/, insteadFa: "«خروجی»" },
    // The transliteration is the same noun wearing Latin clothes.
    { pattern: /پکیج/, insteadFa: "«خروجی»" },
    { pattern: /مورد الزامی/, insteadFa: "a human sentence about what to do next" },
  ];

  it("no surface string uses a banned phrase", () => {
    const offenders: string[] = [];
    for (const file of SURFACE_DIRS.flatMap((d) => walk(d))) {
      for (const text of userFacingStrings(readFileSync(file, "utf8"))) {
        if (!isPersian(text)) continue;
        for (const { pattern, insteadFa } of BANNED) {
          if (pattern.test(text)) {
            offenders.push(
              `${file.slice(ROOT.length + 1)}: "${text}" — ${insteadFa}`,
            );
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("the four product nouns are used consistently (ADR-0020 D5)", () => {
  it("the interface never says «بسته» where it means «خروجی»", () => {
    for (const file of SURFACE_DIRS.flatMap((d) => walk(d))) {
      const source = readFileSync(file, "utf8");
      for (const text of userFacingStrings(source)) {
        if (!isPersian(text)) continue;
        expect(
          /(?<!باز و )بستهٔ?(?=\s|$)/.test(text),
          `${file.slice(ROOT.length + 1)} says «بسته»; the interface noun is «خروجی»: "${text}"`,
        ).toBe(false);
      }
    }
  });
});

describe("the recorded vocabulary stays out of the interface (ADR-0020 D5)", () => {
  /**
   * The escape hatch the exclusion above opens, closed. `FA_LABELS` translates
   * domain enums faithfully — including phrases D5 bans from the interface — so
   * a panel surface that rendered one would show the banned phrase without any
   * string literal for the scan to catch. The gallery may render them; it is a
   * component catalogue, not the product.
   */
  it("no panel surface reaches for the domain label table or its badges", () => {
    for (const file of PANEL_DIRS.flatMap((d) => walk(d))) {
      const source = readFileSync(file, "utf8");
      expect(
        /\bfaLabel\b|\bFA_LABELS\b|StatusBadge\b/.test(source),
        `${file.slice(ROOT.length + 1)} renders a recorded domain label; say it in the user's words instead`,
      ).toBe(false);
    }
  });
});

describe("a button label says the result of pressing it (brief §10)", () => {
  /**
   * The brief names its own bad examples: «ادامه» is ambiguous where
   * «انتخاب برای تولید محتوا» is good, and «بررسی وابستگی» is technical where
   * «افزودن منبع» is right. The second is already covered by the ban on
   * «وابستگی»; this is the first.
   *
   * The match is EXACT and only against a control's own text. «ادامه» inside a
   * sentence is ordinary Persian — the sidebar asks "کدام را ادامه بدهم؟" and
   * that is fine. It is the bare label on a button that tells the person
   * nothing about where they are going.
   */
  const VAGUE_LABELS = ["ادامه", "بیشتر بدانید", "کلیک کنید", "برو", "باز کن"];

  it("no control is labelled with a word that says nothing", () => {
    const offenders: string[] = [];
    for (const file of SURFACE_DIRS.flatMap((d) => walk(d))) {
      const source = readFileSync(file, "utf8");
      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " ");
      // JSX text that is the entire content of its element.
      for (const match of withoutComments.matchAll(/>\s*([^<>{}\n]+?)\s*</g)) {
        const text = (match[1] ?? "").trim();
        if (VAGUE_LABELS.includes(text)) {
          offenders.push(`${file.slice(ROOT.length + 1)}: «${text}» — say the result instead`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("honesty survives the notice removal (ADR-0020 D6)", () => {
  it("the shell still carries exactly one demo marker", () => {
    const shell = readFileSync(join(ROOT, "apps", "web", "app", "studio", "layout.tsx"), "utf8");
    // Removing the repeated per-surface notices must not remove the ONE marker
    // that keeps 18 §12 true: nothing may imply real machine work happened.
    expect(shell).toContain("حالت نمایشی");
  });

  it("no surface claims real publication or real research", () => {
    for (const file of SURFACE_DIRS.flatMap((d) => walk(d))) {
      for (const text of userFacingStrings(readFileSync(file, "utf8"))) {
        if (!isPersian(text)) continue;
        expect(
          /منتشر\s*شد|پژوهش\s*واقعی\s*انجام\s*شد/.test(text),
          `${file.slice(ROOT.length + 1)} claims something that did not happen: "${text}"`,
        ).toBe(false);
      }
    }
  });
});
