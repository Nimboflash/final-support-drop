"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  ContentText,
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
  UnknownProjectState,
  useProjectFilter,
} from "./project-selector";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@drop/ui";
import { PROJECT_STAGE_LABEL_FA, projectMessageFa } from "../../lib/demo/presentation";
import {
  PROJECT_STAGES,
  attentionFor,
  projectStage,
  type AttentionRow,
} from "../../lib/demo/read-models";

/**
 * The overview — where every idea is, in one board (ADR-0023).
 *
 * It was two lists, and they said the same thing twice. «نیازمند اقدام شما»
 * rendered a project's blocker as a row; «پروژه‌های باز» rendered the SAME
 * project with the SAME sentence as a card, because both come from
 * `readinessFor`. One screen, one fact, two places — and neither told you where
 * the work actually stood.
 *
 * Now a project appears exactly ONCE, in the column for the stage it has
 * reached, and needing a person is a PROPERTY of that card rather than a second
 * list of the same projects. Pressing one opens a panel with its blockers and
 * the actions for them, which is where the detail the cards used to compete
 * over now lives.
 *
 * Brief §7.1 asked for «کارت‌های ساده» and listed the five-stage strip under
 * «حذف شود». ADR-0023 records the owner amending that: what the brief removed
 * was a strip repeated INSIDE every card, five stages redrawn seven times. This
 * is the opposite — one board, each project on it once.
 *
 * Still removed, and staying removed: the four counter tiles, «۲ از ۴ مورد
 * الزامی تأیید شده», the "next two weeks" section, and dependency warnings in
 * technical language.
 *
 * It honours `?project=` like every other work-unit surface. The brief's §8
 * routes `/studio/projects/:id/overview` to "the overview filtered on that
 * project", and consistency demands it anyway: a filter that silently vanishes
 * on one destination out of six is a filter the person stops trusting.
 */
export function Overview({ world }: { world: PanelSnapshot }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const composerFocus = useReturnFocus();
  const panelFocus = useReturnFocus();
  const { selected, known } = useProjectFilter(world);
  const projects =
    selected === ALL_PROJECTS
      ? world.projects
      : world.projects.filter((project) => project.id === selected);
  const openProject = world.projects.find((p) => p.id === openProjectId) ?? null;

  return (
    <div className="drop-surface space-y-6">
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

      {!known ? (
        <UnknownProjectState />
      ) : world.projects.length === 0 ? (
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
        /*
          Every stage is drawn, including the empty ones. A «تقویم» column with
          nothing in it is information — it says no work has reached the end
          yet — and a board whose columns appear and disappear is one whose
          shape a person cannot learn.
        */
        /*
          Five columns that stay five. `auto-fit` dropped «تقویم» onto a second
          row at this width, and a stage column that wraps reads as a new row of
          stages rather than as the fifth one. The journey has an order; the
          board has to keep it. Stacked on narrow, two up on small, five across
          from `lg` — never four-and-a-stray.
        */
        <div className="grid items-start gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {PROJECT_STAGES.map((stage) => {
            const inStage = projects.filter((project) => projectStage(world, project) === stage);
            return (
              <section
                key={stage}
                data-testid="stage-column"
                data-stage={stage}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium tracking-wide text-muted-foreground">
                    {PROJECT_STAGE_LABEL_FA[stage]}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {toPersianDigits(String(inStage.length))}
                  </span>
                </div>
                <ul className="space-y-3">
                  {inStage.map((project) => (
                    <li key={project.id}>
                      <ProjectCard
                        world={world}
                        project={project}
                        onOpen={() => {
                          panelFocus.remember();
                          setOpenProjectId(project.id);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ProjectPanel
        // Keyed on the opener, for the reason content-page records: a panel
        // that outlives the row that opened it restores focus to the wrong one.
        key={openProjectId ?? "none"}
        world={world}
        project={openProject}
        open={openProject !== null}
        onOpenChange={(next) =>
          panelFocus.onOpenChange(next, (value) => {
            if (!value) setOpenProjectId(null);
          })
        }
        onCloseAutoFocus={panelFocus.onCloseAutoFocus}
      />

      <NewConceptComposer
        world={world}
        open={composerOpen}
        onOpenChange={(next) =>
          composerFocus.onOpenChange(next, (value) => {
            setComposerOpen(value);
          })
        }
      />
    </div>
  );
}

/**
 * One project, once, in the column for the stage it has reached.
 *
 * The card says one sentence, not two. If a person is the blocker it says
 * THAT, on Acid (ADR-0022 D3), with the count — because that is the only thing
 * on this board that asks for anything. Otherwise it says where the work
 * stands, quietly. The two used to be rendered side by side on one screen from
 * the same `readinessFor` call, which is what made the old overview read as
 * repetition.
 */
function ProjectCard({
  world,
  project,
  onOpen,
}: {
  world: PanelSnapshot;
  project: PanelProject;
  onOpen: () => void;
}) {
  const attention = attentionFor(world, project.id);
  const waiting = attention.length > 0;

  return (
    <Card
      data-testid="project-card"
      data-project={project.id}
      data-waiting={waiting}
      className="drop-material drop-interactive gap-0 overflow-hidden py-0"
    >
      <button
        type="button"
        data-testid="open-project"
        onClick={onOpen}
        className="flex w-full flex-col items-start gap-1.5 p-3 text-start transition-colors hover:bg-accent/50"
      >
        <span className="flex w-full flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-normal">
            {project.type === "PROGRAM" ? "برنامه" : "لنز هفته"}
          </Badge>
          {/*
            Filled, and small. Acid has to be filled — as text it is 1.08:1 on
            Paper and unusable in the light theme (ADR-0022 D3) — but a
            full-width bar on four of seven cards floods the board with the one
            colour that exists to stand out. A pill says the same thing and
            leaves the card readable.
          */}
          {waiting ? (
            <Badge
              data-testid="project-waiting"
              className="border-transparent bg-attention font-medium text-attention-foreground"
            >
              {toPersianDigits(String(attention.length))} منتظر شما
            </Badge>
          ) : null}
        </span>
        <span className="line-clamp-2 text-sm font-semibold">
          <ContentText>{project.titleFa}</ContentText>
        </span>
        {waiting ? null : (
          <span data-testid="project-message" className="text-xs text-muted-foreground">
            {projectMessageFa(world, project)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          <PersianCalendarDate value={project.updatedAt.slice(0, 10)} />
        </span>
      </button>
    </Card>
  );
}

/**
 * The panel behind a card — what this project needs, and how to do it.
 *
 * The board says WHERE a project is and whether it wants you. Everything a
 * card used to carry and compete over — which blocker, in which words, with
 * which action — is here, on the one project you asked about, reached by
 * pressing it.
 */
function ProjectPanel({
  world,
  project,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  project: PanelProject | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  if (project === null) return null;
  const attention = attentionFor(world, project.id);
  const stage = projectStage(world, project);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="project-panel"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader>
          <SheetTitle>
            <ContentText>{project.titleFa}</ContentText>
          </SheetTitle>
          <SheetDescription>
            {project.type === "PROGRAM" ? "برنامه" : "لنز هفته"} —{" "}
            {PROJECT_STAGE_LABEL_FA[stage]}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div className="drop-rule flex items-baseline justify-between gap-2 pb-1">
            <h3 className="text-sm font-medium">نیازمند اقدام شما</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {toPersianDigits(String(attention.length))}
            </span>
          </div>

          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              چیزی در انتظار شما نیست. همهٔ کارهای باز بررسی شده‌اند.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="attention-list">
              {attention.map((row, index) => (
                <li key={`${row.kind}-${String(index)}`}>
                  <AttentionRowView row={row} />
                </li>
              ))}
            </ul>
          )}

          <div className="drop-rule pb-1">
            <h3 className="text-sm font-medium">آخرین فعالیت</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            <PersianCalendarDate value={project.updatedAt.slice(0, 10)} />
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/studio/concepts?project=${project.id}`}>دیدن کانسپت‌ها</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/studio/content?project=${project.id}`}>دیدن محتوا</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/studio/engine?project=${project.id}`}>دیدن جریان</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One blocker, in human language, with the thing that resolves it. */
function AttentionRowView({ row }: { row: AttentionRow }) {
  return (
    <div
      data-testid="attention-row"
      data-kind={row.kind}
      className="drop-material flex flex-wrap items-center justify-between gap-3 rounded-md border border-s-4 border-s-attention bg-card p-3"
    >
      <p className="min-w-0 flex-1 text-sm">
        <ContentText>{row.detailFa}</ContentText>
      </p>
      <Button asChild size="sm">
        <Link href={row.href}>{row.actionLabelFa}</Link>
      </Button>
    </div>
  );
}
