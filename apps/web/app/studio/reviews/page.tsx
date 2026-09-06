"use client";

import { ReviewsQueue } from "../../../components/panel/reviews-queue";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/** V2 02 §2 — the cross-project concept and content review queue. */
export default function Page() {
  const query = usePanelSnapshot();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">بررسی‌ها</h1>
      <QueryBoundary query={query}>{(world) => <ReviewsQueue world={world} />}</QueryBoundary>
    </div>
  );
}
