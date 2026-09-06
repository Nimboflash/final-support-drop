"use client";

import { use } from "react";
import { ConceptGrid } from "../../../../../components/panel/concept-grid";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/** V2 02 §5 tab «کانسپت‌ها» — the candidate grid and the batch transition. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-concepts" className="space-y-3">
      <h2 id="tab-heading-concepts" className="text-lg font-semibold">
        کانسپت‌ها
      </h2>
      <QueryBoundary query={query}>
        {(world) => <ConceptGrid world={world} projectId={id} />}
      </QueryBoundary>
    </section>
  );
}
