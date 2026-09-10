import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Content the panel did not write is bidi-isolated (ADR-0022; 09 §5, §12).
 *
 * The panel is fa-IR and its surfaces are RTL. Project titles, concept theses,
 * content items and comments are NOT written by the panel — a person or the
 * machine wrote them — and their direction is not ours to assume.
 *
 * When that is got wrong the failure is loud and specific. An English run set
 * inside an RTL paragraph keeps its words in order but hands its trailing
 * punctuation to the paragraph, so the full stop jumps to the visual START:
 *
 *     .A gathering about things that become meaningful when we return to them
 *
 * That is the Unicode bidi algorithm doing exactly what it is specified to do.
 * `BidiIdentifier` has isolated Latin ids since P1 for this reason; it was
 * simply never applied to content, and every machine-authored string on screen
 * broke the moment ADR-0021 wired a real session in.
 *
 * This asserts the fix stays applied. `dir="auto"` resolves from the first
 * strong character, so it holds whichever way ADR-0021 D7 is eventually ruled.
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
] as const;

const SURFACE_DIRS = [
  join(ROOT, "apps/web/components/panel"),
  join(ROOT, "packages/workflow-ui/src/canvas"),
];

/** The two accepted isolations: the shared primitive, or a bare `dir="auto"`. */
const ISOLATORS = [/<ContentText(\s[^>]*)?>\s*$/, /<bdi\s+dir="auto"(\s[^>]*)?>\s*$/];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

interface Unisolated {
  readonly file: string;
  readonly line: number;
  readonly expression: string;
}

function findUnisolated(): Unisolated[] {
  const pattern = new RegExp(
    String.raw`\{([a-zA-Z][a-zA-Z0-9_.]*\.(?:${CONTENT_FIELDS.join("|")}))\}`,
    "g",
  );
  const offenders: Unisolated[] = [];

  for (const dir of SURFACE_DIRS) {
    for (const file of walk(dir)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(pattern)) {
        const before = source.slice(0, match.index);
        const after = source.slice(match.index + match[0].length).trimStart();
        // Only JSX children are rendered text; a prop is somebody else's problem.
        if (!before.trimEnd().endsWith(">")) continue;
        if (!after.startsWith("<") && !after.startsWith("{")) continue;
        if (ISOLATORS.some((isolator) => isolator.test(before))) continue;
        offenders.push({
          file: file.slice(ROOT.length + 1),
          line: before.split("\n").length,
          expression: match[1]!,
        });
      }
    }
  }
  return offenders;
}

describe("text the panel did not write is bidi-isolated", () => {
  it("wraps every content field on every surface", () => {
    const offenders = findUnisolated();
    const report = offenders.map((o) => `${o.file}:${String(o.line)} ${o.expression}`).join("\n");
    expect(offenders, `unisolated content:\n${report}`).toEqual([]);
  });

  it("actually covers something, so a passing run means the rule ran", () => {
    // A guard that matches nothing passes forever. This pins that the scan
    // reaches real surfaces and real fields.
    const isolated = SURFACE_DIRS.flatMap((dir) => walk(dir))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
      .match(/<ContentText(\s[^>]*)?>|<bdi\s+dir="auto"/g);
    expect(isolated?.length ?? 0).toBeGreaterThanOrEqual(20);
  });

  it("the primitive resolves direction per string rather than pinning one", () => {
    /*
      `dir="auto"` and not `dir="ltr"`. The machine answers in English today
      (ADR-0021 D7 is open), and pinning LTR here would silently break the day
      that decision goes the other way and Persian content arrives.
    */
    const primitives = readFileSync(
      join(ROOT, "packages/ui/src/components/drop/primitives.tsx"),
      "utf8",
    );
    const start = primitives.indexOf("export function ContentText(");
    expect(start).toBeGreaterThan(-1);
    // To the next top-level export, so the destructured props — which contain
    // their own line-initial `}` — cannot truncate the slice early.
    const rest = primitives.slice(start + 1);
    const next = rest.indexOf("\nexport ");
    const component = next === -1 ? rest : rest.slice(0, next);
    expect(component).toContain('dir="auto"');
    expect(component).not.toContain('dir="ltr"');
  });
});
