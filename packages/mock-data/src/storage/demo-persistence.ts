import { panelSnapshotSchema, type PanelSnapshot } from "@drop/panel-domain";
import {
  DEMO_SNAPSHOT_KIND,
  type DemoStoragePort,
  type HydrationResult,
} from "../ports";

/**
 * Demo persistence (AC-P3.9; ADR-0019 D2).
 *
 * V2 03 §6: one versioned key, seeded on first load, validated on hydration,
 * and "Corrupt/old data offers Reset Demo with confirmation instead of
 * crashing."
 *
 * Two rules this module exists to keep:
 *
 *  1. **Reset must work WITHOUT a valid snapshot.** That is the whole point:
 *     the escape hatch cannot depend on the thing that is broken. `reset()`
 *     clears the key and returns a freshly built world, never reading what was
 *     stored.
 *  2. **No silent last-write-wins.** An external change at a HIGHER revision is
 *     surfaced, not overwritten; the caller decides whether to re-hydrate or
 *     show a refresh notice (V2 03 §6).
 *
 * What is never written: file bytes, secrets or credentials. The snapshot holds
 * metadata and short sample text only — reference metadata persists, raw file
 * bytes do not (V2 01 §3).
 */

export interface PersistedEnvelope {
  readonly snapshotKind: typeof DEMO_SNAPSHOT_KIND;
  readonly schemaVersion: string;
  readonly scenarioId: string;
  readonly snapshot: PanelSnapshot;
}

export function serialize(scenarioId: string, snapshot: PanelSnapshot): string {
  return JSON.stringify({
    snapshotKind: DEMO_SNAPSHOT_KIND,
    schemaVersion: snapshot.schemaVersion,
    scenarioId,
    snapshot,
  } satisfies PersistedEnvelope);
}

export function hydrate(payload: string | null): HydrationResult {
  if (payload === null) return { outcome: "ABSENT" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { outcome: "UNUSABLE", reasonCode: "NOT_JSON" };
  }

  const envelope = parsed as Partial<PersistedEnvelope>;
  // Checked BEFORE schema validation: a payload from an older demo schema is a
  // different failure from a corrupt one, and the UI says so.
  if (envelope.snapshotKind !== DEMO_SNAPSHOT_KIND) {
    return { outcome: "UNUSABLE", reasonCode: "WRONG_SNAPSHOT_KIND" };
  }

  const result = panelSnapshotSchema.safeParse(envelope.snapshot);
  if (!result.success) return { outcome: "UNUSABLE", reasonCode: "SCHEMA_INVALID" };
  return { outcome: "HYDRATED", snapshot: result.data };
}

export interface DemoPersistence {
  load(): HydrationResult;
  save(scenarioId: string, snapshot: PanelSnapshot): void;
  /** Clears the key and returns a fresh world. Never reads what was stored. */
  reset(): PanelSnapshot;
  /** Fires when another tab writes. Never applied silently. */
  watchExternal(listener: (change: ExternalChange) => void): () => void;
}

export type ExternalChange =
  | { readonly kind: "REHYDRATABLE"; readonly snapshot: PanelSnapshot }
  /** Newer state exists but could not be read; the UI shows a refresh notice. */
  | { readonly kind: "REFRESH_REQUIRED"; readonly reasonCode: string }
  | { readonly kind: "CLEARED" };

export function createDemoPersistence(
  storage: DemoStoragePort,
  buildFresh: () => PanelSnapshot,
): DemoPersistence {
  return {
    load: () => hydrate(storage.read()),

    save(scenarioId, snapshot) {
      storage.write(serialize(scenarioId, snapshot));
    },

    reset() {
      storage.clear();
      return buildFresh();
    },

    watchExternal(listener) {
      return storage.onExternalChange((payload) => {
        if (payload === null) {
          listener({ kind: "CLEARED" });
          return;
        }
        const result = hydrate(payload);
        listener(
          result.outcome === "HYDRATED"
            ? { kind: "REHYDRATABLE", snapshot: result.snapshot }
            : {
                kind: "REFRESH_REQUIRED",
                reasonCode: result.outcome === "ABSENT" ? "ABSENT" : result.reasonCode,
              },
        );
      });
    },
  };
}

/** An in-memory port for tests; `apps/web` supplies the browser-backed one. */
export function createInMemoryStorage(initial: string | null = null): DemoStoragePort & {
  simulateExternalWrite(payload: string | null): void;
} {
  let value = initial;
  const listeners = new Set<(payload: string | null) => void>();
  return {
    read: () => value,
    write(payload) {
      value = payload;
    },
    clear() {
      value = null;
    },
    onExternalChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    simulateExternalWrite(payload) {
      value = payload;
      for (const listener of listeners) listener(payload);
    },
  };
}
