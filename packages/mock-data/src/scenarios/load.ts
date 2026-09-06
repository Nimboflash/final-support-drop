import type { PanelSnapshot } from "@drop/panel-domain";
import { baseWorld } from "../seed/base-world";
import { SCENARIOS_BY_ID } from "./registry";
import type { Scenario, ScenarioResponsePolicy } from "./types";

/**
 * The scenario switcher (AC-P3.5, AC-P3.6).
 *
 * `baseWorld()` already returns a deep copy, so every load starts from a fresh
 * world and no recipe can reach another's state. That is not a nicety: S02 and
 * S03 define the id `p4` incompatibly, so a shared base would make the second
 * load depend on which ran first.
 */
export interface LoadedScenario {
  readonly scenario: Scenario;
  readonly snapshot: PanelSnapshot;
  readonly policy: ScenarioResponsePolicy;
  readonly discoverySeed: number;
}

export class UnknownScenarioError extends Error {
  constructor(id: string) {
    super(`UNKNOWN_SCENARIO: ${id}`);
    this.name = "UnknownScenarioError";
  }
}

/**
 * The sentinel for "no overlay": the seeded base world itself.
 *
 * The base world is the panel's DEFAULT demo state — V2 04 §2's density
 * requirement (6-8 projects across meaningful stages) exists precisely so the
 * panel has something populated to open on. The twenty-four scenarios are
 * OVERLAYS that narrow it to exercise one situation, selected from settings.
 */
export const BASE_WORLD_ID = "BASE";

export function loadScenario(id: string): LoadedScenario {
  if (id === BASE_WORLD_ID) {
    return {
      scenario: {
        id: BASE_WORLD_ID,
        name: "جهان پایهٔ نمایشی",
        acceptanceId: "-",
        setup: "The seeded base world, with no scenario overlay applied.",
        action: "Browse the panel",
        apply: (world) => world,
      },
      snapshot: baseWorld(),
      policy: {},
      discoverySeed: 1,
    };
  }
  const scenario = SCENARIOS_BY_ID.get(id);
  if (scenario === undefined) throw new UnknownScenarioError(id);
  const snapshot = scenario.apply(baseWorld());
  return {
    scenario,
    snapshot: { ...snapshot, discoverySeed: scenario.discoverySeed ?? 1 },
    policy: scenario.policy ?? {},
    discoverySeed: scenario.discoverySeed ?? 1,
  };
}
