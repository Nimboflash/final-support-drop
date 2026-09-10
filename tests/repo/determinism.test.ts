import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Ticket P3, Seam F — AC-P3.8 determinism.
 *
 * ADR-0019 D16 requires `Date.now`, `Math.random`, `setTimeout` and
 * `setInterval` to be unreachable from the demo world. That is not a style
 * preference: a single `Date.now()` in a fixture makes "loading the same
 * scenario twice yields deep-equal state" intermittently false, and an
 * intermittent determinism failure is the hardest kind to chase.
 *
 * `tsconfig.base.json` pins `"lib": ["ES2023"]`, so most of these would not even
 * compile inside the packages — but `lib` can be widened by a well-meaning edit,
 * and this check is what notices.
 */
const ROOT = join(__dirname, "..", "..");

const WATCHED = [
  join(ROOT, "packages", "mock-data", "src"),
  join(ROOT, "packages", "machine-gateway", "src"),
  join(ROOT, "packages", "panel-domain", "src"),
];

const ENTROPY = /\bDate\.now\b|\bMath\.random\b|\bsetTimeout\b|\bsetInterval\b|new Date\(\s*\)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * Strip comments and string literals first. A comment explaining WHY `Date.now`
 * is banned contains the words `Date.now`; without this the check flags its own
 * documentation, and the natural response is to delete the explanation.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

function entropyOffenders(source: string): string[] {
  return codeOnly(source)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => ENTROPY.test(line));
}

describe("the demo world is unreachable from entropy (AC-P3.8)", () => {
  it("no watched package reads a clock or a random source", () => {
    for (const dir of WATCHED) {
      for (const file of walk(dir)) {
        const offenders = entropyOffenders(readFileSync(file, "utf8"));
        expect(
          offenders,
          `${file.slice(ROOT.length + 1)} reintroduces entropy: ${offenders.join(" | ")}`,
        ).toEqual([]);
      }
    }
  });

  it("the check actually fires, proven against a mutation fixture", () => {
    // Without this, a broken regex would make the check above pass vacuously
    // forever (testing-strategy §1.1).
    const dir = mkdtempSync(join(tmpdir(), "drop-determinism-"));
    try {
      const file = join(dir, "offender.ts");
      writeFileSync(file, "export const at = Date.now();\n");
      expect(entropyOffenders(readFileSync(file, "utf8"))).toHaveLength(1);

      writeFileSync(file, "export const r = Math.random();\n");
      expect(entropyOffenders(readFileSync(file, "utf8"))).toHaveLength(1);

      // ...and does NOT fire on prose that merely names them.
      writeFileSync(file, "// Date.now is banned here; see ADR-0019 D16.\nexport const x = 1;\n");
      expect(entropyOffenders(readFileSync(file, "utf8"))).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the injected clock is the single demo epoch", () => {
    const ports = readFileSync(join(ROOT, "packages", "mock-data", "src", "ports.ts"), "utf8");
    expect(ports).toContain('DEMO_EPOCH = "2026-09-06T09:00:00Z"');
  });

  it("discovery rotates an authored table rather than a generator", () => {
    const discovery = readFileSync(
      join(ROOT, "packages", "mock-data", "src", "discovery.ts"),
      "utf8",
    );
    // At least two batches, or "advancing the seed yields a different batch"
    // cannot be true.
    const batchCount = (discovery.match(/key: "BATCH_/g) ?? []).length;
    expect(batchCount).toBeGreaterThanOrEqual(2);
    expect(codeOnly(discovery)).not.toMatch(/random|shuffle|seedrandom/i);
  });
});
