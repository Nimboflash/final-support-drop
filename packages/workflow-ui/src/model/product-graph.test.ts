import { describe, expect, it } from "vitest";
import { loadScenario } from "@drop/mock-data";
import { PRODUCT_NODE_CLASSES, buildProductGraph } from "./product-graph";

/**
 * Ticket P5, Seam A — the graph's hard rules, asserted against real scenario
 * worlds.
 *
 * Each of these is a rule ADR-0019 D18 states in prose and that a plausible
 * implementation would violate without noticing.
 */
function graphFor(scenarioId: string, projectId: string) {
  const world = loadScenario(scenarioId).snapshot;
  const project = world.projects.find((p) => p.id === projectId);
  if (project === undefined) throw new Error(`no ${projectId} in ${scenarioId}`);
  return { world, project, graph: buildProductGraph(world, project) };
}

describe("eight product node classes, none named for a machine (AC-P5.2)", () => {
  it("the class set is exactly the eight", () => {
    expect([...PRODUCT_NODE_CLASSES]).toEqual([
      "INPUT", "CONCEPT_GENERATION", "CONCEPT_REVIEW", "RESEARCH",
      "CONTENT_GENERATION", "CONTENT_REVIEW", "PACKAGE", "CALENDAR",
    ]);
  });

  it("no node class is named for or keyed by a machine", () => {
    for (const nodeClass of PRODUCT_NODE_CLASSES) {
      expect(nodeClass).not.toMatch(/MACHINE|M0[1-5]|STAGE_0/i);
    }
  });

  it("every rendered node uses one of the eight", () => {
    const { graph } = graphFor("S17", "p1");
    for (const node of graph.nodes) {
      expect(PRODUCT_NODE_CLASSES).toContain(node.nodeClass);
    }
  });
});

describe("machine identity is never inferred from position (AC-P5.3)", () => {
  it("no node claims a machine number when the definition supplies none", () => {
    const { graph } = graphFor("S17", "p1");
    // The V2 seed carries no workflow definition, so every machineNumber must be
    // null. A graph that filled these in from ordering would be exactly the
    // "newly inferred mapping" V2 01 §5 forbids.
    for (const node of graph.nodes) expect(node.machineNumber).toBeNull();
  });

  it("reordering the world's entities changes no attribution", () => {
    const world = loadScenario("S17").snapshot;
    const project = world.projects.find((p) => p.id === "p1")!;
    const forward = buildProductGraph(world, project);
    const reversed = buildProductGraph(
      { ...world, concepts: [...world.concepts].reverse(), content: [...world.content].reverse() },
      project,
    );
    const attribution = (g: typeof forward) =>
      [...g.nodes].map((n) => `${n.id}:${String(n.machineNumber)}`).sort();
    expect(attribution(reversed)).toEqual(attribution(forward));
  });
});

describe("revision edges come from lineage and are localized (AC-P5.4)", () => {
  it("S18 draws exactly one CONTENT revision edge, on o4, and none on its siblings", () => {
    const { graph } = graphFor("S18", "p1");
    const contentRevisions = graph.edges.filter(
      (e) => e.kind === "REVISION" && e.source.startsWith("n:content-review:"),
    );
    // Journey A07: "Only that item gets new version; other approved content
    // unchanged." Regenerating o4 must leave o1 and o3 untouched.
    expect(contentRevisions).toHaveLength(1);
    expect(contentRevisions[0]!.source).toBe("n:content-review:o4");
    // Back to its OWN generation step, never a shared one.
    expect(contentRevisions[0]!.target).toBe("n:content-generation:o4");
    expect(contentRevisions[0]!.labelFa).toBe("بازنگری");
    for (const sibling of ["o1", "o3"]) {
      expect(
        graph.edges.some((e) => e.kind === "REVISION" && e.source === `n:content-review:${sibling}`),
        `${sibling} must not acquire a revision edge`,
      ).toBe(false);
    }
  });

  it("a concept with real version lineage draws its own revision edge", () => {
    // c2 carries c2-v1 and c2-v2 in the seed, so it genuinely went back for a
    // revision. Suppressing that edge would hide real history.
    const { graph } = graphFor("S18", "p1");
    expect(
      graph.edges.some(
        (e) => e.kind === "REVISION" && e.source === "n:concept-review:c2" && e.target === "n:concept-generation",
      ),
    ).toBe(true);
  });

  it("a revision edge carries no iteration cap", () => {
    const { graph } = graphFor("S18", "p1");
    const revision = graph.edges.find(
      (e) => e.kind === "REVISION" && e.source.startsWith("n:content-review:"),
    )!;
    // An execution-mode revision edge is NOT a definition loop-back edge:
    // V2 01 §4 allows revisions "without a fixed one-round limit", while
    // workflowEdgeDefinitionSchema requires maxIterations on a definition edge.
    expect(revision).not.toHaveProperty("maxIterations");
  });
});

describe("branches, joins and terminals (AC-P5.5)", () => {
  it("S17 renders one group per approved concept with independent content", () => {
    const { graph } = graphFor("S17", "p1");
    expect(graph.groups.length).toBeGreaterThanOrEqual(2);
    const byGroup = new Map<string, number>();
    for (const node of graph.nodes) {
      if (node.groupId === null) continue;
      byGroup.set(node.groupId, (byGroup.get(node.groupId) ?? 0) + 1);
    }
    // Each branch has its own research and content nodes.
    for (const count of byGroup.values()) expect(count).toBeGreaterThan(1);
  });

  it("S24 ends every rejected concept review visibly and grows no research beneath it", () => {
    const { graph } = graphFor("S24", "p1");
    const reviews = graph.nodes.filter((n) => n.nodeClass === "CONCEPT_REVIEW");
    expect(reviews.length).toBeGreaterThan(0);
    for (const review of reviews) {
      expect(review.state).toBe("REJECTED");
      expect(review.terminal, `${review.id} must end visibly`).toBe(true);
      expect(
        graph.edges.some((e) => e.source === review.id && e.kind === "FLOW"),
        `${review.id} must grow no downstream flow`,
      ).toBe(false);
    }
    expect(graph.nodes.some((n) => n.nodeClass === "RESEARCH")).toBe(false);
  });

  it("the package join waits only on required content", () => {
    const { project, graph } = graphFor("S11", "p2");
    const incoming = graph.edges
      .filter((e) => e.target === "n:package")
      .map((e) => e.source.replace("n:content-review:", ""));
    expect([...incoming].sort()).toEqual([...project.outputPlan.requiredContentIds].sort());
  });

  it("the calendar node reads planned or ready-to-plan, never published", () => {
    for (const [scenario, projectId] of [["S11", "p2"], ["S19", "p5"]] as const) {
      const { graph } = graphFor(scenario, projectId);
      const calendar = graph.nodes.find((n) => n.nodeClass === "CALENDAR")!;
      expect(calendar.labelFa).toMatch(/برنامه‌ریزی‌شده|آماده برنامه‌ریزی|هنوز ساخته نشده/);
      expect(calendar.labelFa).not.toContain("منتشر");
    }
  });
});

describe("visual state is derived, never stored (AC-P5.7)", () => {
  it("building twice from the same world yields identical graphs", () => {
    const { world, project } = graphFor("S17", "p1");
    expect(JSON.stringify(buildProductGraph(world, project))).toBe(
      JSON.stringify(buildProductGraph(world, project)),
    );
  });

  it("a mutated copy of the graph does not affect the next build", () => {
    const { world, project, graph } = graphFor("S17", "p1");
    (graph.nodes as unknown as { state: string }[])[0]!.state = "MUTATED";
    expect(buildProductGraph(world, project).nodes[0]!.state).not.toBe("MUTATED");
  });

  it("a blocked content item reaches the graph as BLOCKED with its reason", () => {
    const { graph } = graphFor("S08", "p1");
    const blocked = graph.nodes.filter((n) => n.state === "BLOCKED");
    expect(blocked.length).toBeGreaterThan(0);
    for (const node of blocked) expect(node.reasonFa).not.toBeNull();
  });
});
