"use client";

import { use } from "react";
import Link from "next/link";
import { Button, EmptyState, PersianCalendarDate, Badge } from "@drop/ui";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/** V2 02 §5 tab «برنامه» — a project-scoped view of the same calendar records. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-plan" className="space-y-3">
      <h2 id="tab-heading-plan" className="text-lg font-semibold">برنامه</h2>
      <QueryBoundary query={query}>
        {(world) => {
          const entries = world.calendar.filter((entry) => entry.projectId === id);
          if (entries.length === 0) {
            return (
              <EmptyState
                title="هنوز آیتم برنامه‌ای ساخته نشده"
                detail="پس از ساخته‌شدن بسته، یک آیتم برنامه ساخته می‌شود؛ اگر تاریخی نباشد به سینی «بدون تاریخ» می‌رود."
                action={<Button asChild variant="outline" size="sm"><Link href="/studio/calendar">رفتن به تقویم</Link></Button>}
              />
            );
          }
          return (
            <ul className="space-y-2" data-testid="project-plan">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{entry.titleFa}</span>
                    {/* Never "published" because a date was chosen (V2 01 §7). */}
                    <Badge variant="outline">{entry.date === null ? "آماده برنامه‌ریزی" : "برنامه‌ریزی‌شده"}</Badge>
                  </div>
                  <p className="pt-1 text-muted-foreground">
                    {entry.date === null ? "تاریخی تعیین نشده." : <PersianCalendarDate value={entry.date} />}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/studio/calendar">مدیریت در تقویم</Link>
                  </Button>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryBoundary>
    </section>
  );
}
