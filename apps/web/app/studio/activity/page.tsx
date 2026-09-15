"use client";

import { Suspense } from "react";
import { LoadingState } from "@drop/ui";
import { ActivityPage } from "../../../components/panel/activity-page";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/**
 * `useSearchParams` needs a Suspense boundary at PAGE level in the app router.
 *
 * At LAYOUT level a boundary is the wrong answer, not merely unnecessary: the
 * boundary is what breaks, because it renders its fallback on the client's
 * first hydration pass and discards everything the server sent under it. The
 * shell's own comment records what that cost. So the rule is per-level — a
 * boundary here, none there — and `apps/web/app/studio/layout.tsx` is where the
 * reasoning lives.
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
  return <QueryBoundary query={query}>{(world) => <ActivityPage world={world} />}</QueryBoundary>;
}
