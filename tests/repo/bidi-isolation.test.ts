import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Content the panel did not write is bidi-isolated (ADR-0022 D5; 09 §5, §12).
 *
 * The panel is fa-IR and its surfaces are RTL. Project titles, concept theses,
 * content items and comments are NOT written by the panel — a person or the
 * machine wrote them — and their direction is not ours to assume.
 *
 * Get it wrong and the failure is loud and specific: an English run inside an
 * RTL paragraph keeps its words in order but hands its trailing punctuation to
 * the paragraph, so the full stop lands at the visual START of the line.
 *
 *     .A gathering about things that become meaningful when we return to them
 *
 * `BidiIdentifier` has isolated Latin ids since P1 for exactly this reason; it
 * was simply never pointed at content, and the mock world hid it completely
 * because the mock world is Persian.
 *
 * The FIRST version of this guard matched `{x.field}` with a regex and passed
 * while fifteen sites were still broken — `{titleFa}` destructured, and
 * `{version?.titleFa ?? "…"}` with optional chaining, were both invisible to
 * it, as was anything nested inside a `.map()`. A guard that cannot see the
 * bug it was written for is worse than no guard, because it is reassuring.
 * So this one parses JSX children with balanced braces instead.
 */
const ROOT = join(import.meta.dirname, "..", "..");

/** Fields carrying text the panel did not author. */
const CONTENT_FIELDS = [
  "titleFa",
  "thesisFa",
  "bodyFa",
  "detailFa",
  "projectTitleFa",
  "labelFa",
  "summaryFa",
  "feedbackAppliedFa",
  "reasonFa",
  "oneLineFa",
] as const;

const SURFACE_DIRS = [
  join(ROOT, "apps/web/components/panel"),
  join(ROOT, "packages/workflow-ui/src/canvas"),
];

const FIELD_RE = new RegExp(`\\b(?:${CONTENT_FIELDS.join("|")})\\b`);
const CONTENT_TEXT = /<ContentText>\s*$/;
const BARE_BDI = /<bdi\s+dir="auto"\s*>\s*$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

interface Child {
  readonly start: number;
  readonly end: number;
  readonly expression: string;
}

/**
 * Every `{...}` sitting as a JSX text child — including ones nested inside a
 * container expression, which is where a third of the real sites were hiding.
 */
function jsxChildren(source: string): Child[] {
  const children: Child[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "{") continue;
    if (!source.slice(0, i).trimEnd().endsWith(">")) continue;

    let depth = 0;
    let j = i;
    for (; j < source.length; j += 1) {
      if (source[j] === "{") depth += 1;
      else if (source[j] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (j >= source.length) continue;

    const after = source.slice(j + 1).trimStart();
    if (after.startsWith("<") || after.startsWith("{")) {
      children.push({ start: i, end: j + 1, expression: source.slice(i + 1, j) });
    }
  }
  return children;
}

/**
 * A LEAF renders the string itself. An expression containing a JSX element or
 * a callback is a container — its own leaves are visited separately, and
 * wrapping the container would isolate markup rather than text.
 */
function isLeaf(expression: string): boolean {
  return !expression.includes("<") && !expression.includes("=>");
}

interface Offender {
  readonly file: string;
  readonly line: number;
  readonly expression: string;
}

function scan(): { readonly leaves: number; readonly offenders: Offender[] } {
  const offenders: Offender[] = [];
  let leaves = 0;

  for (const dir of SURFACE_DIRS) {
    for (const file of walk(dir)) {
      const source = readFileSync(file, "utf8");
      for (const child of jsxChildren(source)) {
        if (!FIELD_RE.test(child.expression) || !isLeaf(child.expression)) continue;
        leaves += 1;
        const before = source.slice(0, child.start);
        if (CONTENT_TEXT.test(before) || BARE_BDI.test(before)) continue;
        offenders.push({
          file: file.slice(ROOT.length + 1),
          line: before.split("\n").length,
          expression: child.expression.trim().slice(0, 60),
        });
      }
    }
  }
  return { leaves, offenders };
}

describe("text the panel did not write is bidi-isolated", () => {
  it("isolates every content leaf on every surface", () => {
    const { offenders } = scan();
    const report = offenders
      .map((o) => `${o.file}:${String(o.line)}  {${o.expression}}`)
      .join("\n");
    expect(offenders, `unisolated content:\n${report}`).toEqual([]);
  });

  it("sees enough sites that a passing run means the scan ran", () => {
    // The previous guard's real failure: it matched almost nothing and passed.
    const { leaves } = scan();
    expect(leaves).toBeGreaterThanOrEqual(30);
  });

  it("sees a destructured identifier and an optional chain, not just `x.field`", () => {
    /*
      The two shapes that defeated the first attempt, pinned as fixtures so the
      parser cannot quietly regress to a shape that misses them again.
    */
    const fixture = [
      '<Badge variant="secondary"><ContentText>{projectTitleFa}</ContentText></Badge>',
      '<p><ContentText>{version?.titleFa ?? "x"}</ContentText></p>',
      "<p>{version?.bodyFa}</p>",
    ].join("\n");
    const leaves = jsxChildren(fixture).filter(
      (c) => FIELD_RE.test(c.expression) && isLeaf(c.expression),
    );
    expect(leaves).toHaveLength(3);
    const unwrapped = leaves.filter((c) => !CONTENT_TEXT.test(fixture.slice(0, c.start)));
    expect(unwrapped.map((c) => c.expression.trim())).toEqual(["version?.bodyFa"]);
  });

  it("the primitive resolves direction per string rather than pinning one", () => {
    /*
      `dir="auto"`, not `dir="ltr"`. The machine answers in English today
      (ADR-0021 D7 is open), and pinning a direction would break silently the
      day that ruling goes the other way and Persian content arrives.
    */
    const primitives = readFileSync(
      join(ROOT, "packages/ui/src/components/drop/primitives.tsx"),
      "utf8",
    );
    const start = primitives.indexOf("export function ContentText(");
    expect(start).toBeGreaterThan(-1);
    const rest = primitives.slice(start + 1);
    const next = rest.indexOf("\nexport ");
    const component = next === -1 ? rest : rest.slice(0, next);
    expect(component).toContain('dir="auto"');
    expect(component).not.toContain('dir="ltr"');
  });
});

/*
  Both defects this file guards came from the same blind spot: the mock world's
  titles are SHORT and PERSIAN, and a real machine title is a LONG ENGLISH
  SENTENCE. So the e2e bidi sweep and the e2e overflow sweep both ran green
  over data that could not exhibit either bug.

  One long title pushed 74px of a card off the side of the screen, because a
  grid or flex item's default `min-width: auto` means it can never shrink below
  its content — `max-width` alone will not save it.
*/
describe("a long foreign title cannot widen its container", () => {
  it("CardTitle can shrink below its content", () => {
    const card = readFileSync(join(ROOT, "packages/ui/src/components/ui/card.tsx"), "utf8");
    const title = card.slice(card.indexOf("function CardTitle("));
    expect(title.slice(0, title.indexOf("\n}"))).toContain("min-w-0");
  });

  it("a title badge is allowed to shrink and ellipsise", () => {
    for (const file of [
      "apps/web/components/panel/concepts-page.tsx",
      "apps/web/components/panel/outputs-page.tsx",
    ]) {
      const source = readFileSync(join(ROOT, file), "utf8");
      const badges = source.match(/<Badge[^>]*>\s*<ContentText>/g) ?? [];
      expect(badges.length, `${file} renders no title badge`).toBeGreaterThan(0);
      for (const badge of badges) {
        // `Badge` is `w-fit shrink-0 whitespace-nowrap` by default; a badge
        // holding content the panel did not write must undo all three.
        expect(badge, `${file}: title badge cannot shrink`).toContain("min-w-0");
        expect(badge, `${file}: title badge cannot ellipsise`).toContain("truncate");
      }
    }
  });
});
