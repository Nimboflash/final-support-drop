"use client";

import { Overview } from "../../components/panel/overview";
import { QueryBoundary } from "../../components/panel/states";
import { usePanelSnapshot } from "../../lib/demo/queries";
import { useDemoSession } from "../../lib/demo/providers";

/** V2 02 §3 — the overview, and the work inbox ADR-0019 D13 redirects to. */
export default function Page() {
  const query = usePanelSnapshot();
  const session = useDemoSession();
  return (
    <QueryBoundary query={query} lastSyncedAt={session.clock.now()}>
      {(world) => <Overview world={world} />}
    </QueryBoundary>
  );
}
