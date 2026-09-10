"use client";

import { useEffect, useMemo, useState } from "react";
// Bundled, never fetched: the e2e asserts zero external requests, and a CDN
// stylesheet would also violate 00 §4 / ADR-0016. The canvas package owns its
// own styles rather than asking each surface to remember to import them.
import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
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

/**
 * The anchor points every edge is drawn between.
 *
 * A custom node type gets NO handles unless it renders them, and React Flow
 * silently draws nothing for an edge whose endpoints it cannot find. That is
 * what was happening here: `buildProductGraph` produced sixty-seven edges for a
 * real session and the canvas rendered forty-six unconnected cards, with no
 * error anywhere — a workflow graph showing no workflow.
 *
 * Invisible rather than styled, because the panel has no connect affordance to
 * offer (`nodesConnectable={false}`, ADR-0019 D18): these exist to give the
 * edges somewhere to land, not to invite a drag. `opacity` rather than
 * `display`, so the anchor keeps its position.
 *
 * Top and bottom, because ELK lays this graph out with `elk.direction: DOWN` —
 * which is also why the canvas needed no RTL mirroring: the flow is vertical.
 */
const HANDLE_STYLE = { opacity: 0 } as const;

function ProductNodeCard({ data }: NodeProps<Node<ProductNodeData>>) {
  const node = data.product;
  return (
    <div
      data-testid="graph-node"
      data-node-class={node.nodeClass}
      data-state={node.state}
      className={`h-full w-full overflow-hidden rounded-md border-2 bg-card p-3 text-start ${NODE_STATE_TONE[node.state]}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} style={HANDLE_STYLE} />
      <p className="truncate text-sm font-medium"><bdi dir="auto">{node.labelFa}</bdi></p>
      <p className="truncate text-xs text-muted-foreground">
        {NODE_CLASS_LABEL_FA[node.nodeClass]}
      </p>
      <p className="pt-1 text-xs">
        {/* Icon-free but LABELLED: state never rides on colour alone. */}
        <span className="rounded-full border px-2 py-0.5">{NODE_STATE_LABEL_FA[node.state]}</span>
        {node.terminal ? <span className="ps-2">پایان شاخه</span> : null}
      </p>
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={HANDLE_STYLE} />
    </div>
  );
}

const nodeTypes = { product: ProductNodeCard };

/** Every string React Flow speaks, in Persian. */
const ARIA_LABELS_FA = {
  "node.a11yDescription.default": "برای انتخاب این مرحله Enter را بزنید.",
  "node.a11yDescription.keyboardDisabled": "این مرحله با صفحه‌کلید جابه‌جا نمی‌شود.",
  "node.a11yDescription.ariaLiveMessage": ({ direction }: { direction: string }) =>
    `مرحله به سمت ${direction} جابه‌جا شد.`,
  "edge.a11yDescription.default": "پیوند میان دو مرحله.",
  "controls.ariaLabel": "کنترل‌های نمودار",
  "controls.zoomIn.ariaLabel": "بزرگ‌نمایی",
  "controls.zoomOut.ariaLabel": "کوچک‌نمایی",
  "controls.fitView.ariaLabel": "جا دادن کل نمودار",
  "controls.interactive.ariaLabel": "قفل یا باز کردن جابه‌جایی",
  "minimap.ariaLabel": "نقشهٔ کوچک نمودار",
  "handle.ariaLabel": "نقطهٔ اتصال",
};

const ATTRIBUTION_CONTRAST_CSS = `
  .react-flow__attribution { background: var(--card); }
  .react-flow__attribution a { color: var(--foreground); opacity: 1; }
`;

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
        /*
          `measured` as well as `width`/`height`, and this is load-bearing
          rather than belt-and-braces.

          React Flow keeps each node's HANDLE positions in internal state that
          it fills in by measuring the DOM once. When a fresh node object
          arrives it re-derives them:

              if (!userNode.handles)
                return !userNode.measured ? undefined : internalNode?.internals.handleBounds;

          This memo rebuilds every node the moment ELK resolves `positions`. So
          without `measured`, that returns `undefined` and the measured handle
          bounds are DISCARDED — and they are never rebuilt, because the node's
          dimensions did not change and nothing else triggers a re-measure.
          React Flow then reports every edge as "Couldn't create edge for
          source handle id: null" (its error 008) and draws none of them.

          The panel showed that for its whole life: forty-six cards and not one
          connecting line, a warning in the console and no failing test, because
          the graph has never had a visual baseline.

          Declaring the handles is what fixes it, and it is the first branch of
          that same function — `userNode.handles`, used verbatim when present.
          Supplying only `measured` is a trap: it makes React Flow treat the
          node as already measured, so it never queries the DOM for handles at
          all and the bounds are never computed in the first place.

          These coordinates are node-relative and exact, because the card fills
          the node box: top-centre in, bottom-centre out, matching the `Handle`
          elements below and ELK's `elk.direction: DOWN`.
        */
        measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
        handles: [
          { type: "target", position: Position.Top, x: NODE_WIDTH / 2, y: 0 },
          { type: "source", position: Position.Bottom, x: NODE_WIDTH / 2, y: NODE_HEIGHT },
        ],
        // `data` carries the DTO-derived node, never a copy of its status that
        // could be written to and read back.
        data: { product },
      })),
    [graph, positions],
  );

  const edges = useMemo<Edge[]>(() => {
    /*
      React Flow names an edge `Edge from ${source} to ${target}` when it is not
      told otherwise — English, in a product that ships fa-IR only, and built
      out of raw internal ids, so a screen reader would read out
      "n:concept-review:c1". It is an `aria-label`, so no visual review and no
      innerText sweep can see it.

      It went unnoticed because no edge had ever rendered. The moment they did,
      `full-audit.spec.ts` caught it — which is the guard working exactly as
      intended. Named here from the same Persian labels the node cards show.
    */
    const labelById = new Map(graph.nodes.map((node) => [node.id, node.labelFa]));
    const name = (id: string) => labelById.get(id) ?? id;

    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.labelFa ?? undefined,
      ariaLabel:
        edge.kind === "REVISION"
          ? `بازنگری، از ${name(edge.source)} به ${name(edge.target)}`
          : `پیوند از ${name(edge.source)} به ${name(edge.target)}`,
      animated: edge.kind === "REVISION",
      // A revision edge is visually distinct AND labelled, so the distinction
      // survives for a reader who cannot see the dashes.
      style: edge.kind === "REVISION" ? { strokeDasharray: "6 4" } : undefined,
    }));
  }, [graph]);

  return (
    <div className="h-[32rem] w-full rounded-md border" data-testid="graph-canvas">
      {/*
        React Flow's attribution mark ships at 1.13:1 against the canvas — a
        WCAG AA failure. It must stay (removing it needs the Pro licence, an
        open client gate), so it is made legible instead: the same link, at a
        contrast a person can actually read.
      */}
      <style>{ATTRIBUTION_CONTRAST_CSS}</style>
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
        // React Flow ships English accessible names on its controls, its mini
        // map, its handles and its keyboard announcements. They are `aria-label`
        // and live-region text — never visible — so no visual review and no
        // innerText assertion can see them. In a product that ships fa-IR only
        // (00 §4) that is untranslated English reaching a screen reader, and
        // this is the library's own mechanism for fixing it.
        ariaLabelConfig={ARIA_LABELS_FA}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
