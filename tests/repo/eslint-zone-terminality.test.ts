import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Seam F — ticket P2. Boundary rules are proven AT REAL SOURCE PATHS.
 *
 * Why this exists, concretely: ESLint flat config REPLACES the options of a
 * repeated rule rather than merging them, so the last config object matching a
 * file is the only `no-restricted-imports` that applies. When ticket P2
 * appended a component zone matching `packages/ui/**`, it silently became the
 * terminal writer for that tree and dropped the 0.1 zone's 05 §4
 * domain-service restriction — while
 * `tests/repo/boundary-fixtures-bad/ui-imports-domain-services.ts` kept
 * passing, because that fixture path was NOT matched by the new zone and was
 * still judged by the old one.
 *
 * A fixture in `tests/repo/` can therefore never prove a rule applies inside
 * `packages/ui/`. These checks write a throwaway file at the real path, lint
 * it, and delete it — the only way to observe the terminal configuration a real
 * source file actually gets.
 */

const ROOT = join(__dirname, "..", "..");
const written: string[] = [];

afterEach(() => {
  while (written.length > 0) rmSync(written.pop()!, { force: true });
});

/** Lints a throwaway file at `relPath`; returns the rule messages it produced. */
function lintAt(relPath: string, source: string): string {
  const abs = join(ROOT, relPath);
  writeFileSync(abs, source);
  written.push(abs);
  try {
    execFileSync("node", [join(ROOT, "node_modules", "eslint", "bin", "eslint.js"), "--no-ignore", abs], {
      cwd: ROOT,
      stdio: "pipe",
    });
    return "";
  } catch (err) {
    return String((err as { stdout?: Buffer }).stdout ?? "");
  }
}

describe("packages/ui keeps every restriction that applies to it", () => {
  it("still rejects feature/domain services (05 §4) after the P2 zone was appended", () => {
    const out = lintAt(
      "packages/ui/src/zone-probe.tmp.ts",
      'import { packageInfo } from "@drop/core";\nexport const x = packageInfo;\n',
    );
    expect(out).toContain("no-restricted-imports");
    expect(out).toContain("must not import feature/domain services");
  });

  it("rejects Drizzle (05 §4)", () => {
    const out = lintAt(
      "packages/ui/src/zone-probe.tmp.ts",
      'import { sql } from "drizzle-orm";\nexport const x = sql;\n',
    );
    expect(out).toContain("no-restricted-imports");
  });

  it("rejects @drop/mock-data (18 §6-§7)", () => {
    const out = lintAt(
      "packages/ui/src/zone-probe.tmp.ts",
      'import { packageInfo } from "@drop/mock-data";\nexport const x = packageInfo;\n',
    );
    expect(out).toContain("components must never import fixtures directly");
  });

  it("rejects panel-domain's fixture subpath (18 §7)", () => {
    const out = lintAt(
      "packages/ui/src/zone-probe.tmp.ts",
      'import { VALID_FIXTURES } from "@drop/panel-domain/fixtures";\nexport const x = VALID_FIXTURES;\n',
    );
    expect(out).toContain("fixture shapes are for adapters");
  });

  it("still allows a legitimate import, so the zone is not simply rejecting everything", () => {
    const out = lintAt(
      "packages/ui/src/zone-probe.tmp.ts",
      'import { z } from "zod";\nexport const x = z;\n',
    );
    expect(out).toBe("");
  });
});

describe("apps/web/lib is governed by the component zone", () => {
  it("rejects @drop/mock-data at a real apps/web/lib path", () => {
    const out = lintAt(
      "apps/web/lib/zone-probe.tmp.ts",
      'import { packageInfo } from "@drop/mock-data";\nexport const x = packageInfo;\n',
    );
    expect(out).toContain("components must never import fixtures directly");
  });
});

describe("the contract packages are governed at their real paths", () => {
  it("packages/panel-domain rejects React", () => {
    const out = lintAt(
      "packages/panel-domain/src/zone-probe.tmp.ts",
      'import { useState } from "react";\nexport const x = useState;\n',
    );
    expect(out).toContain("must not import React");
  });

  it("packages/machine-gateway rejects React Flow, by the React Flow rule", () => {
    const out = lintAt(
      "packages/machine-gateway/src/zone-probe.tmp.ts",
      'import type { Edge } from "@xyflow/system";\nexport type E = Edge;\n',
    );
    expect(out).toContain("React Flow objects must never become the integration contract");
  });

  it("packages/panel-domain rejects Next.js", () => {
    const out = lintAt(
      "packages/panel-domain/src/zone-probe.tmp.ts",
      'import { headers } from "next/headers";\nexport const x = headers;\n',
    );
    expect(out).toContain("must not import Next.js");
  });

  it("packages/panel-domain still allows zod, its one permitted dependency", () => {
    const out = lintAt(
      "packages/panel-domain/src/zone-probe.tmp.ts",
      'import { z } from "zod";\nexport const x = z;\n',
    );
    expect(out).toBe("");
  });
});
