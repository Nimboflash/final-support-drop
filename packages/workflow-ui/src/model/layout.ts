import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { ProductGraph } from "./product-graph";

/**
 * The layout adapter (AC-P5.6) — ELK, top-to-bottom, grouped per concept.
 *
 * Layout is the ONLY thing this produces: coordinates. It never touches status,
 * dependencies or edges, which is what makes "node drag adjusts local layout
 * only, never machine state" (ADR-0019 D18) structurally true rather than a
 * convention the canvas has to remember.
 *
 * ELK is deterministic for a given input, so repeat runs place nodes identically
 * and visual baselines stay byte-stable.
 */
export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 92;

export interface LaidOutNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

const elk = new ELK();

export async function layoutProductGraph(graph: ProductGraph): Promise<readonly LaidOutNode[]> {
  // Grouping per concept is expressed as ELK children, so a branch stays
  // visually together rather than being interleaved with its siblings.
  const grouped = new Map<string, ElkNode[]>();
  const spine: ElkNode[] = [];

  for (const node of graph.nodes) {
    const box: ElkNode = { id: node.id, width: NODE_WIDTH, height: NODE_HEIGHT };
    if (node.groupId === null) spine.push(box);
    else grouped.set(node.groupId, [...(grouped.get(node.groupId) ?? []), box]);
  }

  const children: ElkNode[] = [
    ...spine,
    ...[...grouped.entries()].map(([groupId, boxes]) => ({
      id: `group:${groupId}`,
      children: boxes,
      layoutOptions: { "elk.padding": "[top=32,left=16,bottom=16,right=16]" },
    })),
  ];

  const laidOut = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      // Top-to-bottom (V2 02 §9). The graph's mathematical coordinates stay
      // unmirrored under RTL; only the node LABELS are RTL (V2 02 §1).
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
      "elk.spacing.nodeNode": "32",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children,
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const out: LaidOutNode[] = [];
  const walk = (node: ElkNode, offsetX: number, offsetY: number) => {
    for (const child of node.children ?? []) {
      const x = (child.x ?? 0) + offsetX;
      const y = (child.y ?? 0) + offsetY;
      if (child.children === undefined) out.push({ id: child.id, x, y });
      else walk(child, x, y);
    }
  };
  walk(laidOut, 0, 0);
  return out;
}
