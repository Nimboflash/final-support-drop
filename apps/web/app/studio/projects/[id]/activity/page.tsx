"use client";

import { use } from "react";
import { Badge, EmptyState } from "@drop/ui";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";

/** V2 02 §5 tab «تاریخچه» — comments, decisions, attempts and plan changes. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-activity" className="space-y-3">
      <h2 id="tab-heading-activity" className="text-lg font-semibold">تاریخچه</h2>
      <QueryBoundary query={query}>
        {(world) => {
          const owned = new Set([
            ...world.concepts.filter((c) => c.projectId === id).map((c) => c.id),
            ...world.content.filter((c) => c.projectId === id).map((c) => c.id),
          ]);
          const decisions = world.decisions.filter((d) => owned.has(d.target.id));
          const comments = world.comments.filter((c) => owned.has(c.target.id));
          const rows = [
            ...decisions.map((d) => ({ id: d.id, at: d.createdAt, kindFa: "تصمیم", bodyFa: d.reasonFa ?? `${d.outcome}`, actorId: d.actorId })),
            ...comments.map((c) => ({ id: c.id, at: c.createdAt, kindFa: "نظر", bodyFa: c.bodyFa, actorId: c.actorId })),
          ].sort((a, b) => b.at.localeCompare(a.at));

          if (rows.length === 0) {
            return <EmptyState title="هنوز رویدادی ثبت نشده" detail="نظرها و تصمیم‌ها پس از شروع بررسی اینجا دیده می‌شوند." />;
          }
          return (
            <ul className="space-y-2" data-testid="activity-list">
              {rows.map((row) => (
                <li key={row.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row.kindFa}</Badge>
                    <bdi dir="ltr" className="text-xs text-muted-foreground">{row.actorId}</bdi>
                  </div>
                  <p className="pt-1 leading-7">{row.bodyFa}</p>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryBoundary>
    </section>
  );
}
