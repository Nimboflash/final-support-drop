"use client";

import { OutputsView } from "../../../components/panel/outputs-view";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/** V2 02 §2 — approved content and the package archive across all projects. */
export default function Page() {
  const query = usePanelSnapshot();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">خروجی‌ها</h1>
      <QueryBoundary query={query}>{(world) => <OutputsView world={world} />}</QueryBoundary>
    </div>
  );
}
