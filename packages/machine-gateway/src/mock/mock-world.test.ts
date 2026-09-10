import { describe, expect, it } from "vitest";
import { createFixedClock, loadScenario } from "@drop/mock-data";
import { createMockWorld } from "./mock-world";
import { createReviewPathConformanceSuite } from "../conformance/review-path";
import { GatewayError } from "../errors";
import type { CommandEnvelope, Target } from "@drop/panel-domain";

/**
 * Ticket P3, adapter-contract seam — AC-P3.12 and AC-P3.13.
 *
 * The P2 review-path suite runs UNMODIFIED against the real mock world. That is
 * the whole claim P2 made when it shipped the suite as an exported factory: the
 * reference stub proved the suite could run and fail, and this proves the actual
 * adapter satisfies it.
 *
 * The load-bearing case is still "submitApproval is the ONLY decision path" —
 * run here it proves the REPOSITORY holds no second append, which no amount of
 * interface design can guarantee on its own.
 */
const ENVELOPE: CommandEnvelope = {
  commandId: "cmd_mock_01",
  workspaceId: "drop-demo",
  actorId: "actor-guardian",
  actedAsRole: "DROP_GUARDIAN",
  idempotencyKey: "idem_mock_0001",
};

/** S05 is the concept-review world: c2 is mid-review with history. */
const TARGET: Target = { type: "CONCEPT", id: "c2", versionId: "c2-v2" };

function createWorld() {
  const world = createMockWorld({ scenarioId: "S05", clock: createFixedClock() });
  return Promise.resolve({
    machineGateway: world.machineGateway as never,
    review: world.review,
    revision: world.revisionGateway,
    fixtures: {
      reviewableTarget: TARGET,
      envelope: ENVELOPE,
      readDecisions: (target: Target) => Promise.resolve(world.repository.decisionsFor(target)),
      readVersionIds: (target: Target) => Promise.resolve(world.repository.versionIdsFor(target)),
    },
  });
}

describe("the mock world passes the P2 review-path suite unmodified (AC-P3.12)", () => {
  const cases = createReviewPathConformanceSuite({ name: "mock-world", createWorld });

  for (const testCase of cases) {
    it(testCase.name, async () => {
      await testCase.run();
    });
  }
});

describe("scenario response policies are applied at the transport boundary", () => {
  it("S13 reports the machine system disconnected without erasing the world", async () => {
    const world = createMockWorld({ scenarioId: "S13" });
    // V2 02 §10 — "Keep stale content visible ... do not erase it on disconnect."
    const snapshot = await world.panelCommandGateway.getSnapshot();
    expect(snapshot.projects.length).toBeGreaterThan(0);

    expect(() =>
      world.review.reviewItem({
        ...ENVELOPE,
        target: TARGET,
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      }),
    ).toThrow(GatewayError);
  });

  it("S14's read-only actor is rejected by the mock command, not only by the UI", () => {
    // Journey A16: client-side visibility is never the boundary (18 §4.2), so
    // the direct command must be refused too.
    const world = createMockWorld({ scenarioId: "S14" });
    let thrown: unknown;
    try {
      world.review.reviewItem({
        ...ENVELOPE,
        target: { type: "CONCEPT", id: "c1", versionId: "c1-v1" },
        outcome: "APPROVED",
        reasonFa: "تأیید.",
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GatewayError);
    expect((thrown as GatewayError).reason).toBe("UNAUTHORIZED");
    expect((thrown as GatewayError).retryable).toBe(false);
  });
});

describe("event delivery (AC-P3.13)", () => {
  it("unsubscribe actually stops delivery", async () => {
    const world = createMockWorld({ scenarioId: "S05" });
    const seen: string[] = [];
    const stop = world.panelCommandGateway.subscribe((event) => seen.push(event.type));

    await world.review.reviewItem({
      ...ENVELOPE,
      target: TARGET,
      outcome: "APPROVED",
      reasonFa: "تأیید نخست.",
    });
    expect(seen).toEqual(["panel.concept.reviewed"]);

    stop();
    await world.review.reviewItem({
      ...ENVELOPE,
      commandId: "cmd_mock_02",
      target: TARGET,
      outcome: "REJECTED",
      reasonFa: "رد دوم.",
    });
    // A no-op unsubscribe leaks a listener per mounted view; this is why the
    // conformance suite asserts it rather than trusting the return value.
    expect(seen).toEqual(["panel.concept.reviewed"]);
  });

  it("a comment changes no review status (V2 01 §4)", async () => {
    const world = createMockWorld({ scenarioId: "S05" });
    const before = (await world.panelCommandGateway.getSnapshot()).concepts.find((c) => c.id === "c2");
    await world.panelCommandGateway.addComment({
      ...ENVELOPE,
      commandId: "cmd_comment_01",
      target: TARGET,
      bodyFa: "پیشنهاد می‌کنم زاویهٔ روایی صریح‌تر شود.",
    });
    const after = await world.panelCommandGateway.getSnapshot();
    expect(after.comments.some((c) => c.bodyFa.includes("زاویهٔ روایی"))).toBe(true);
    expect(after.concepts.find((c) => c.id === "c2")?.reviewStatus).toBe(before?.reviewStatus);
  });

  it("exportPackage returns real bytes, and an unknown id does not yield an empty archive", async () => {
    const world = createMockWorld({ scenarioId: "S11" });
    const packageId = loadScenario("S11").snapshot.packages[0]!.id;
    const exported = await world.panelCommandGateway.exportPackage(packageId);
    expect(exported.bytes.length).toBeGreaterThan(0);
    expect(exported.mediaType).toBe("application/zip");
    await expect(world.panelCommandGateway.exportPackage("nope")).rejects.toThrow();
  });
});
