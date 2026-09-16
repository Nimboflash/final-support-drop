"use client";

import { Suspense } from "react";
import { Overview } from "../../components/panel/overview";
import { QueryBoundary } from "../../components/panel/states";
import { OverviewSkeleton } from "../../components/panel/skeletons";
import { usePanelSnapshot } from "../../lib/demo/queries";

/**
 * The overview, and the work inbox ADR-0019 D13 redirects to.
 *
 * The Suspense boundary is required, not decorative: the overview reads
 * `?project=` (brief §8), and `useSearchParams` without a boundary opts the
 * whole route out of prerendering. It belongs at PAGE level — at layout level
 * it suspends and never resolves in dev, which once left the entire panel
 * sitting on its loading state.
 */
export default function Page() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Surface />
    </Suspense>
  );
}

function Surface() {
  const query = usePanelSnapshot();
  return (
    <QueryBoundary query={query} pending={<OverviewSkeleton />}>
      {(world) => <Overview world={world} />}
    </QueryBoundary>
  );
}
