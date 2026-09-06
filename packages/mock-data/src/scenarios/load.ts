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

export function loadScenario(id: string): LoadedScenario {
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
