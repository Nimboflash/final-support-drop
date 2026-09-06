import type { PanelSnapshot } from "@drop/panel-domain";

/**
 * A scenario is a NAMED RECIPE over a fresh deep copy of the base world.
 *
 * V2 04 §1: the pack's scenarios are "declarative fixture recipes and action
 * expectations, not an implemented simulator" — so the English `setup` line is
 * carried verbatim beside the code that implements it, and a reviewer can check
 * one against the other without leaving the file.
 */
export interface ScenarioResponsePolicy {
  /** Simulated latency in ms. Scenario-controlled, never random (V2 04 §2). */
  readonly latencyMs?: number;
  /** The gateway reports the machine system disconnected (18 §7.2.13). */
  readonly disconnected?: true;
  /** The acting demo actor may not mutate (18 §7.2.14; journey A16). */
  readonly forbidden?: true;
  /** A command fails; `retryable` decides whether retrying could ever help. */
  readonly failure?: { readonly code: string; readonly retryable: boolean };
  /** The stored aggregate has already moved past the revision the UI holds. */
  readonly staleRevision?: { readonly aggregateId: string; readonly actual: number };
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  /** The V2 acceptance journey this world supplies fixture state for. */
  readonly acceptanceId: string;
  /** The pack's recipe line, verbatim. */
  readonly setup: string;
  /** The pack's action line, verbatim. */
  readonly action: string;
  /** Applied to a FRESH deep copy; must never capture shared state. */
  readonly apply: (world: PanelSnapshot) => PanelSnapshot;
  readonly policy?: ScenarioResponsePolicy;
  /** Mock discovery seed; S16 overrides the file-level 1 with 2. */
  readonly discoverySeed?: number;
}
