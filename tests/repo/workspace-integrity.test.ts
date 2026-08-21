import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

// Ticket 0.1 AC-2/AC-3/AC-7 — the workspace-integrity seam.
// The thirteen-package list of 16 §3 is the binding contract for this ticket.
const ROOT = join(__dirname, "..", "..");

const EXPECTED_PACKAGES = [
  "core", "studio", "contracts", "db", "pipeline", "workflow-ui",
  "ai-gateway", "retrieval", "storage", "ui", "config", "observability", "testing",
].sort();
const EXPECTED_APPS = ["web", "worker"].sort();

function workspaceDirs(kind: "apps" | "packages"): string[] {
  return readdirSync(join(ROOT, kind), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, kind, d.name, "package.json")))
    .map((d) => d.name)
    .sort();
}

describe("workspace membership (AC-2)", () => {
  it("pnpm-workspace.yaml declares exactly apps/* and packages/*", () => {
    const ws = parse(readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8"));
    expect(ws.packages.sort()).toEqual(["apps/*", "packages/*"]);
  });

  it("packages/ contains exactly the thirteen 16 §3 packages", () => {
    expect(workspaceDirs("packages")).toEqual(EXPECTED_PACKAGES);
  });

  it("apps/ contains exactly web and worker", () => {
    expect(workspaceDirs("apps")).toEqual(EXPECTED_APPS);
  });
});

describe("strict TypeScript everywhere (AC-3)", () => {
  const allWorkspaces = [
    ...EXPECTED_APPS.map((a) => join(ROOT, "apps", a)),
    ...EXPECTED_PACKAGES.map((p) => join(ROOT, "packages", p)),
  ];

  it("every workspace tsconfig extends the shared strict base and never opts out", () => {
    for (const dir of allWorkspaces) {
      const raw = readFileSync(join(dir, "tsconfig.json"), "utf8");
      const cfg = JSON.parse(raw);
      expect(cfg.extends, `${dir} must extend the shared base`).toMatch(/tsconfig\.base\.json$/);
      const opts = cfg.compilerOptions ?? {};
      expect(opts.strict, `${dir} must not set strict:false`).not.toBe(false);
      for (const key of [
        "noImplicitAny", "strictNullChecks", "strictFunctionTypes",
        "strictBindCallApply", "strictPropertyInitialization",
        "strictBuiltinIteratorReturn", "useUnknownInCatchVariables", "alwaysStrict",
      ]) {
        expect(opts[key], `${dir} must not weaken ${key}`).not.toBe(false);
      }
    }
  });

  it("the shared base is strict", () => {
    const base = JSON.parse(readFileSync(join(ROOT, "tsconfig.base.json"), "utf8"));
    expect(base.compilerOptions.strict).toBe(true);
  });
});

describe("pinned versions (AC-7)", () => {
  it("no workspace manifest uses floating registry ranges", () => {
    const manifests = [
      join(ROOT, "package.json"),
      ...EXPECTED_APPS.map((a) => join(ROOT, "apps", a, "package.json")),
      ...EXPECTED_PACKAGES.map((p) => join(ROOT, "packages", p, "package.json")),
    ];
    for (const m of manifests) {
      const pkg = JSON.parse(readFileSync(m, "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
        for (const [name, range] of Object.entries<string>(pkg[field] ?? {})) {
          if (range.startsWith("workspace:")) continue; // internal edges are workspace-pinned
          expect(
            /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(range),
            `${m}: ${field}.${name}="${range}" must be an exact semver version`,
          ).toBe(true);
        }
      }
    }
  });

  it("the lockfile is committed", () => {
    expect(existsSync(join(ROOT, "pnpm-lock.yaml"))).toBe(true);
  });
});
