import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Seam F — AC-P2.6, the verbatim rule.
 *
 * (18 §6) prints the `MachineGateway` interface and calls it "the required
 * rule"; ADR-0018 D1 holds it "character-for-character unchanged" and forbids
 * new members. This check compares the declaration committed in
 * `machine-gateway.ts` against the ```ts block in doc 18 itself — the committed
 * copy of that text — so drift in EITHER file is a red check rather than
 * something a reviewer has to notice.
 *
 * Comparing against the document (rather than a third hand-copied constant)
 * is deliberate: a third copy could itself drift from doc 18 unnoticed.
 *
 * Lives in tests/repo (not in packages/machine-gateway) because it is a static
 * repository fact check — Seam F — and keeping it here leaves the contract
 * package free of the node type dependency a filesystem read would require.
 */

const ROOT = join(__dirname, "..", "..");
const DOC_18 = join(
  ROOT,
  "docs",
  "implementation",
  "18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md",
);
const SOURCE = join(ROOT, "packages", "machine-gateway", "src", "machine-gateway.ts");

/** Pulls the `export interface MachineGateway { ... }` block out of a file. */
function extractInterfaceBlock(text: string, label: string): string {
  const start = text.indexOf("export interface MachineGateway {");
  expect(start, `${label} does not declare "export interface MachineGateway {"`).toBeGreaterThan(-1);
  const end = text.indexOf("\n}", start);
  expect(end, `${label} has an unterminated MachineGateway declaration`).toBeGreaterThan(start);
  return text.slice(start, end + 2);
}

describe("MachineGateway is committed verbatim from 18 §6 (AC-P2.6)", () => {
  const documented = extractInterfaceBlock(readFileSync(DOC_18, "utf8"), "doc 18 §6");
  const committed = extractInterfaceBlock(readFileSync(SOURCE, "utf8"), "machine-gateway.ts");

  it("the declaration matches doc 18 §6 character-for-character", () => {
    expect(committed).toBe(documented);
  });

  it("declares exactly the eleven 18 §6 members and no more (ADR-0018 D1)", () => {
    const members = committed
      .split("\n")
      .slice(1, -1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.slice(0, line.indexOf("(")));

    expect(members).toEqual([
      "listMachines",
      "listWorkflowDefinitions",
      "getWorkflowDefinition",
      "listRuns",
      "getRun",
      "startRun",
      "pauseRun",
      "retryStage",
      "submitApproval",
      "listArtifacts",
      "listAuditEvents",
    ]);
  });

  it("carries no gate verb as a method (ADR-0013 D2)", () => {
    for (const verb of ["approveGate", "requestChanges", "escalateGate"]) {
      expect(committed).not.toContain(verb);
    }
  });

  it("the extraction is real — it fails on a mutated declaration", () => {
    // Guards the check itself: if `extractInterfaceBlock` silently returned the
    // same string for any input, the comparison above would be vacuous.
    const mutated = committed.replace("listMachines()", "listMachinez()");
    expect(mutated).not.toBe(documented);
  });
});
