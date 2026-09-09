"use client";

import { Suspense } from "react";
import { LoadingState } from "@drop/ui";
import { Overview } from "../../components/panel/overview";
import { QueryBoundary } from "../../components/panel/states";
import { usePanelSnapshot } from "../../lib/demo/queries";
import { useDemoSession } from "../../lib/demo/providers";

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
    <Suspense fallback={<LoadingState />}>
      <Surface />
    </Suspense>
  );
}

function Surface() {
  const query = usePanelSnapshot();
  const session = useDemoSession();
  return (
    <QueryBoundary query={query} lastSyncedAt={session.clock.now()}>
      {(world) => <Overview world={world} />}
    </QueryBoundary>
  );
}
