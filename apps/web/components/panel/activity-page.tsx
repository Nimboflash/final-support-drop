"use client";

import {
  Badge,
  ContentText,
  EmptyState,
  PersianDateTime,
} from "@drop/ui";
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

  /** The human name of what an event happened TO. Never an identifier. */
  function subjectFa(targetId: string): string {
    const concept = world.concepts.find((c) => c.id === targetId);
    if (concept !== undefined) {
      return (
        world.conceptVersions.find((v) => v.id === concept.activeVersionId)?.titleFa ??
        "یک کانسپت"
      );
    }
    const item = world.content.find((c) => c.id === targetId);
    if (item !== undefined) {
      return (
        world.contentVersions.find((v) => v.id === item.activeVersionId)?.titleFa ?? "یک محتوا"
      );
    }
    return "یک مورد";
  }

  const OUTCOME_FA: Record<string, string> = {
    APPROVED: "تأیید شد",
    REJECTED: "کنار گذاشته شد",
    REVISION_REQUESTED: "درخواست بازنگری ثبت شد",
  };

  /*
    A history row has to answer when, to what, and what happened. It used to
    render only a kind badge and a body, and six of the nine rows in the base
    world were the byte-identical sentence «تصمیمی ثبت شد.» — a list that
    cannot distinguish its own entries is not a history.
  */
  const rows = [
    ...world.decisions
      .filter((d) => owned.has(d.target.id))
      .map((d) => ({
        id: d.id,
        at: d.createdAt,
        kindFa: "تصمیم",
        subjectFa: subjectFa(d.target.id),
        headlineFa: OUTCOME_FA[d.outcome] ?? "تصمیمی ثبت شد",
        bodyFa: d.reasonFa,
      })),
    ...world.comments
      .filter((c) => owned.has(c.target.id))
      .map((c) => ({
        id: c.id,
        at: c.createdAt,
        kindFa: "گفت‌وگو",
        subjectFa: subjectFa(c.target.id),
        headlineFa: "یادداشتی افزوده شد",
        bodyFa: c.bodyFa,
      })),
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{row.kindFa}</Badge>
                <span className="font-medium">{row.subjectFa}</span>
                <span className="text-muted-foreground">— {row.headlineFa}</span>
                <PersianDateTime value={row.at} className="ms-auto text-xs text-muted-foreground" />
              </div>
              {row.bodyFa === null || row.bodyFa === "" ? null : (
                <p className="pt-1 leading-7"><ContentText>{row.bodyFa}</ContentText></p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
