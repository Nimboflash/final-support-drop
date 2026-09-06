import {
  BASE_WORLD_ID,
  SCENARIOS,
  createDemoPersistence,
  createFixedClock,
  loadScenario,
  type DemoClock,
  type DemoPersistence,
} from "@drop/mock-data";
import { createMockWorld, type MockWorld } from "@drop/machine-gateway";
import { createBrowserStoragePort } from "./browser-ports";

/**
 * The composition root (AC-P4.1, AC-P4.12).
 *
 * The ONE place the demo world is constructed and the adapters are injected.
 * Everything above this line depends on gateway INTERFACES, never on
 * `@drop/mock-data` — the ESLint zone forbids components importing it, and this
 * module is what makes that restriction livable rather than merely enforced.
 *
 * The seam is the point (18 §12): swapping `createMockWorld` for a real adapter
 * must not require redesigning a single page, and the page-level tests prove it
 * by running against P2's reference stub instead.
 */
/**
 * The panel opens on the seeded base world, not on a scenario overlay: V2 04 §2
 * requires 6-8 projects across meaningful stages so the surfaces have something
 * real to render. The twenty-four scenarios narrow it, and are selected from
 * settings to exercise one situation at a time.
 */
export const DEFAULT_SCENARIO_ID = BASE_WORLD_ID;

export interface DemoSession {
  readonly scenarioId: string;
  readonly world: MockWorld;
  readonly persistence: DemoPersistence;
  readonly clock: DemoClock;
}

export function createDemoSession(scenarioId: string = DEFAULT_SCENARIO_ID): DemoSession {
  const clock = createFixedClock();
  const world = createMockWorld({ scenarioId, clock });
  const persistence = createDemoPersistence(
    createBrowserStoragePort(),
    () => loadScenario(scenarioId).snapshot,
  );
  return { scenarioId, world, persistence, clock };
}

/**
 * The scenario catalogue, re-exported for the settings surface.
 *
 * Surfaces must not import `@drop/mock-data` — the ESLint zone forbids it, and
 * the point of that ban is that a component never depends on fixture SHAPES.
 * A read-only list of scenario ids and descriptions is demo METADATA the
 * settings page legitimately shows, so it crosses here, at the composition
 * root, rather than by widening the zone.
 */
/** Shown for the un-narrowed base world in the scenario picker. */
export const BASE_WORLD_LABEL_FA = "جهان پایهٔ نمایشی";

export interface ScenarioSummary {
  readonly id: string;
  readonly name: string;
  readonly setup: string;
  readonly acceptanceId: string;
}

export function scenarioCatalogue(): readonly ScenarioSummary[] {
  return SCENARIOS.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    setup: scenario.setup,
    acceptanceId: scenario.acceptanceId,
  }));
}
