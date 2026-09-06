import { describe, expect, it } from "vitest";
import { ConformanceViolation } from "./index";
import { createReviewPathConformanceSuite } from "./review-path";
import {
  createReviewReferenceWorld,
  type ReviewWorldBreakage,
} from "./review-reference-world";

/**
 * Adapter-contract seam for the review path (AC-P2.20, AC-P2.25).
 *
 * Same two halves as the MachineGateway suite: green against a conformant
 * world, red against each committed break — and each break paired with the
 * unbroken control, so a red result is attributable to that break and not to
 * some unrelated defect in the stub.
 */
const FIXED_NOW = "2026-09-06T12:00:00Z";
const fixedClock = () => FIXED_NOW;

function suiteFor(breakage?: ReviewWorldBreakage) {
  return createReviewPathConformanceSuite({
    name: breakage === undefined ? "review-reference-world" : "broken-world",
    createWorld: () => Promise.resolve(createReviewReferenceWorld({ now: fixedClock, breakage })),
  });
}

describe("the review-path suite runs green against the reference world", () => {
  const cases = suiteFor();

  it("covers every ADR-0019 D19 review invariant", () => {
    expect(cases.length).toBeGreaterThanOrEqual(6);
  });

  for (const testCase of cases) {
    it(testCase.name, async () => {
      await testCase.run();
    });
  }
});

describe("the suite fails against each committed break (AC-P2.25)", () => {
  const BREAKS: readonly {
    breakage: ReviewWorldBreakage;
    caseNeedle: string;
    expected: RegExp;
    why: string;
  }[] = [
    {
      breakage: "SECOND_DECISION_WRITE_PATH",
      caseNeedle: "ONLY decision path",
      expected: /SECOND decision write path exists/,
      why:
        "ADR-0013 D1 — the approval endpoint is the only write path. This is the one " +
        "mechanical proof of it inside the panel.",
    },
    {
      breakage: "COERCES_NULL_REASON",
      caseNeedle: "null reason is rejected",
      expected: /must fail closed BEFORE transport/,
      why:
        "ADR-0019 D5 — an empty reason looks like a real justification in the audit trail, " +
        "so it must be refused rather than coerced.",
    },
    {
      breakage: "IGNORES_IDEMPOTENCY",
      caseNeedle: "same commandId twice",
      expected: /recorded a second decision/,
      why: "V2 03 §4 — repeating a commandId returns the original receipt and repeats no effect.",
    },
    {
      breakage: "REVISION_MUTATES_HISTORY",
      caseNeedle: "leaves prior versions byte-identical",
      expected: /mutated a prior version/,
      why: "V2 01 §8 — version content is immutable; a revision appends, never overwrites.",
    },
  ];

  for (const { breakage, caseNeedle, expected, why } of BREAKS) {
    it(`catches ${breakage} — ${why}`, async () => {
      const broken = suiteFor(breakage).find((c) => c.name.includes(caseNeedle));
      expect(broken, `the "${caseNeedle}" case must exist`).toBeDefined();
      await expect(broken!.run()).rejects.toThrow(ConformanceViolation);
      await expect(broken!.run()).rejects.toThrow(expected);
    });

    it(`and the same case passes unbroken — ${breakage}`, async () => {
      const control = suiteFor().find((c) => c.name.includes(caseNeedle));
      await expect(control!.run()).resolves.toBeUndefined();
    });
  }
});
