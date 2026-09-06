"use client";

import { use } from "react";
import { WorkflowGraph } from "../../../../../components/panel/workflow-graph";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/**
 * V2 02 §5 tab «گردش کار».
 *
 * The canvas and its stylesheet both live in packages/workflow-ui; this surface
 * consumes the derived view model and never names React Flow (18 §6).
 */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-workflow" className="space-y-3">
      <h2 id="tab-heading-workflow" className="text-lg font-semibold">
        گردش کار
      </h2>
      <QueryBoundary query={query}>
        {(world) => <WorkflowGraph world={world} projectId={id} />}
      </QueryBoundary>
    </section>
  );
}
