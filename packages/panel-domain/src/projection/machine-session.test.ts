import { describe, expect, it } from "vitest";
import { panelSnapshotSchema } from "../schemas/panel-product";
import { machineSession as MACHINE_SESSION } from "../fixtures/valid";
import { idSchema } from "../schemas/common";
import { machineSessionSchema } from "./machine-wire";
import {
  MACHINE_CATEGORY_TO_OUTPUT_TYPE,
  machineProductStage,
  projectMachineSession,
} from "./machine-session";

/**
 * The machine-to-panel projection (ADR-0021 D6).
 *
 * Exercised against a REAL captured session — `services/concept-portfolio/
 * demo_runs/c18c18e12aea/session_state.json`, committed by the machine's own
 * authors — rather than against an object shaped by hand to fit. A fixture
 * written to match the mapping cannot catch the mapping being wrong about the
 * machine, which is the only kind of error that matters here.
 *
 * That session is a demanding one on purpose: PORTFOLIO_READY, two concept
 * rounds, an approval made in round 1 that survived into round 2, and every
 * one of the five portfolio categories populated.
 */
const NOW = "2026-09-10T09:00:00Z";
const OPTIONS = {
  now: NOW,
  workspaceId: "drop-demo",
  ownerId: "actor-guardian",
  // The identity renderer: what the machine said, unchanged. It makes the
  // English-into-a-Persian-interface problem visible in the assertions below
  // rather than hiding it behind a translation that does not exist yet.
  text: { toFa: (v: string) => v, toEn: (v: string) => v },
};

/**
 * Parsed fresh each time so a test that mutates its copy cannot reach another.
 * The fixture is a transcription of the real captured session rather than a
 * file read: `panel-domain` is a contract package and stays transport-free —
 * `panel-contract-invariants.test.ts` fails on `node:fs` here, correctly.
 */
function rawSession(): Record<string, unknown> {
  // JSON round-trip rather than `structuredClone`: the contract package's lib
  // is exactly ES2023 with no DOM (`panel-contract-invariants.test.ts` pins it),
  // so the browser global is not in scope here.
  return JSON.parse(JSON.stringify(MACHINE_SESSION)) as Record<string, unknown>;
}

function loadSession() {
  return machineSessionSchema.parse(rawSession());
}

describe("the machine's wire shape is parsed, not trusted", () => {
  it("accepts the real captured session", () => {
    const session = loadSession();
    expect(session.session_id).toBe("c18c18e12aea");
    expect(session.concept_rounds).toHaveLength(2);
    expect(session.approved_concept_id).toBe("concept_02");
    expect(session.portfolio).not.toBeNull();
  });

  it("rejects a session id that is not the machine's 12-hex form", () => {
    // The id is used as a filesystem path segment by the service itself, which
    // does not validate it. Refusing anything else at the boundary is the only
    // place that is checked at all.
    const bad = { ...rawSession(), session_id: "../../etc/passwd" };
    expect(() => machineSessionSchema.parse(bad)).toThrow();
  });

  it("survives fields the machine adds later", () => {
    const extended = rawSession();
    extended.some_future_field = { anything: true };
    expect(() => machineSessionSchema.parse(extended)).not.toThrow();
  });
});

describe("the projection produces a snapshot the panel will accept", () => {
  it("parses as a PanelSnapshot", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    // `projectMachineSession` parses internally, so reaching here is most of
    // the assertion; this makes the guarantee explicit at the call site.
    expect(() => panelSnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it("declares itself a machine snapshot, not a mock one", () => {
    // The whole reason `snapshotKind` was widened. A real session claiming to
    // be `drop.panel.mock.v2` would corrupt the discriminator that storage and
    // every honesty guarantee are keyed on.
    expect(projectMachineSession(loadSession(), OPTIONS).snapshotKind).toBe(
      "drop.panel.machine.v1",
    );
  });

  it("every id it mints is a legal panel id", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const ids = [
      ...snapshot.projects.map((p) => p.id),
      ...snapshot.concepts.flatMap((c) => [c.id, c.activeVersionId, c.batchId]),
      ...snapshot.conceptVersions.map((v) => v.id),
      ...snapshot.content.map((c) => c.id),
      ...snapshot.contentVersions.map((v) => v.id),
    ];
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      expect(idSchema.safeParse(id).success, `${id} is not a legal id`).toBe(true);
    }
  });

  it("gives every concept a unique id despite the machine reusing its own", () => {
    // The machine mints `concept_01..05` in EVERY round of EVERY session. Two
    // rows with the same id parse cleanly and then collide in the Engine graph,
    // where both become the node `n:concept-review:<id>`.
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const ids = snapshot.concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const versionIds = snapshot.conceptVersions.map((v) => v.id);
    expect(new Set(versionIds).size).toBe(versionIds.length);
  });
});

describe("concept identity across rounds", () => {
  it("treats a repeated concept id as the same concept, revised", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    // The card appears in BOTH rounds under the same machine id, so it is one
    // concept with two versions — not two concepts.
    expect(snapshot.concepts).toHaveLength(1);
    expect(snapshot.conceptVersions).toHaveLength(2);
    for (const concept of snapshot.concepts) {
      const versions = snapshot.conceptVersions.filter((v) => v.conceptId === concept.id);
      expect(versions.map((v) => v.number)).toEqual([1, 2]);
      // The ACTIVE version is the latest round, which is what makes a refine
      // show up as new content rather than as a silent no-op.
      expect(concept.activeVersionId).toBe(versions[1]!.id);
    }
  });

  it("records an approval that outlived its round as STALE", () => {
    /*
      The machine never clears `approved_concept_id` when a new round is
      appended, so this fixture's approval points at a concept whose newest
      version the reviewer never saw. STALE is the panel's recorded word for
      exactly that, so the contradiction is carried on a real axis rather than
      hidden.
    */
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const approved = snapshot.concepts.find((c) => c.reviewStatus === "APPROVED");
    expect(approved).toBeDefined();
    expect(approved!.freshness).toBe("STALE");

  });
});

describe("the stage is derived from facts, not from the machine's status", () => {
  it("reads RESEARCH_CONTENT from a built portfolio", () => {
    expect(machineProductStage(loadSession())).toBe("RESEARCH_CONTENT");
  });

  it("ignores a status that regressed under it", () => {
    /*
      The machine sets status back to CONCEPTS_READY when `respond` is called
      after a portfolio was built, while LEAVING the portfolio in place. A
      projection that trusted `status` would report a session as still choosing
      concepts while holding its finished research.
    */
    const regressed = { ...loadSession(), status: "CONCEPTS_READY" as const };
    expect(regressed.portfolio).not.toBeNull();
    expect(machineProductStage(regressed)).toBe("RESEARCH_CONTENT");
  });

  it("reads DRAFT from a session with no rounds, whatever it claims", () => {
    const empty = { ...loadSession(), concept_rounds: [], portfolio: null };
    expect(machineProductStage(empty)).toBe("DRAFT");
  });
});

describe("the portfolio, and what does not survive the mapping", () => {
  it("projects the three categories that have a recorded home", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const types = new Set(snapshot.content.map((c) => c.type));
    expect([...types].sort()).toEqual(["ART_DESIGN", "FILM", "MUSIC"]);
  });

  it("drops the two that do not, rather than inventing an output type", () => {
    // 8 music + 5 films + 5 artworks = 18 of the 24 recommendations. The six
    // readings are a stated loss (ADR-0021, OD-5), not an oversight — `BOOK` is
    // the nearest member of the closed set and a reading is not a book.
    const session = loadSession();
    const dropped =
      session.portfolio!.scientific_readings.length + session.portfolio!.artistic_readings.length;
    expect(dropped).toBeGreaterThan(0);

    const snapshot = projectMachineSession(session, OPTIONS);
    const kept =
      session.portfolio!.music.length +
      session.portfolio!.films_and_series.length +
      session.portfolio!.artworks.length;
    expect(snapshot.content).toHaveLength(kept);
    expect(MACHINE_CATEGORY_TO_OUTPUT_TYPE.scientific_readings).toBeNull();
    expect(MACHINE_CATEGORY_TO_OUTPUT_TYPE.artistic_readings).toBeNull();
  });

  it("never launders a model-authored URL into an id field", () => {
    // `links` are URLs from a language model and `sourceIds` is `array(idSchema)`.
    // A URL fails that pattern on its colon and slashes; coercing one in would
    // be both a schema violation and a trust boundary crossed.
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    for (const version of snapshot.contentVersions) {
      expect(version.sourceIds).toEqual([]);
    }
  });

  it("freezes each content version against the approved concept version", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const approved = snapshot.concepts.find((c) => c.reviewStatus === "APPROVED")!;
    for (const version of snapshot.contentVersions) {
      expect(version.conceptVersionId).toBe(approved.activeVersionId);
    }
  });

  it("puts the approved concept in the plan so Engine does not prune its branch", () => {
    /*
      `buildProductGraph` skips a concept's whole branch when its active version
      is not in `selectedConceptVersionIds` AND it has no content. Getting this
      wrong makes an approved concept silently vanish from Engine with no error
      anywhere.
    */
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    const approved = snapshot.concepts.find((c) => c.reviewStatus === "APPROVED")!;
    expect(snapshot.projects[0]!.selectedConceptVersionIds).toContain(approved.activeVersionId);
    // And the plan holds content ITEM ids, not version ids — the package join
    // builds `n:content-review:${id}` from these.
    const itemIds = new Set(snapshot.content.map((c) => c.id));
    for (const id of snapshot.projects[0]!.outputPlan.requiredContentIds) {
      expect(itemIds.has(id), `${id} is not a content item id`).toBe(true);
    }
  });
});

describe("what the projection refuses to fabricate", () => {
  it("emits no package and no calendar entry", () => {
    // `packageSnapshotSchema` pins `isMock: z.literal(true)`, so a genuine
    // machine package cannot be expressed without claiming to be a mock, and a
    // calendar entry needs a package version to point at. Emitting nothing is
    // the honest option (ADR-0021, OD-2).
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    expect(snapshot.packages).toEqual([]);
    expect(snapshot.calendar).toEqual([]);
  });

  it("claims no feedback lineage the machine never recorded", () => {
    // The action word ("refine"/"regenerate") is written only to events.jsonl
    // and never reaches the model or the session state, so which feedback
    // produced which round is genuinely unknown.
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    for (const version of snapshot.conceptVersions) {
      expect(version.feedbackAppliedFa).toBeNull();
    }
  });

  it("drops the server filesystem path the machine leaks in every response", () => {
    const session = loadSession();
    expect(session.run_dir).toContain("/");
    const serialized = JSON.stringify(projectMachineSession(session, OPTIONS));
    expect(serialized).not.toContain(session.run_dir);
  });

  it("takes its clock from the caller and mints none of its own", () => {
    const snapshot = projectMachineSession(loadSession(), OPTIONS);
    expect(snapshot.clock).toBe(NOW);
    for (const version of snapshot.conceptVersions) expect(version.createdAt).toBe(NOW);
    for (const concept of snapshot.concepts) expect(concept.updatedAt).toBe(NOW);
  });
});
