import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// Ticket 0.1 AC-4 — the 05 §4 boundary rule, proven in BOTH directions:
// allowed edges compile (pnpm typecheck covers that); forbidden imports
// must FAIL lint. Each bad fixture contains exactly one forbidden import
// class and eslint must reject every one of them.
const ROOT = join(__dirname, "..", "..");
const BAD_DIR = join(ROOT, "tests", "repo", "boundary-fixtures-bad");

function boundaryRuleFires(file: string): boolean {
  try {
    execFileSync("node", [join(ROOT, "node_modules", "eslint", "bin", "eslint.js"), "--no-ignore", file], {
      cwd: ROOT,
      stdio: "pipe",
    });
    return false; // lint passed — the boundary rule did NOT fire
  } catch (err) {
    // A config crash also exits non-zero; only the boundary rule itself counts
    // (review nit — the assertion must be non-vacuous).
    const out = String((err as { stdout?: Buffer }).stdout ?? "");
    return out.includes("no-restricted-imports");
  }
}

describe("forbidden import classes fail lint (AC-4, 05 §4)", () => {
  const fixtures = readdirSync(BAD_DIR).filter((f) => f.endsWith(".ts"));

  it("has one fixture per forbidden class", () => {
    expect(fixtures.sort()).toEqual([
      "component-imports-drizzle-subpath.ts",
      "component-imports-drizzle.ts",
      "domain-imports-nextjs.ts",
      "domain-imports-provider-sdk.ts",
      "domain-imports-react-flow.ts",
      "ui-imports-domain-services.ts",
    ]);
  });

  it.each(readdirSync(BAD_DIR).filter((f) => f.endsWith(".ts")))(
    "%s is rejected by the boundary rule",
    (fixture) => {
      expect(boundaryRuleFires(join(BAD_DIR, fixture))).toBe(true);
    },
  );
});
