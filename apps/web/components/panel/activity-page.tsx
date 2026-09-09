"use client";

import { Badge, EmptyState } from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, useSelectedProject, ALL_PROJECTS } from "./project-selector";

/**
 * History — reachable, but off the main path (ADR-0020 D2).
 *
 * The brief moves this out of the primary navigation entirely: it is reference
 * material, not a step in the work, and it was occupying a project tab.
 */
export function ActivityPage({ world }: { world: PanelSnapshot }) {
  const selectedProject = useSelectedProject();

  const owned = new Set(
    [
      ...world.concepts.filter(
        (c) => selectedProject === ALL_PROJECTS || c.projectId === selectedProject,
      ),
      ...world.content.filter(
        (c) => selectedProject === ALL_PROJECTS || c.projectId === selectedProject,
      ),
    ].map((entity) => entity.id),
  );

  const rows = [
    ...world.decisions
      .filter((d) => owned.has(d.target.id))
      .map((d) => ({
        id: d.id,
        at: d.createdAt,
        kindFa: "تصمیم",
        bodyFa: d.reasonFa ?? "تصمیمی ثبت شد.",
      })),
    ...world.comments
      .filter((c) => owned.has(c.target.id))
      .map((c) => ({ id: c.id, at: c.createdAt, kindFa: "گفت‌وگو", bodyFa: c.bodyFa })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">تاریخچه</h1>
        <ProjectSelector world={world} />
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="هنوز رویدادی ثبت نشده"
          detail="گفت‌وگوها و تصمیم‌ها پس از شروع کار اینجا دیده می‌شوند."
        />
      ) : (
        <ul className="space-y-2" data-testid="activity-list">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border bg-card p-3 text-sm">
              <Badge variant="outline">{row.kindFa}</Badge>
              <p className="pt-1 leading-7">{row.bodyFa}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
