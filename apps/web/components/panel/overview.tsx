"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PersianCalendarDate,
} from "@drop/ui";
import type { PanelProject, PanelSnapshot } from "@drop/panel-domain";
import { NewConceptComposer } from "./new-concept-composer";
import { projectMessageFa } from "../../lib/demo/presentation";
import { attentionRows, type AttentionRow } from "../../lib/demo/read-models";

/**
 * The overview — a light landing page, not a dashboard (ADR-0020, brief §7.1).
 *
 * Deliberately removed by the brief: the four large counter tiles, the repeated
 * five-stage strip inside every project card, «۲ از ۴ مورد الزامی تأیید شده»,
 * the "next two weeks" section, and the duplicated dependency warnings in
 * technical language.
 *
 * What remains answers one question — what needs me now — and offers one way
 * to start. If a real blocker exists it appears in «نیازمند اقدام شما», said in
 * human language.
 */
export function Overview({ world }: { world: PanelSnapshot }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const rows = attentionRows(world);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">نمای کلی</h1>
        <Button data-testid="start-concept" onClick={() => setComposerOpen(true)}>
          شروع کانسپت جدید
        </Button>
      </header>

      {world.projects.length === 0 ? (
        <EmptyState
          title="هنوز کاری شروع نشده"
          detail="با یک درخواست، یک رفرنس، یا بدون هیچ ورودی شروع کنید."
          action={<Button onClick={() => setComposerOpen(true)}>شروع کانسپت جدید</Button>}
        />
      ) : (
        <>
          <section aria-labelledby="attention-heading" className="space-y-3">
            <h2 id="attention-heading" className="text-lg font-semibold">
              نیازمند اقدام شما
            </h2>
            {rows.length === 0 ? (
              <EmptyState
                title="چیزی در انتظار شما نیست"
                detail="همهٔ کارهای باز بررسی شده‌اند."
              />
            ) : (
              <ul className="space-y-2" data-testid="attention-list">
                {rows.map((row, index) => (
                  <li key={`${row.kind}-${row.projectId}-${String(index)}`}>
                    <AttentionRowView row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="projects-heading" className="space-y-3">
            <h2 id="projects-heading" className="text-lg font-semibold">
              پروژه‌های باز
            </h2>
            <ul
              className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]"
              data-testid="project-list"
            >
              {world.projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard world={world} project={project} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <NewConceptComposer world={world} open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}

function AttentionRowView({ row }: { row: AttentionRow }) {
  return (
    <div
      data-testid="attention-row"
      data-kind={row.kind}
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3"
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{row.projectTitleFa}</p>
        {/* One human sentence, never a dependency warning (ADR-0020 D5). */}
        <p className="text-sm text-muted-foreground">{row.detailFa}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={row.href}>{row.actionLabelFa}</Link>
      </Button>
    </div>
  );
}

/**
 * The project card carries the four things the brief lists and nothing else:
 * name, context, last activity, and ONE operational sentence — plus the way to
 * continue.
 */
function ProjectCard({ world, project }: { world: PanelSnapshot; project: PanelProject }) {
  return (
    <Card data-testid="project-card" className="h-full gap-3">
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {project.type === "PROGRAM" ? "برنامه" : "لنز هفته"}
            </Badge>
          </div>
          <Link
            href={`/studio/concepts?project=${project.id}`}
            className="text-base font-semibold underline-offset-4 hover:underline"
          >
            {project.titleFa}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p data-testid="project-message" className="text-muted-foreground">
          {projectMessageFa(world, project)}
        </p>
        {/*
          A Jalali date, not the stored ISO string. The Gregorian value stays
          canonical; only the display is Persian (V2 01 §7).
        */}
        <p className="text-xs text-muted-foreground">
          آخرین فعالیت: <PersianCalendarDate value={project.updatedAt.slice(0, 10)} />
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/studio/concepts?project=${project.id}`}>ادامه</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
