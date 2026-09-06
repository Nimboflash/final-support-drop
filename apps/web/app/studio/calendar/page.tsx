"use client";

import { CalendarView } from "../../../components/panel/calendar-view";
import { QueryBoundary } from "../../../components/panel/states";
import { usePanelSnapshot } from "../../../lib/demo/queries";

/** V2 02 §8 — a wide canvas plus the unscheduled tray. */
export default function Page() {
  const query = usePanelSnapshot();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تقویم و برنامه</h1>
      <QueryBoundary query={query}>{(world) => <CalendarView world={world} />}</QueryBoundary>
    </div>
  );
}
