import {
  BASE_WORLD_ID,
  SCENARIOS,
  createDemoPersistence,
  createFixedClock,
  loadScenario,
  type DemoClock,
  type DemoPersistence,
} from "@drop/mock-data";
import {
  createMockWorld,
  createRealWorld,
  isMachineSessionId,
  type PanelWorld,
} from "@drop/machine-gateway";
import type { PanelSnapshot } from "@drop/panel-domain";
import { createBrowserMachinePort } from "../machine/browser-machine-port";
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

/**
 * Which world the panel is showing (ADR-0021 D5).
 *
 * `MOCK` is the deterministic demo world and the default; absent explicit
 * configuration the panel behaves exactly as it does on `main`. `REAL` reads a
 * live concept-portfolio session over the same-origin proxy.
 */
export type PanelMode = "MOCK" | "REAL";

export interface DemoSession {
  readonly mode: PanelMode;
  readonly scenarioId: string;
  readonly world: PanelWorld;
  readonly persistence: DemoPersistence;
  readonly clock: DemoClock;
  /** How the stored world was read, so Settings can offer Reset on corruption. */
  readonly hydration: "HYDRATED" | "ABSENT" | "UNUSABLE";
  /** In REAL mode, the machine session on screen. Null in MOCK mode. */
  readonly machineSessionId: string | null;
}

export interface DemoSessionOptions {
  readonly scenarioId?: string;
  /**
   * The machine session to show, from server configuration.
   *
   * REAL mode is entered by CONFIGURATION and nothing else (ADR-0021 D5). It
   * was tempting to trigger it from a `?session=` query parameter, and that is
   * broken three ways: the sidebar's links carry no query, so the mode would
   * vanish on the first click; `DemoProviders` is mounted in the studio LAYOUT
   * and a layout does not remount on client navigation, so the URL and the
   * world would disagree; and the server pass has no `window`, so SSR would
   * build the mock world while the client built the real one — a hydration
   * mismatch on every load.
   */
  readonly machineSessionId?: string | null;
}

/**
 * Persistence for REAL mode: refuses, rather than writing.
 *
 * A machine snapshot must never reach the demo browser key, and the danger is
 * not theoretical. `demo-persistence.ts` stamps `snapshotKind` as the MOCK
 * discriminator on whatever it is handed, and validates only that field on the
 * way back in — so one `save()` of machine data would make the *demo* world
 * silently resume from it forever after, with Reset the only way out.
 *
 * An object, never `null`: the settings surface calls `persistence.reset()`
 * without checking, and a null here would be a crash instead of a refusal.
 */
function createRefusingPersistence(): DemoPersistence {
  const refuse = (): never => {
    throw new Error("REAL mode does not persist machine state to the demo key");
  };
  return {
    load: () => ({ outcome: "ABSENT" }),
    save: (_scenarioId: string, _snapshot: PanelSnapshot) => refuse(),
    reset: () => refuse(),
    watchExternal: () => () => {},
  };
}

export function createDemoSession(options: DemoSessionOptions = {}): DemoSession {
  const scenarioId = options.scenarioId ?? DEFAULT_SCENARIO_ID;
  const machineSessionId = options.machineSessionId ?? null;

  if (machineSessionId !== null && isMachineSessionId(machineSessionId)) {
    /*
      A real machine has real time. ADR-0019 D16 fixes the demo clock and
      `determinism.test.ts` keeps `Date.now` out of the contract packages —
      both remain true, because determinism is a property of the MOCK world and
      the clock is injected from here, which is the one place allowed to have
      one.
    */
    const clock: DemoClock = { now: () => new Date().toISOString() };
    const world = createRealWorld({
      sessionId: machineSessionId,
      port: createBrowserMachinePort(),
      now: () => clock.now(),
      workspaceId: "drop-demo",
      ownerId: "actor-guardian",
      /*
        The identity renderer: the machine's words, unchanged.

        ADR-0021 D7 is an OPEN decision — the service answers in English and
        this panel is fa-IR only — and this is the only option that does not
        pre-empt it. Translating here would bury a ruling the owner has not
        made; asking the machine for Persian means editing a vendored service.
        So the collision is left VISIBLE on screen, which is where a person can
        actually judge it. See docs/handoff/P10-machine-wiring.md.
      */
      text: { toFa: (value: string) => value, toEn: (value: string) => value },
    });

    return {
      mode: "REAL",
      scenarioId,
      world,
      persistence: createRefusingPersistence(),
      clock,
      hydration: "ABSENT",
      machineSessionId,
    };
  }

  return createMockSession(scenarioId);
}

function createMockSession(scenarioId: string): DemoSession {
  const clock = createFixedClock();
  const persistence = createDemoPersistence(
    createBrowserStoragePort(),
    () => loadScenario(scenarioId).snapshot,
  );

  /*
    ADR-0019 D2 requires demo state to live in one versioned browser key,
    validated on hydration. The key, the validation and the reset were all
    built — and never wired: the world was rebuilt from the seed on every
    load, so every decision a person made was gone on refresh. The brief's own
    QA scenario asks for a date change to survive a reload, and it could not.

    A stored world is resumed only when it belongs to the SAME scenario.
    Different scenarios are different worlds; resuming one into another would
    show data the chosen scenario never contained.
  */
  const stored = persistence.load();
  const resumable =
    stored.outcome === "HYDRATED" && stored.scenarioId === scenarioId
      ? stored.snapshot
      : undefined;

  const world = createMockWorld({ scenarioId, clock, snapshot: resumable });
  return {
    mode: "MOCK",
    scenarioId,
    world,
    persistence,
    clock,
    hydration: stored.outcome,
    machineSessionId: null,
  };
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
