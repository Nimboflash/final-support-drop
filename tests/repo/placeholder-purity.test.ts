import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Seam F — AC-P2.9, placeholder purity.
 *
 * ADR-0018 D3 freezes `apps/worker` and the eleven machine-oriented packages
 * through P8: "no content beyond their committed 0.1 placeholders may land in
 * them during panel scope". This check proves that, data-driven from the
 * committed frozen-set manifest.
 *
 * Frozen-set reconciliation (P2 body, mechanic 5): `packages/ui` (activated by
 * P1) and `packages/workflow-ui` (activated by the workflow-surface ticket) are
 * panel packages per (18 §10) and are deliberately NOT in the frozen set, even
 * though ADR-0017 D3 froze the 0.1 scaffolds — ADR-0017 D2 supersedes 0.12 → P1
 * and 0.13 → P4/P5, whose scopes own exactly those two packages.
 */

const ROOT = join(__dirname, "..", "..");

interface FrozenWorkspace {
  readonly name: string;
  readonly files: Readonly<Record<string, string>>;
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
}

interface FrozenManifest {
  readonly workspaces: Readonly<Record<string, FrozenWorkspace>>;
}

const manifest: FrozenManifest = JSON.parse(
  readFileSync(join(__dirname, "frozen-set.manifest.json"), "utf8"),
);

/** The 12 workspaces ADR-0018 D3 freezes (11 packages + apps/worker). */
const EXPECTED_FROZEN = [
  "apps/worker",
  "packages/ai-gateway",
  "packages/config",
  "packages/contracts",
  "packages/core",
  "packages/db",
  "packages/observability",
  "packages/pipeline",
  "packages/retrieval",
  "packages/storage",
  "packages/studio",
  "packages/testing",
];

function walk(dir: string, base: string = dir, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (statSync(full).isFile()) out.push(relative(base, full));
  }
  return out.sort();
}

function hash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
}

/**
 * The check itself, as a pure function over a directory plus its expectation,
 * so the mutation fixture below can exercise it without mutating the real tree.
 * Returns the violations found; empty means pure.
 */
export function findPurityViolations(dir: string, expected: FrozenWorkspace): string[] {
  const violations: string[] = [];
  const actualFiles = walk(dir);
  const expectedFiles = Object.keys(expected.files).sort();

  for (const file of actualFiles) {
    if (!(file in expected.files)) {
      violations.push(`NEW_SOURCE_MODULE: ${file}`);
      continue;
    }
    if (hash(join(dir, file)) !== expected.files[file]) {
      violations.push(`PLACEHOLDER_CONTENT_CHANGED: ${file}`);
    }
  }
  for (const file of expectedFiles) {
    if (!actualFiles.includes(file)) violations.push(`FROZEN_FILE_REMOVED: ${file}`);
  }

  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const field of ["dependencies", "devDependencies"] as const) {
    const actual = Object.keys(pkg[field] ?? {}).sort();
    const allowed = field === "dependencies" ? expected.dependencies : expected.devDependencies;
    for (const dep of actual) {
      if (!allowed.includes(dep)) violations.push(`NEW_DEPENDENCY: ${field}.${dep}`);
    }
  }
  return violations;
}

describe("the frozen set is exactly ADR-0018 D3's twelve workspaces", () => {
  it("the manifest lists them and nothing else", () => {
    expect(Object.keys(manifest.workspaces).sort()).toEqual(EXPECTED_FROZEN);
  });

  it("no panel package is frozen by mistake (P2 mechanic 5)", () => {
    for (const panelPackage of [
      "packages/ui",
      "packages/workflow-ui",
      "packages/panel-domain",
      "packages/machine-gateway",
      "packages/mock-data",
      "apps/web",
    ]) {
      expect(Object.keys(manifest.workspaces)).not.toContain(panelPackage);
    }
  });
});

describe("each frozen workspace is still an inert 0.1 placeholder (AC-P2.9)", () => {
  for (const workspace of EXPECTED_FROZEN) {
    it(`${workspace} is unchanged`, () => {
      const expected = manifest.workspaces[workspace];
      expect(expected, `${workspace} missing from the frozen-set manifest`).toBeDefined();
      const violations = findPurityViolations(join(ROOT, workspace), expected!);
      expect(violations, `${workspace} violates the ADR-0018 D3 freeze`).toEqual([]);
    });
  }

  it("every frozen package still exports its inert `placeholder: true` marker", () => {
    // apps/worker is excluded deliberately: ticket 0.1 shipped it as a dispatch
    // *entry point* proving the pipeline <- worker-adapter edge compiles, not as
    // a `packageInfo` placeholder. Its inertness is covered by the byte-level
    // manifest check above; asserting a marker it never had would be a test
    // written against an imagined 0.1, not the committed one.
    for (const workspace of EXPECTED_FROZEN.filter((w) => w !== "apps/worker")) {
      const index = join(ROOT, workspace, "src", "index.ts");
      expect(existsSync(index), `${workspace}/src/index.ts is missing`).toBe(true);
      const source = readFileSync(index, "utf8");
      expect(source, `${workspace} placeholder export changed`).toContain("placeholder: true");
    }
  });

  it("apps/worker still holds only its 0.1 boundary proof, with no machine logic", () => {
    // ADR-0018 D3 names apps/worker explicitly. What must stay absent is
    // machine work: queue wiring is ticket 0.10, deferred (ADR-0017 D2).
    const source = readFileSync(join(ROOT, "apps", "worker", "src", "index.ts"), "utf8");
    expect(source).toContain("workerBoundary");
    for (const forbidden of ["bullmq", "BullMQ.", "new Worker(", "new Queue(", "ioredis"]) {
      expect(source, `apps/worker gained machine infrastructure: ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });
});

describe("the purity check fires (mutation fixture)", () => {
  // The fixture stands in for a frozen placeholder that grew a machine module,
  // rewrote its placeholder export and gained a dependency — the three things
  // ADR-0018 D3 forbids. Without this, a check that always returned [] would
  // pass the suite above silently.
  const fixtureDir = join(__dirname, "purity-fixtures-bad", "mutated-placeholder");
  const asIfFrozen: FrozenWorkspace = {
    name: "@drop/mutated-placeholder-fixture",
    files: {
      "package.json": "0000000000000000",
      "src/index.ts": "0000000000000000",
    },
    dependencies: [],
    devDependencies: ["typescript"],
  };

  it("reports the new source module, the changed content and the new dependency", () => {
    const violations = findPurityViolations(fixtureDir, asIfFrozen);
    expect(violations).toContain("NEW_SOURCE_MODULE: src/machine-logic.ts");
    expect(violations).toContain("PLACEHOLDER_CONTENT_CHANGED: src/index.ts");
    expect(violations).toContain("NEW_DEPENDENCY: dependencies.zod");
  });

  it("the bad fixture is not a workspace member", () => {
    // tests/** is outside the pnpm-workspace globs (apps/*, packages/*), so the
    // fixture can carry a package.json without joining the workspace.
    expect(existsSync(join(ROOT, "packages", "mutated-placeholder"))).toBe(false);
  });
});
