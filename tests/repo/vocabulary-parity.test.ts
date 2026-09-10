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

describe("approval states: the recorded P2 divergence, now closed", () => {
  /**
   * HISTORY. Ticket P2 found that `packages/ui`'s `APPROVAL_STATES` omitted
   * `REJECTED`, which ADR-0013 D2 lists in the decision set and ADR-0012 D1
   * gives a stage transition for (WAITING_FOR_APPROVAL + REJECTED →
   * FAILED_FINAL). A rejected approval therefore had no badge at all.
   *
   * P2 could not repair it: `packages/ui` was outside its files_owned and P1's
   * component API was frozen. So P2 pinned the divergence and left a note
   * saying the repair belonged to whichever ticket owned the badge.
   *
   * P1-R owns it (ADR-0019 D14, AC-P1R.9). The gap is closed and this test now
   * asserts the parity it used to assert the absence of.
   */
  it("packages/ui carries the full ADR-0013 D2 decision set plus PENDING", () => {
    const ui = extractArray(uiSource, "APPROVAL_STATES", "packages/ui");
    expect(ui).toEqual(["PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "ESCALATED"]);
  });

  it("panel-domain does carry REJECTED, per ADR-0013 D2", () => {
    expect(extractArray(panelSource, "APPROVAL_DECISIONS", "packages/panel-domain")).toContain(
      "REJECTED",
    );
  });

  it("every ADR-0013 decision has a packages/ui presentation state", () => {
    const ui = extractArray(uiSource, "APPROVAL_STATES", "packages/ui");
    for (const decision of extractArray(panelSource, "APPROVAL_DECISIONS", "packages/panel-domain")) {
      expect(ui, `decision ${decision} needs a badge`).toContain(decision);
    }
  });
});

describe("the V2 card review axis is additive, not a replacement (ADR-0019 D5)", () => {
  it("REVIEW_STATUSES is exactly the recorded five", () => {
    expect(extractArray(uiSource, "REVIEW_STATUSES", "packages/ui")).toEqual([
      "DRAFT", "IN_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED",
    ]);
  });

  it("it does not disturb APPROVAL_STATES, which stays the decision vocabulary", () => {
    const review = extractArray(uiSource, "REVIEW_STATUSES", "packages/ui");
    const approval = extractArray(uiSource, "APPROVAL_STATES", "packages/ui");
    // The two axes overlap on APPROVED/REJECTED by design, but the review axis
    // must never acquire a decision-only member: CHANGES_REQUESTED is what a
    // reviewer SUBMITS, REVISION_REQUESTED is what the card then SHOWS.
    expect(review).not.toContain("CHANGES_REQUESTED");
    expect(review).not.toContain("ESCALATED");
    expect(approval).not.toContain("REVISION_REQUESTED");
    expect(approval).not.toContain("IN_REVIEW");
  });

  it("freshness is a separate axis and never a review status (V2 01 §8)", () => {
    const freshness = extractArray(uiSource, "FRESHNESS_STATES", "packages/ui");
    expect(freshness).toEqual(["CURRENT", "STALE"]);
    const review = extractArray(uiSource, "REVIEW_STATUSES", "packages/ui");
    for (const value of freshness) expect(review).not.toContain(value);
  });
});
