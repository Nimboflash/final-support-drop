import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Seam F — drift guard between the two transcriptions of one vocabulary.
 *
 * P1 froze the presentation vocabulary in `packages/ui`; its header records
 * that "P2's panel-domain DTOs pin equality against these at its contract
 * seam". Both packages transcribe the same ADRs *independently*, which is
 * exactly where a silent one-character divergence survives review and then
 * splits the rendered badge from the DTO behind it.
 *
 * The comparison is static text on both sides, deliberately:
 *  - `packages/ui` is a React package, so importing it into a panel-domain test
 *    would breach the P2 boundary zone that keeps the contract packages free of
 *    React (18 §6);
 *  - this check lives at repo level because it is about two packages agreeing,
 *    which is neither package's private business.
 *
 * The chain this completes: ADR → panel-domain constants (pinned at runtime by
 * `vocabulary.test.ts`'s exact-membership tests) → packages/ui (pinned here).
 */

const ROOT = join(__dirname, "..", "..");
const UI_VOCABULARY = join(ROOT, "packages", "ui", "src", "components", "drop", "vocabulary.ts");
const PANEL_VOCABULARY_DIR = join(ROOT, "packages", "panel-domain", "src", "vocabulary");

function readPanelVocabularySource(): string {
  return readdirSync(PANEL_VOCABULARY_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(PANEL_VOCABULARY_DIR, f), "utf8"))
    .join("\n");
}

/** Extracts `export const NAME = [ "A", "B" ] as const;` from a source string. */
function extractArray(source: string, name: string, where: string): string[] {
  const match = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`).exec(source);
  expect(match, `${where} no longer exports ${name}`).not.toBeNull();
  return [...match![1]!.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]!);
}

const uiSource = readFileSync(UI_VOCABULARY, "utf8");
const panelSource = readPanelVocabularySource();

describe("packages/ui and packages/panel-domain transcribe the same vocabulary", () => {
  const SHARED = [
    "STAGE_STATUSES",
    "RUN_STATUSES",
    "PROJECT_STATUSES",
    "PROGRAM_STATUSES",
    "LENS_STATUSES",
    "REQUEST_STATUSES",
    "CALENDAR_ITEM_STATUSES",
    "ACTOR_ROLES",
  ];

  for (const name of SHARED) {
    it(`${name} is identical in both packages`, () => {
      const ui = extractArray(uiSource, name, "packages/ui");
      const panel = extractArray(panelSource, name, "packages/panel-domain");
      expect(ui.length, `${name} extracted empty from packages/ui`).toBeGreaterThan(0);
      expect(panel).toEqual(ui);
    });
  }

  it("the extractor is real — it does not match a name that is absent", () => {
    // Without this, a typo in a SHARED entry would make every comparison above
    // compare two empty arrays and pass.
    const match = /export const NOT_A_REAL_VOCABULARY = \[/.exec(panelSource);
    expect(match).toBeNull();
  });
});

describe("recorded divergence: approval states (ticket P2 finding)", () => {
  /**
   * FINDING, reported in the P2 handoff rather than repaired here.
   *
   * `packages/ui`'s `APPROVAL_STATES` is
   * PENDING|APPROVED|CHANGES_REQUESTED|ESCALATED — it omits `REJECTED`, which
   * ADR-0013 D2 lists in the decision set and which ADR-0012 D1 gives a stage
   * transition for (WAITING_FOR_APPROVAL + REJECTED → FAILED_FINAL, the
   * `rejection_behavior` terminal case). panel-domain's
   * `APPROVAL_REQUEST_STATES` includes it, so a rejected approval has no badge
   * today.
   *
   * P1's component API is frozen and `packages/ui` is outside P2's files_owned,
   * so this pins the divergence instead of silently patching it. Repair belongs
   * to the ticket that owns the badge (P4, or P7's hardening pass). When someone
   * fixes packages/ui, this test fails and points them at this note — intended.
   */
  it("packages/ui still omits REJECTED — the gap is recorded, not silently patched", () => {
    const ui = extractArray(uiSource, "APPROVAL_STATES", "packages/ui");
    expect(ui).toEqual(["PENDING", "APPROVED", "CHANGES_REQUESTED", "ESCALATED"]);
    expect(ui).not.toContain("REJECTED");
  });

  it("panel-domain does carry REJECTED, per ADR-0013 D2", () => {
    expect(extractArray(panelSource, "APPROVAL_DECISIONS", "packages/panel-domain")).toContain(
      "REJECTED",
    );
  });
});
