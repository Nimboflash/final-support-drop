"use client";

import { use } from "react";
import { OutputsView } from "../../../../../components/panel/outputs-view";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/** V2 02 §5 tab «خروجی نهایی». */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-outputs" className="space-y-3">
      <h2 id="tab-heading-outputs" className="text-lg font-semibold">
        خروجی نهایی
      </h2>
      <QueryBoundary query={query}>
        {(world) => <OutputsView world={world} projectId={id} />}
      </QueryBoundary>
    </section>
  );
}
