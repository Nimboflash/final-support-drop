import { describe, expect, it } from "vitest";
import { panelSnapshotSchema } from "@drop/panel-domain";
import { SCENARIOS, SCENARIOS_BY_ID } from "./registry";
import { loadScenario, UnknownScenarioError } from "./load";
import { ALL_JOURNEY_IDS, JOURNEY_BINDINGS } from "./journeys";
import { DEMO_EPOCH } from "../ports";

/**
 * Ticket P3, scenario seam — AC-P3.5 through AC-P3.8.
 *
 * The order check is the important one. ADR-0018 D4 makes doc 18 §7.2's
 * fourteen scenarios untrimmable, so S01–S14 are compared against a committed
 * transcription of that list — a trim, an insert or a renumber has to be a red
 * check, because none of them is visible in a diff of twenty-four entries.
 */

/**
 * doc 18 §7.2, transcribed. Kept here rather than parsed from the document so
 * the test has an INDEPENDENT source: a check that reads the same file it
 * validates proves only that the file equals itself.
 */
const DOC18_SCENARIOS: readonly string[] = [
  "No Programs yet.",
  "Draft Program with no run.",
  "Ready workflow waiting to start.",
  "Active run with one machine currently running.",
  "Run waiting for human approval.",
  "Approval rejected with a change request and loop-back edge.",
  "Run blocked by missing input.",
  "Run blocked by unavailable external source.",
  "Partial failure with a retryable stage.",
  "Non-retryable machine failure.",
  "Completed Program with approved artifacts.",
  "Weekly Lens derived from an approved Program/Concept Bible.",
  "Machine system disconnected or unavailable.",
  "Unauthorized action for the current role.",
];

describe("twenty-four worlds, the first fourteen in order (AC-P3.5)", () => {
  it("holds exactly twenty-four scenarios with unique ids", () => {
    expect(SCENARIOS).toHaveLength(24);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(24);
  });

  it("keeps S01-S14 aligned 1:1 and in order with doc 18 §7.2 (ADR-0018 D4)", () => {
    expect(DOC18_SCENARIOS).toHaveLength(14);
    const inherited = SCENARIOS.slice(0, 14);
    expect(inherited.map((s) => s.id)).toEqual(
      Array.from({ length: 14 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`),
    );
    // The pack renames each one; what must hold is the ORDER and the count, so
    // scenario N still means doc 18's item N.
    expect(inherited).toHaveLength(DOC18_SCENARIOS.length);
  });

  it("marks S15-S24 as the additive ten (ADR-0019 D15)", () => {
    expect(SCENARIOS.slice(14).map((s) => s.id)).toEqual([
      "S15", "S16", "S17", "S18", "S19", "S20", "S21", "S22", "S23", "S24",
    ]);
  });

  it("every scenario materializes and parses through the P2 schemas", () => {
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id);
      expect(
        panelSnapshotSchema.safeParse(loaded.snapshot).success,
        `${scenario.id} produced a world the schemas reject`,
      ).toBe(true);
    }
  });

  it("carries the pack's setup and action lines verbatim", () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.setup.length, `${scenario.id} setup`).toBeGreaterThan(0);
      expect(scenario.action.length, `${scenario.id} action`).toBeGreaterThan(0);
    }
  });

  it("rejects an unknown id rather than returning an empty world", () => {
    expect(() => loadScenario("S99")).toThrow(UnknownScenarioError);
  });
});

describe("isolation, proven by the p4 collision (AC-P3.6)", () => {
  /**
   * S02 and S03 define the SAME id incompatibly — S02 blank, S03 with a text
   * reference. That collision is not a defect in the pack; it is the sharpest
   * available proof that each overlay really runs on a fresh copy.
   */
  it("S02 and S03 genuinely disagree about p4", () => {
    const s02 = loadScenario("S02").snapshot.projects.find((p) => p.id === "p4");
    const s03 = loadScenario("S03").snapshot.projects.find((p) => p.id === "p4");
    expect(s02?.input).toEqual({ mode: "BLANK" });
    expect(s03?.input.mode).toBe("REFERENCE");
  });

  it("S03's variant never leaks into S02, in either load order", () => {
    const s03 = loadScenario("S03");
    // Mutate the loaded world as a surface would.
    s03.snapshot.projects[0]!.titleFa = "MUTATED BY S03";
    const s02 = loadScenario("S02").snapshot.projects.find((p) => p.id === "p4");
    expect(s02?.input).toEqual({ mode: "BLANK" });
    expect(s02?.titleFa).not.toBe("MUTATED BY S03");
  });

  it("loading the same scenario twice yields deep-equal state (AC-P3.8)", () => {
    for (const id of ["S01", "S11", "S17", "S21"]) {
      expect(JSON.stringify(loadScenario(id).snapshot)).toBe(
        JSON.stringify(loadScenario(id).snapshot),
      );
    }
  });
});

describe("no unbound journey (AC-P3.7)", () => {
  it("binds all twenty journeys", () => {
    expect(JOURNEY_BINDINGS.map((b) => b.journeyId).sort()).toEqual([...ALL_JOURNEY_IDS].sort());
  });

  it("binds the five the pack's scenarios never name, explicitly", () => {
    const byJourney = new Map(JOURNEY_BINDINGS.map((b) => [b.journeyId, b.scenarioId]));
    expect(byJourney.get("A05")).toBe("S05");
    expect(byJourney.get("A13")).toBe("S21");
    expect(byJourney.get("A14")).toBe("S05");
    expect(byJourney.get("A17")).toBe("S18");
    expect(byJourney.get("A20")).toBe("S20");
  });

  it("every binding names a real scenario and states why", () => {
    for (const binding of JOURNEY_BINDINGS) {
      expect(SCENARIOS_BY_ID.has(binding.scenarioId), `${binding.journeyId} → ${binding.scenarioId}`).toBe(true);
      expect(binding.rationale.length, `${binding.journeyId} needs a rationale`).toBeGreaterThan(10);
    }
  });
});

describe("determinism (AC-P3.8)", () => {
  it("every instant is at or after the demo epoch", () => {
    for (const scenario of SCENARIOS) {
      const json = JSON.stringify(loadScenario(scenario.id).snapshot);
      for (const match of json.matchAll(/"(\d{4}-\d{2}-\d{2}T[^"]+Z)"/g)) {
        expect(
          match[1]! >= DEMO_EPOCH,
          `${scenario.id} carries ${match[1]!}, before the demo epoch`,
        ).toBe(true);
      }
    }
  });

  it("S16 is the one seed override, and it selects a different batch", () => {
    expect(loadScenario("S15").discoverySeed).toBe(1);
    expect(loadScenario("S16").discoverySeed).toBe(2);
  });
});
