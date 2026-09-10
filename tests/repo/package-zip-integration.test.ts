import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baseWorld, exportPackageFrom, type PackageManifest } from "@drop/mock-data";

/**
 * Ticket P3, AC-P3.13 — the archive is verified by actually UNZIPPING it.
 *
 * V2 04 §5 requires inspecting the generated ZIP against its manifest, and
 * V2 01 §6 rules out "empty fake archives". A hand-written ZIP writer that no
 * real unzip ever opens would satisfy neither: the bytes could be structurally
 * wrong and every unit test would still pass, because they would be checking the
 * writer against itself.
 *
 * Lives in tests/repo rather than in the package because it needs Node's
 * filesystem and a system `unzip`, and no package in this workspace carries node
 * types (they are ES2023-only by contract, ADR-0019 D17).
 */
describe("the exported package is a real archive (AC-P3.13)", () => {
  const world = baseWorld();
  const snapshot = world.packages[0]!;
  const exported = exportPackageFrom(world, snapshot.id);

  const dir = mkdtempSync(join(tmpdir(), "drop-zip-"));
  const file = join(dir, exported.filename);
  writeFileSync(file, exported.bytes);

  it("opens with a system unzip and contains every file the snapshot lists", () => {
    // `unzip -l` exits non-zero on a malformed archive, so this validates the
    // container as well as listing its contents.
    const listing = execFileSync("unzip", ["-l", file], { encoding: "utf8" });
    for (const entry of snapshot.files) {
      expect(listing, `archive must contain ${entry.path}`).toContain(entry.path);
    }
  });

  it("synthesizes manifest.json, which is not a files[] member", () => {
    // The reference archive in docs/frontend-v2/mock/ has four entries where its
    // snapshot lists three; the fourth is the snapshot with bodies stripped.
    expect(snapshot.files.some((f) => f.path === "manifest.json")).toBe(false);
    const listing = execFileSync("unzip", ["-l", file], { encoding: "utf8" });
    expect(listing).toContain("manifest.json");
  });

  it("the manifest describes exactly the archive's real contents", () => {
    const raw = execFileSync("unzip", ["-p", file, "manifest.json"], { encoding: "utf8" });
    const manifest = JSON.parse(raw) as PackageManifest;
    expect(manifest.files.map((f) => f.path).sort()).toEqual(
      snapshot.files.map((f) => f.path).sort(),
    );
    expect(manifest.id).toBe(snapshot.id);
    expect(manifest.isMock).toBe(true);
    // Bodies are not duplicated into the manifest.
    expect(raw).not.toContain('"body"');
  });

  it("round-trips Persian bodies byte-for-byte", () => {
    const persian = snapshot.files.find((f) => /[؀-ۿ]/.test(f.body));
    expect(persian, "the demo package must carry Persian content").toBeDefined();
    const extracted = execFileSync("unzip", ["-p", file, persian!.path], { encoding: "utf8" });
    expect(extracted).toBe(persian!.body);
  });
});
