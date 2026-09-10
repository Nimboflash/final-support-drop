"use client";

import { Suspense } from "react";
import { LoadingState } from "@drop/ui";
import { ConceptsPage } from "../../../components/panel/concepts-page";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/**
 * `useSearchParams` needs a Suspense boundary at PAGE level in the app router.
 * It must never be used at layout level: there it suspends and never resolves
 * in dev, which once left the whole panel on its loading state.
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
  return <QueryBoundary query={query}>{(world) => <ConceptsPage world={world} />}</QueryBoundary>;
}
