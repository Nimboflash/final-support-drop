import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The vendored machine is the owner's, VERBATIM (ADR-0021 D2).
 *
 * `services/concept-portfolio/` is not ours. Not to add a health route, not to
 * make a credential optional, not to "just fix" a startup failure — and that
 * last one is not hypothetical, because it is exactly what happened. Two files
 * were edited to bring the system up, the edits were documented and disclosed,
 * and the owner's answer was that the machine must be identical to the file
 * they supplied with nothing added. They were right: a vendored artefact that
 * has been helpfully improved is no longer the artefact anyone reviewed.
 *
 * Every constraint that made those edits tempting is solved OUTSIDE this
 * directory instead:
 *
 *   - `_service()` builds `OpenRouterBackend` unconditionally and
 *     `Settings.from_env()` demands a key, so `scripts/machine-server.py`
 *     rebinds `_service` from outside the module — which is precisely what the
 *     service's own `tests/test_api.py` does with `monkeypatch.setattr`.
 *   - There is no health route, and none is needed: `Settings.from_env()` is
 *     reached only from `_service()`, so FastAPI's own `/openapi.json` answers
 *     without configuration, without a session and without spending a token.
 *
 * Hash-pinned in the pattern `placeholder-purity.test.ts` already establishes
 * for the twelve frozen workspaces. Regenerating the manifest to make this pass
 * is the same as deleting the test.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const SERVICE = join(ROOT, "services/concept-portfolio");

/** Generated at runtime or by the toolchain; never part of the artefact. */
const NOT_VENDORED = new Set([".venv", "__pycache__", ".pytest_cache", "drop_runs"]);

const MANIFEST = JSON.parse(
  readFileSync(join(import.meta.dirname, "vendored-machine.manifest.json"), "utf8"),
) as Record<string, string>;

function walk(dir: string, base: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (NOT_VENDORED.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(full.slice(base.length + 1));
  }
  return out;
}

function hash(relative: string): string {
  return createHash("sha256").update(readFileSync(join(SERVICE, relative))).digest("hex");
}

describe("the vendored machine is byte-identical to what the owner supplied", () => {
  const present = walk(SERVICE, SERVICE).sort();

  it("has exactly the files the owner supplied — none added, none removed", () => {
    expect(present).toEqual(Object.keys(MANIFEST).sort());
  });

  it("has not had one byte of it changed", () => {
    const changed = present.filter((file) => MANIFEST[file] !== undefined && MANIFEST[file] !== hash(file));
    expect(changed, `modified vendored files:\n${changed.join("\n")}`).toEqual([]);
  });

  it("still demands a credential and still has no health route", () => {
    /*
      The two specific edits that were made and reverted. Asserted by their
      SHAPE as well as by hash, so the failure names what was done rather than
      only reporting that a digest moved.
    */
    const config = readFileSync(join(SERVICE, "src/drop_portfolio/config.py"), "utf8");
    expect(config).not.toContain("DROP_BACKEND");
    expect(config).toContain("OPENROUTER_API_KEY was not found in the environment.");

    const api = readFileSync(join(SERVICE, "src/drop_portfolio/api.py"), "utf8");
    expect(api).not.toContain("/health");
    expect(api).not.toContain("MockBackend");
    expect(api).toContain("backend = OpenRouterBackend(settings)");
  });

  it("is driven from outside, by the service's own documented pattern", () => {
    // The launcher lives in scripts/, not in the service, and uses the same
    // override the service's own test suite uses.
    const launcher = readFileSync(join(ROOT, "scripts/machine-server.py"), "utf8");
    expect(launcher).toContain("api_mod._service");

    const ownTests = readFileSync(join(SERVICE, "tests/test_api.py"), "utf8");
    expect(ownTests).toContain("monkeypatch.setattr(api_mod, '_service'");
  });

  it("pins enough files that a passing run means the scan ran", () => {
    expect(present.length).toBeGreaterThanOrEqual(25);
  });
});
