import type { PanelSnapshot } from "@drop/panel-domain";

/**
 * The two ports the demo world is injected with (ticket P3; ADR-0019 D2, D16).
 *
 * Both are interfaces rather than implementations because `packages/mock-data`
 * is transport-free: `tsconfig.base.json` pins `"lib": ["ES2023"]`, so this
 * package cannot name `localStorage` or `setTimeout` even if it wanted to.
 * `apps/web` supplies the browser-backed implementations, and the tests supply
 * in-memory ones. That split is what keeps the determinism guarantee checkable.
 */

/**
 * ADR-0019 D16 — the injected clock. Fixed at the demo epoch.
 *
 * `Date.now` is unreachable from this package by construction, and
 * `tests/repo/determinism.test.ts` proves it stays that way. Every timestamp in
 * a materialized world comes from here.
 */
export interface DemoClock {
  now(): string;
}

export const DEMO_EPOCH = "2026-09-06T09:00:00Z";

/** The only clock the demo ever needs: it does not advance on its own. */
export function createFixedClock(at: string = DEMO_EPOCH): DemoClock {
  let current = at;
  return {
    now: () => current,
    // Advancing is an explicit act, never a side effect of reading.
    advanceTo(next: string) {
      current = next;
    },
  } as DemoClock & { advanceTo(next: string): void };
}

/**
 * ADR-0019 D2 — demo state persists in exactly ONE versioned browser key.
 *
 * The key itself lives with the browser implementation in `apps/web`; this
 * package only knows the discriminator it must find inside the payload, so a
 * snapshot written by an older schema is detected rather than half-read.
 */
export const DEMO_STORAGE_KEY = "drop-panel-demo-v2";
export const DEMO_SNAPSHOT_KIND = "drop.panel.mock.v2";

export interface DemoStoragePort {
  /** Returns the raw stored payload, or null when nothing is stored. */
  read(): string | null;
  write(payload: string): void;
  clear(): void;
  /**
   * V2 03 §6 — two tabs "either synchronize revisions via storage events or show
   * a refresh notice; avoid silent last-write wins". The port surfaces the
   * external change; the repository decides what to do about it.
   */
  onExternalChange(listener: (payload: string | null) => void): () => void;
}

/** The result of trying to hydrate stored demo state. */
export type HydrationResult =
  | {
      readonly outcome: "HYDRATED";
      readonly snapshot: PanelSnapshot;
      /**
       * Which world was stored. A snapshot saved under one scenario must not be
       * resumed into another — the scenarios are different worlds, and mixing
       * them would show data the chosen scenario never contained.
       */
      readonly scenarioId: string;
    }
  | { readonly outcome: "ABSENT" }
  /**
   * Corrupt, truncated, or written by an incompatible schema. V2 03 §6:
   * "Corrupt/old data offers Reset Demo with confirmation instead of crashing."
   * The reason is carried so the UI can say which of the three it was.
   */
  | { readonly outcome: "UNUSABLE"; readonly reasonCode: HydrationFailureCode };

export const HYDRATION_FAILURE_CODES = [
  "NOT_JSON",
  "WRONG_SNAPSHOT_KIND",
  "SCHEMA_INVALID",
] as const;
export type HydrationFailureCode = (typeof HYDRATION_FAILURE_CODES)[number];
