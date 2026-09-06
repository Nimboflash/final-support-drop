"use client";

import { use } from "react";
import { ContentView } from "../../../../../components/panel/content-view";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/** V2 02 §5 tab «محتوا و تحقیق». */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-content" className="space-y-3">
      <h2 id="tab-heading-content" className="text-lg font-semibold">
        محتوا و تحقیق
      </h2>
      <QueryBoundary query={query}>
        {(world) => <ContentView world={world} projectId={id} />}
      </QueryBoundary>
    </section>
  );
}
