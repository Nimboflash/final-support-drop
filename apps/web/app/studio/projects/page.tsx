"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, LoadingState } from "@drop/ui";
import { ProjectList } from "../../../components/panel/project-list";
import { StartJourneyDialog } from "../../../components/panel/start-journey";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/** V2 02 §4 — Programs and Weekly Lenses share this surface with a type filter. */
export default function Page() {
  return (
    // useSearchParams needs a Suspense boundary in the app router.
    <Suspense fallback={<LoadingState />}>
      <ProjectsSurface />
    </Suspense>
  );
}

function ProjectsSurface() {
  const params = useSearchParams();
  // The CTA links to ?start=1 so the dialog is deep-linkable and survives a
  // reload — filter and sheet identity live in the URL (ADR-0019 D13).
  const [startOpen, setStartOpen] = useState(params.get("start") === "1");
  const query = usePanelSnapshot();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">پروژه‌ها</h1>
        <Button onClick={() => setStartOpen(true)}>شروع مسیر جدید</Button>
      </div>
      <QueryBoundary query={query}>{(world) => <ProjectList world={world} />}</QueryBoundary>
      <StartJourneyDialog open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}
