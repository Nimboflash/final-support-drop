import { describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY, DEMO_SNAPSHOT_KIND } from "../ports";
import { baseWorld } from "../seed/base-world";
import {
  createDemoPersistence,
  createInMemoryStorage,
  hydrate,
  serialize,
} from "./demo-persistence";

/** Ticket P3, persistence seam — AC-P3.9. */
describe("demo persistence (AC-P3.9)", () => {
  it("round-trips a snapshot under the one versioned key", () => {
    expect(DEMO_STORAGE_KEY).toBe("drop-panel-demo-v2");
    const world = baseWorld();
    const result = hydrate(serialize("S11", world));
    expect(result.outcome).toBe("HYDRATED");
    if (result.outcome !== "HYDRATED") return;
    expect(JSON.stringify(result.snapshot)).toBe(JSON.stringify(world));
  });

  it("carries the snapshotKind discriminator", () => {
    const envelope = JSON.parse(serialize("S11", baseWorld())) as { snapshotKind: string };
    expect(envelope.snapshotKind).toBe(DEMO_SNAPSHOT_KIND);
  });

  it("distinguishes the three ways stored state can be unusable", () => {
    expect(hydrate(null).outcome).toBe("ABSENT");

    const corrupt = hydrate("{not json");
    expect(corrupt).toEqual({ outcome: "UNUSABLE", reasonCode: "NOT_JSON" });

    // An older demo schema is a DIFFERENT failure from corruption, and the UI
    // says which — hence the kind check before schema validation.
    const oldKind = hydrate(JSON.stringify({ snapshotKind: "drop.panel.mock.v1", snapshot: {} }));
    expect(oldKind).toEqual({ outcome: "UNUSABLE", reasonCode: "WRONG_SNAPSHOT_KIND" });

    const invalid = hydrate(
      JSON.stringify({ snapshotKind: DEMO_SNAPSHOT_KIND, snapshot: { projects: "nope" } }),
    );
    expect(invalid).toEqual({ outcome: "UNUSABLE", reasonCode: "SCHEMA_INVALID" });
  });

  it("resets without a valid snapshot, which is the whole point of the escape hatch", () => {
    const storage = createInMemoryStorage("{not json");
    const persistence = createDemoPersistence(storage, baseWorld);
    // Reset must not depend on reading the thing that is broken.
    const fresh = persistence.reset();
    expect(fresh.projects).toHaveLength(7);
    expect(storage.read()).toBeNull();
  });

  it("reproduces the identical batch sequence after a reset", () => {
    const storage = createInMemoryStorage();
    const persistence = createDemoPersistence(storage, baseWorld);
    const first = persistence.reset();
    const second = persistence.reset();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.discoverySeed).toBe(first.discoverySeed);
  });

  it("surfaces an external change instead of silently overwriting it", () => {
    const storage = createInMemoryStorage();
    const persistence = createDemoPersistence(storage, baseWorld);
    const seen: string[] = [];
    const stop = persistence.watchExternal((change) => seen.push(change.kind));

    const other = baseWorld();
    other.revision = 99;
    storage.simulateExternalWrite(serialize("S11", other));
    expect(seen).toEqual(["REHYDRATABLE"]);

    storage.simulateExternalWrite("{corrupt");
    expect(seen).toEqual(["REHYDRATABLE", "REFRESH_REQUIRED"]);

    storage.simulateExternalWrite(null);
    expect(seen).toEqual(["REHYDRATABLE", "REFRESH_REQUIRED", "CLEARED"]);

    stop();
    storage.simulateExternalWrite(serialize("S11", other));
    expect(seen).toHaveLength(3);
  });

  it("writes no file bytes, secret or credential", () => {
    const payload = serialize("S16", baseWorld());
    // Reference metadata persists; raw bytes do not (V2 01 §3).
    expect(payload).not.toMatch(/"bytes"/);
    expect(payload).not.toMatch(/base64|BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key|password|secret/i);
  });
});
