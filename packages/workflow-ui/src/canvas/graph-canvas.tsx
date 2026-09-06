"use client";

import { useEffect, useMemo, useState } from "react";
// Bundled, never fetched: the e2e asserts zero external requests, and a CDN
// stylesheet would also violate 00 §4 / ADR-0016. The canvas package owns its
// own styles rather than asking each surface to remember to import them.
import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { ProductGraph, ProductNode } from "../model/product-graph";
import { NODE_HEIGHT, NODE_WIDTH, layoutProductGraph } from "../model/layout";
import {
  NODE_CLASS_LABEL_FA,
  NODE_STATE_LABEL_FA,
  NODE_STATE_TONE,
} from "./node-presentation";

/**
 * The execution canvas (AC-P5.6, AC-P5.7).
 *
 * React Flow objects are built FRESH from the `ProductGraph` on every render of
 * a new graph. No status is ever written into a node's `data` and read back:
 * 18 §6 keeps React Flow out of the integration contract, and ADR-0019 D18 makes
 * the canvas a pure projection. The consequence is concrete — mutating a node's
 * data has no effect, because the next derivation overwrites it.
 *
 * Node drag moves coordinates and nothing else. There is no edit, publish or
 * node-library affordance anywhere: template authoring is deferred.
 */
export interface ProductNodeData extends Record<string, unknown> {
  readonly product: ProductNode;
}

function ProductNodeCard({ data }: NodeProps<Node<ProductNodeData>>) {
  const node = data.product;
  return (
    <div
      data-testid="graph-node"
      data-node-class={node.nodeClass}
      data-state={node.state}
      className={`h-full w-full overflow-hidden rounded-md border-2 bg-card p-3 text-start ${NODE_STATE_TONE[node.state]}`}
    >
      <p className="truncate text-sm font-medium">{node.labelFa}</p>
      <p className="truncate text-xs text-muted-foreground">
        {NODE_CLASS_LABEL_FA[node.nodeClass]}
      </p>
      <p className="pt-1 text-xs">
        {/* Icon-free but LABELLED: state never rides on colour alone. */}
        <span className="rounded-full border px-2 py-0.5">{NODE_STATE_LABEL_FA[node.state]}</span>
        {node.terminal ? <span className="ps-2">پایان شاخه</span> : null}
      </p>
    </div>
  );
}

const nodeTypes = { product: ProductNodeCard };

export function GraphCanvas({
  graph,
  onSelect,
}: {
  graph: ProductGraph;
  onSelect: (node: ProductNode) => void;
}) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void layoutProductGraph(graph).then((laidOut) => {
      if (cancelled) return;
      setPositions(new Map(laidOut.map((n) => [n.id, { x: n.x, y: n.y }])));
    });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  const nodes = useMemo<Node<ProductNodeData>[]>(
    () =>
      graph.nodes.map((product) => ({
        id: product.id,
        type: "product",
        position: positions.get(product.id) ?? { x: 0, y: 0 },
        // Declared, not measured. ELK is laid out against exactly these
        // dimensions, so telling React Flow the same numbers keeps `fitView`
        // honest — a measured size that disagrees with the layout produces a
        // viewport fitted to the wrong bounding box, and the graph lands
        // off-screen.
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        // `data` carries the DTO-derived node, never a copy of its status that
        // could be written to and read back.
        data: { product },
      })),
    [graph, positions],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.labelFa ?? undefined,
        animated: edge.kind === "REVISION",
        // A revision edge is visually distinct AND labelled, so the distinction
        // survives for a reader who cannot see the dashes.
        style: edge.kind === "REVISION" ? { strokeDasharray: "6 4" } : undefined,
      })),
    [graph],
  );

  return (
    <div className="h-[32rem] w-full rounded-md border" data-testid="graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        // No editing affordances: template authoring is deferred (ADR-0019 D18).
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        onNodeClick={(_, node) => onSelect((node.data as ProductNodeData).product)}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
