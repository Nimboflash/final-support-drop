"use client";

import { Suspense } from "react";
import { ContentPage } from "../../../components/panel/content-page";
import { QueryBoundary } from "../../../components/panel/states";
import { ContentSkeleton } from "../../../components/panel/skeletons";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/**
 * `useSearchParams` needs a Suspense boundary at PAGE level in the app router.
 * It must never be used at layout level: there it suspends and never resolves
 * in dev, which once left the whole panel on its loading state.
 */
export default function Page() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <Surface />
    </Suspense>
  );
}

function Surface() {
  const query = usePanelSnapshot();
  return <QueryBoundary query={query} pending={<ContentSkeleton />}>{(world) => <ContentPage world={world} />}</QueryBoundary>;
}
