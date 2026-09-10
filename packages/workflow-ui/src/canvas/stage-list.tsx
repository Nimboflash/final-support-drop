"use client";

import type { ProductGraph, ProductNode } from "../model/product-graph";
import {
  NODE_CLASS_LABEL_FA,
  NODE_STATE_LABEL_FA,
  NODE_STATE_TONE,
} from "./node-presentation";

/**
 * The accessible equivalent of the canvas (AC-P5.10; ADR-0019 D18).
 *
 * "An accessible equivalent stage list is mandatory: the graph is never the only
 * way to act." This renders from the SAME `ProductGraph` the canvas does, so the
 * two cannot drift — a list built from a second derivation would silently
 * disagree the first time the graph logic changed.
 *
 * Fully keyboard-operable, with Persian labels and LTR-isolated identifiers.
 */
export function StageList({
  graph,
  selectedId,
  onSelect,
}: {
  graph: ProductGraph;
  selectedId: string | null;
  onSelect: (node: ProductNode) => void;
}) {
  const groupLabel = (groupId: string | null) =>
    groupId === null ? null : (graph.groups.find((g) => g.id === groupId)?.labelFa ?? groupId);

  return (
    <ol className="space-y-2" data-testid="stage-list" aria-label="فهرست مرحله‌های گردش کار">
      {graph.nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            data-testid="stage-list-item"
            data-node-class={node.nodeClass}
            data-state={node.state}
            aria-current={selectedId === node.id ? "true" : undefined}
            onClick={() => onSelect(node)}
            className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-start ${NODE_STATE_TONE[node.state]}`}
          >
            <span className="min-w-0 space-y-1">
              <span className="block font-medium"><bdi dir="auto">{node.labelFa}</bdi></span>
              <span className="block text-xs text-muted-foreground">
                {NODE_CLASS_LABEL_FA[node.nodeClass]}
                {groupLabel(node.groupId) === null ? null : ` — شاخهٔ ${groupLabel(node.groupId)}`}
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs">
              {/* Icon plus label: state never rides on colour alone. */}
              <span className="rounded-full border px-2 py-1">
                {NODE_STATE_LABEL_FA[node.state]}
              </span>
              {node.terminal ? (
                <span className="rounded-full border border-destructive px-2 py-1">
                  پایان شاخه
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
