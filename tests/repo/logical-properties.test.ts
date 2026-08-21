import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Ticket P1 AC-P1.3 / AC-P1.4 — the 09 §1 logical-properties rule and the
// 09 §3 single-theme-file discipline, proven in both directions.
const ROOT = join(__dirname, "..", "..");

function eslintOutput(file: string): { failed: boolean; output: string } {
  try {
    execFileSync("node", [join(ROOT, "node_modules", "eslint", "bin", "eslint.js"), "--no-ignore", file], {
      cwd: ROOT,
      stdio: "pipe",
    });
    return { failed: false, output: "" };
  } catch (err) {
    return { failed: true, output: String((err as { stdout?: Buffer }).stdout ?? "") };
  }
}

describe("logical-properties rule (AC-P1.3, 09 §1)", () => {
  it("the committed physical-utility fixture fails with the boundary rule id", () => {
    const res = eslintOutput(join(ROOT, "tests", "repo", "lint-fixtures-bad", "physical-direction.tsx"));
    expect(res.failed).toBe(true);
    expect(res.output).toContain("drop/no-physical-direction-classes");
  });

  it("every escape-hatch disable carries a documented reason", () => {
    const uiDir = join(ROOT, "packages", "ui", "src", "components", "ui");
    for (const name of readdirSync(uiDir)) {
      const content = readFileSync(join(uiDir, name), "utf8");
      for (const line of content.split("\n")) {
        if (line.includes("eslint-disable") && line.includes("no-physical-direction-classes")) {
          expect(line, `${name}: escape hatch must document a physical reason`).toMatch(/--\s+\S+/);
        }
      }
    }
  });
});

describe("single theme file (AC-P1.4, 09 §3)", () => {
  it("the token-literal scan passes on the real tree", () => {
    execFileSync("node", [join(ROOT, "scripts", "check-token-literals.mjs")], { cwd: ROOT, stdio: "pipe" });
  });

  it("the theme file has the three layers, PROVISIONAL tags and exactly one Lens accent token", () => {
    const theme = readFileSync(join(ROOT, "packages", "ui", "src", "theme.css"), "utf8");
    expect(theme).toContain("layer 1: primitives");
    expect(theme).toContain("layer 2: semantic");
    expect(theme).toContain("layer 3: component");
    expect(theme).toContain("PROVISIONAL");
    // one Lens accent TOKEN: --accent/--ring only ever reference it (ADR 0010 D10);
    // each theme block may redefine the token itself (runtime Lens replacement point).
    const accentRefs = theme.match(/--accent:\s*([^;]+);/g) ?? [];
    for (const ref of accentRefs) {
      expect(ref, "--accent must reference the Lens accent token, never a literal").toContain("var(--drop-lens-accent)");
    }
    const ringRefs = theme.match(/--ring:\s*([^;]+);/g) ?? [];
    for (const ref of ringRefs) {
      expect(ref, "--ring must reference the Lens accent token, never a literal").toContain("var(--drop-lens-accent)");
    }
    expect((theme.match(/--drop-lens-accent:/g) ?? []).length, "token defined once per theme block at most").toBeLessThanOrEqual(2);
  });
});
