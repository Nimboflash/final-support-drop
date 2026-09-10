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
  toPersianDigits,
} from "@drop/ui";
import type { PanelProject, PanelSnapshot } from "@drop/panel-domain";
import { NewConceptComposer } from "./new-concept-composer";
import { useReturnFocus } from "./use-return-focus";
import {
  ALL_PROJECTS,
  ProjectSelector,
  filterByProject,
  useSelectedProject,
} from "./project-selector";
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
 *
 * It honours `?project=` like every other work-unit surface. The brief's §8
 * routes `/studio/projects/:id/overview` to "the overview filtered on that
 * project", and consistency demands it anyway: a filter that silently vanishes
 * on one destination out of six is a filter the person stops trusting.
 */
export function Overview({ world }: { world: PanelSnapshot }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const composerFocus = useReturnFocus();
  const selected = useSelectedProject();
  const rows = filterByProject(attentionRows(world), selected);
  const projects =
    selected === ALL_PROJECTS
      ? world.projects
      : world.projects.filter((project) => project.id === selected);

  return (
    <div className="space-y-6">
      {/*
        The masthead rule (ADR-0022). The Brand DNA rules every block it sets —
        under the page number, under each row of the colour table — and that
        hairline is most of what makes the deck read as considered rather than
        merely dark. Structure, not ornament: without it these headings float
        on the ground with nothing telling you where a section starts.
      */}
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">نمای کلی</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectSelector world={world} />
          <Button
            data-testid="start-concept"
            onClick={() => {
              composerFocus.remember();
              setComposerOpen(true);
            }}
          >
            شروع کانسپت جدید
          </Button>
        </div>
      </header>

      {world.projects.length === 0 ? (
        <EmptyState
          title="هنوز کاری شروع نشده"
          detail="با یک درخواست، یک رفرنس، یا بدون هیچ ورودی شروع کنید."
          action={
            <Button
              onClick={() => {
                composerFocus.remember();
                setComposerOpen(true);
              }}
            >
              شروع کانسپت جدید
            </Button>
          }
        />
      ) : (
        <>
          <section aria-labelledby="attention-heading" className="space-y-3">
            <div className="drop-rule flex items-baseline justify-between gap-3 pb-2">
              <h2 id="attention-heading" className="text-lg font-semibold">
                نیازمند اقدام شما
              </h2>
              {/* Label and value, in Aluminium — the deck's own pairing. */}
              <span className="text-sm text-muted-foreground tabular-nums">
                {toPersianDigits(String(rows.length))}
              </span>
            </div>
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
            <div className="drop-rule flex items-baseline justify-between gap-3 pb-2">
              <h2 id="projects-heading" className="text-lg font-semibold">
                {selected === ALL_PROJECTS ? "پروژه‌های باز" : "پروژهٔ انتخاب‌شده"}
              </h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {toPersianDigits(String(projects.length))}
              </span>
            </div>
            <ul
              className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]"
              data-testid="project-list"
            >
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard world={world} project={project} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <NewConceptComposer
        world={world}
        open={composerOpen}
        onOpenChange={(next) => composerFocus.onOpenChange(next, setComposerOpen)}
        onCloseAutoFocus={composerFocus.onCloseAutoFocus}
      />
    </div>
  );
}

function AttentionRowView({ row }: { row: AttentionRow }) {
  return (
    <div
      data-testid="attention-row"
      data-kind={row.kind}
      /*
        The acid edge (ADR-0022). This row was `border bg-card` — the exact
        styling of a project card — so on a charcoal screen the one list that
        means "a person is blocking this" was indistinguishable from the list
        that means "here is a project". A start-side edge, not a fill: it marks
        the row without competing with the sentence inside it, and it is
        logical rather than physical so it stays on the correct side in RTL.
      */
      className="drop-material flex flex-wrap items-center justify-between gap-3 rounded-md border border-s-4 border-s-attention bg-card p-3"
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{row.projectTitleFa}</p>
        {/*
          One human sentence, never a dependency warning (ADR-0020 D5). Full
          foreground rather than muted: this sentence IS the reason the row is
          here, and it was being rendered quieter than the project name above it.
        */}
        <p className="text-sm">{row.detailFa}</p>
      </div>
      <Button asChild size="sm">
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
          {/*
            The brief names «ادامه» as the ambiguous case (§10): a button label
            must say the RESULT of pressing it, not that something continues.
          */}
          <Link href={`/studio/concepts?project=${project.id}`}>دیدن کانسپت‌ها</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
