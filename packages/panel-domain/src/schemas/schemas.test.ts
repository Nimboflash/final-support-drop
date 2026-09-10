import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as panelDomain from "../index";
import { VALID_FIXTURES, INVALID_FIXTURES } from "../fixtures/index";

/**
 * Seam A — the panel contract freeze (AC-P2.1).
 *
 * Every exported schema carries at least one accepting fixture and at least one
 * rejecting fixture; every rejecting fixture cites the rule it violates and has
 * that rejection asserted. The registry-completeness test below makes "every
 * exported schema" mechanical rather than a promise: adding a schema without
 * fixtures fails this suite.
 */

/** Every `*Schema` export of the package, discovered rather than hand-listed. */
function exportedSchemaNames(): string[] {
  return Object.entries(panelDomain)
    .filter(([name, value]) => name.endsWith("Schema") && value instanceof z.ZodType)
    .map(([name]) => name)
    .sort();
}

describe("fixture coverage (AC-P2.1)", () => {
  it("every exported schema has an accepting fixture", () => {
    const missing = exportedSchemaNames().filter((n) => !(n in VALID_FIXTURES));
    expect(missing, `schemas without an accepting fixture: ${missing.join(", ")}`).toEqual([]);
  });

  it("every exported schema has at least one rejecting fixture", () => {
    const covered = new Set(INVALID_FIXTURES.map((f) => f.schemaName));
    const missing = exportedSchemaNames().filter((n) => !covered.has(n));
    expect(missing, `schemas without a rejecting fixture: ${missing.join(", ")}`).toEqual([]);
  });

  it("the package exports a non-trivial number of schemas", () => {
    // Guards against the coverage tests above passing vacuously if the barrel
    // stops re-exporting the schema modules.
    expect(exportedSchemaNames().length).toBeGreaterThanOrEqual(20);
  });
});

describe("accepting fixtures parse", () => {
  for (const [name, entry] of Object.entries(VALID_FIXTURES)) {
    it(`${name} accepts its valid fixture`, () => {
      const result = entry.schema.safeParse(entry.value);
      expect(
        result.success,
        result.success ? "" : JSON.stringify(result.error.issues, null, 2),
      ).toBe(true);
    });
  }
});

describe("rejecting fixtures reject for the cited reason", () => {
  for (const fixture of INVALID_FIXTURES) {
    it(`${fixture.schemaName} rejects: ${fixture.rule}`, () => {
      const result = fixture.schema.safeParse(fixture.value);
      expect(result.success, `expected rejection for rule "${fixture.rule}"`).toBe(false);
      if (result.success) return;

      // The rejection must land where the fixture says it does — a fixture that
      // rejects for an unrelated reason (a typo, a missing sibling field) proves
      // nothing about the rule it cites.
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      if (fixture.expectPath !== undefined) {
        expect(
          issuePaths,
          `rule "${fixture.rule}" expected an issue at path "${fixture.expectPath}", got ${JSON.stringify(issuePaths)}`,
        ).toContain(fixture.expectPath);
      }
      if (fixture.expectMessage !== undefined) {
        const messages = result.error.issues.map((i) => i.message).join(" | ");
        expect(messages).toContain(fixture.expectMessage);
      }
    });
  }

  it("every rejecting fixture cites a non-empty rule", () => {
    for (const fixture of INVALID_FIXTURES) {
      expect(fixture.rule.length, `${fixture.schemaName} fixture has an empty rule`).toBeGreaterThan(0);
    }
  });
});

describe("error codes are stable English identifiers (10 §2; P2 failure_states)", () => {
  it("no schema emits a Persian message — Persian presentation is the UI's concern", () => {
    const persian = /[؀-ۿ]/;
    for (const fixture of INVALID_FIXTURES) {
      const result = fixture.schema.safeParse(fixture.value);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        expect(
          persian.test(issue.message),
          `${fixture.schemaName}: "${issue.message}" contains Persian text`,
        ).toBe(false);
      }
    }
  });
});
