import type { PanelSnapshot } from "@drop/panel-domain";
import { normalizeSeed } from "./normalize";
import { roleForDemoRoleString } from "./demo-profiles";
import { expandDensity } from "./density";
import { deepClone } from "../repository/deep-clone";

/**
 * The base demo world: the V2 seed, normalized, then expanded to the density
 * V2 04 §2 requires.
 *
 * Built once and cached, then handed out as a DEEP COPY. Every scenario overlays
 * a fresh copy (V2 04 §1: "Each scenario overlays a fresh deep copy of the base
 * state; never share mutable fixture objects across scenarios"), and sharing the
 * cached object would let one scenario's mutation leak into the next — the exact
 * defect AC-P3.6 exists to catch.
 */
let cached: PanelSnapshot | null = null;

export function baseWorld(): PanelSnapshot {
  cached ??= expandDensity(normalizeSeed(roleForDemoRoleString));
  return deepClone(cached);
}

/** Test hook: forces a rebuild so a cache bug cannot hide behind a warm cache. */
export function resetBaseWorldCache(): void {
  cached = null;
}
