import { describe, expect, it } from "vitest";
import { createGatewayConformanceSuite, ConformanceViolation } from "./index";
import { createReferenceStub, REFERENCE_STUB_FIXTURES } from "./reference-stub";

/**
 * Adapter-contract seam (AC-P2.7).
 *
 * Two halves, and both matter:
 *  1. the suite runs GREEN against the minimal reference stub — proving it is
 *     runnable and that a conformant adapter passes;
 *  2. the suite FAILS against committed broken stubs, each breaking exactly one
 *     contract rule — proving the suite can fail, for the specified reason.
 *
 * Without (2) a green suite would prove nothing (testing-strategy §1.1: a test
 * that cannot fail is not a test).
 */

/** 18 §7 — a controllable clock; the stub mints every timestamp from it. */
const FIXED_NOW = "2026-09-06T12:00:00Z";
const fixedClock = () => FIXED_NOW;

describe("the conformance suite runs green against the reference stub", () => {
  const cases = createGatewayConformanceSuite({
    name: "reference-stub",
    createGateway: () => createReferenceStub({ now: fixedClock }),
    fixtures: REFERENCE_STUB_FIXTURES,
  });

  it("exposes a non-trivial number of cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(15);
  });

  for (const testCase of cases) {
    it(testCase.name, async () => {
      await testCase.run();
    });
  }
});

describe("the conformance suite fails against the broken stubs (AC-P2.7)", () => {
  /**
   * Break 1 — 18 §7.3: "Pause run: update the mock state and append an audit
   * event." A stub that accepts the command but appends nothing is exactly the
   * silent-no-op the panel must never present as a real state change (18 §12).
   */
  it("catches a pauseRun that appends no audit event", async () => {
    const cases = createGatewayConformanceSuite({
      name: "broken-stub",
      createGateway: () =>
        createReferenceStub({ now: fixedClock, breakage: "PAUSE_APPENDS_NO_AUDIT_EVENT" }),
      fixtures: REFERENCE_STUB_FIXTURES,
    });
    const pauseCase = cases.find((c) => c.name.includes("pauseRun appends an audit event"));
    expect(pauseCase, "the pauseRun case must exist in the suite").toBeDefined();

    await expect(pauseCase!.run()).rejects.toThrow(ConformanceViolation);
    await expect(pauseCase!.run()).rejects.toThrow(/produced no new audit event/);
  });

  /**
   * Break 2 — P2 failure_states: "Gateway methods reject unknown ids ... with
   * the typed error model, never undefined or silent nulls."
   */
  it("catches an unknown id that resolves undefined instead of throwing", async () => {
    const cases = createGatewayConformanceSuite({
      name: "broken-stub",
      createGateway: () =>
        createReferenceStub({ now: fixedClock, breakage: "UNKNOWN_ID_RESOLVES_UNDEFINED" }),
      fixtures: REFERENCE_STUB_FIXTURES,
    });
    const unknownIdCase = cases.find((c) =>
      c.name.includes("getWorkflowDefinition throws UNKNOWN_ID"),
    );
    expect(unknownIdCase, "the unknown-id case must exist in the suite").toBeDefined();

    await expect(unknownIdCase!.run()).rejects.toThrow(ConformanceViolation);
    await expect(unknownIdCase!.run()).rejects.toThrow(
      /must never resolve to undefined or a silent null/,
    );
  });

  it("the same two cases pass against the unbroken stub", async () => {
    // Proves each break — not some unrelated defect in the stub — is what the
    // suite caught above.
    const cases = createGatewayConformanceSuite({
      name: "reference-stub",
      createGateway: () => createReferenceStub({ now: fixedClock }),
      fixtures: REFERENCE_STUB_FIXTURES,
    });
    for (const needle of [
      "pauseRun appends an audit event",
      "getWorkflowDefinition throws UNKNOWN_ID",
    ]) {
      const found = cases.find((c) => c.name.includes(needle));
      await expect(found!.run()).resolves.toBeUndefined();
    }
  });
});
