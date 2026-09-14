"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ContentText,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useIsMobile,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, filterByProject, useSelectedProject } from "./project-selector";
import { useReturnFocus } from "./use-return-focus";
import { commandErrorFa, useDownloadPackage, useSendToCalendar } from "../../lib/demo/commands";
import {
  CONTENT_STATE_LABEL_FA,
  DIRECTION_LABEL_FA,
  OUTPUT_STATE_LABEL_FA,
  contentStateOf,
  outputsFor,
  type OutputState,
  type OutputView,
} from "../../lib/demo/presentation";

/**
 * Outputs — one concept's approved content, gathered (ADR-0020 D2, D5).
 *
 * The two tabs are gone. There is no "contents" versus "package versions"
 * split, and the word «بسته» does not appear: an output IS the assembled set,
 * and the interface says so with one noun.
 *
 * Readiness is a sentence about what to do next, never «۲ از ۴ مورد الزامی» —
 * the rule underneath survives unchanged, so there is still no invented
 * percentage and no progress bar anywhere in this tree.
 */
const STATE_TONE: Record<OutputState, string> = {
  assembling: "border-border",
  ready_for_approval: "border-selected/60",
  approved: "border-success/60",
  scheduled: "border-success/60",
};

export function OutputsPage({ world }: { world: PanelSnapshot }) {
  const selectedProject = useSelectedProject();
  const [openConceptId, setOpenConceptId] = useState<string | null>(null);
  const detailFocus = useReturnFocus();
  /*
    The overlay is keyed on the LAST item opened, not the currently open one.
    Keying on the current id unmounts the sheet the instant it closes — which
    is exactly when Radix would hand focus back to the card, so the remount
    silently cancelled the focus return. This still resets the sheet's state
    between two different items, which is what the key is for.
  */
  const [lastOpened, setLastOpened] = useState<string>("none");

  const outputs = filterByProject(outputsFor(world), selectedProject);
  const open = outputs.find((o) => o.conceptId === openConceptId) ?? null;

  return (
    <div className="space-y-5">
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">خروجی‌ها</h1>
        <ProjectSelector world={world} />
      </header>

      {outputs.length === 0 ? (
        <EmptyState
          title="هنوز خروجی‌ای ساخته نشده"
          detail="پس از تأیید محتواها، خروجی کامل اینجا ساخته می‌شود."
        />
      ) : (
        <ul
          className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]"
          data-testid="output-grid"
        >
          {outputs.map((output) => (
            <li key={output.conceptId}>
              <OutputCard output={output} onOpen={() => {
                  detailFocus.remember();
                  setLastOpened(output.conceptId);
                  setOpenConceptId(output.conceptId);
                }} />
            </li>
          ))}
        </ul>
      )}

      <OutputDetail
        key={lastOpened}
        world={world}
        output={open}
        open={open !== null}
        onOpenChange={(next) =>
          detailFocus.onOpenChange(next, (value) => {
            if (!value) setOpenConceptId(null);
          })
        }
        onCloseAutoFocus={detailFocus.onCloseAutoFocus}
      />
    </div>
  );
}

function OutputCard({ output, onOpen }: { output: OutputView; onOpen: () => void }) {
  return (
    <Card
      data-testid="output-card"
      data-state={output.state}
      className={`h-full gap-3 ${STATE_TONE[output.state]}`}
    >
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" data-testid="output-state">
              {OUTPUT_STATE_LABEL_FA[output.state]}
            </Badge>
            <Badge variant="secondary" className="max-w-full min-w-0 shrink truncate"><ContentText>{output.projectTitleFa}</ContentText></Badge>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
          >
            <ContentText>{output.titleFa}</ContentText>
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* A human sentence, not a counter (ADR-0020 D5). */}
        <p className="text-muted-foreground" data-testid="output-summary">
          {output.blockerFa ?? "همهٔ محتواها تأیید شده‌اند."}
        </p>
        <Button size="sm" variant="outline" onClick={onOpen} data-testid="open-output">
          بررسی خروجی
        </Button>
      </CardContent>
    </Card>
  );
}

function OutputDetail({
  world,
  output,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  output: OutputView | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Returns focus to the control that opened this overlay. */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const isMobile = useIsMobile();
  const download = useDownloadPackage();
  const send = useSendToCalendar();

  if (output === null) return null;

  const items = world.content.filter((c) => output.contentIds.includes(c.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="output-detail"
        className={isMobile ? "w-full sm:max-w-none" : "w-[42rem] sm:max-w-[50rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <ContentText>{output.titleFa}</ContentText>
            <Badge variant="outline">{OUTPUT_STATE_LABEL_FA[output.state]}</Badge>
          </SheetTitle>
          <SheetDescription><ContentText>{output.projectTitleFa}</ContentText></SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          <ul className="space-y-2" data-testid="output-materials">
            {items.map((item) => {
              const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
              const state = contentStateOf(item);
              return (
                <li key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium"><ContentText>{version?.titleFa ?? "محتوا"}</ContentText></span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {DIRECTION_LABEL_FA[item.type] ?? item.type}
                      </Badge>
                      {/* The central mapping, not a word invented here: /studio/content and
                            /studio/outputs must call the same item the same thing (D7). */}
                        <Badge variant="outline">{CONTENT_STATE_LABEL_FA[state]}</Badge>
                    </div>
                  </div>
                  <p className="line-clamp-2 pt-1 text-muted-foreground"><ContentText>{version?.bodyFa}</ContentText></p>
                </li>
              );
            })}
          </ul>

          {output.blockerFa === null ? null : (
            <p className="rounded-md border border-warning bg-warning/10 p-3 text-sm">
              {output.blockerFa}
            </p>
          )}

          {download.isError || send.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {commandErrorFa(download.error ?? send.error)}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
          {/*
            A disabled control has to say why. «ارسال به تقویم» greys out until
            the output is actually assembled, and without this line the reader
            is left guessing at a button that simply refuses.
          */}
          {output.state !== "scheduled" && output.packageVersionId === null ? (
            <p className="w-full text-sm text-muted-foreground" data-testid="send-blocked-reason">
              تا وقتی همهٔ محتواهای لازم تأیید نشده‌اند، خروجی ساخته نمی‌شود.
            </p>
          ) : null}

          {output.state === "scheduled" ? (
            <Button asChild variant="outline" data-testid="open-in-calendar">
              <a href={`/studio/calendar?project=${output.projectId}`}>دیدن در تقویم</a>
            </Button>
          ) : (
            /*
              This used to be a link to the calendar and nothing else — it moved
              the person to a page where their output was not, because nothing
              had created an entry. It now creates one, undated, which is what
              the tray IS (brief §14.11), and only then navigates.
            */
            <Button
              data-testid="send-to-calendar"
              disabled={
                output.state === "assembling" ||
                output.packageFamilyId === null ||
                output.packageVersionId === null ||
                send.isPending
              }
              onClick={() => {
                if (output.packageFamilyId === null || output.packageVersionId === null) return;
                send.mutate(
                  {
                    projectId: output.projectId,
                    titleFa: output.titleFa,
                    packageFamilyId: output.packageFamilyId,
                    packageVersionId: output.packageVersionId,
                  },
                  {
                    onSuccess: () => {
                      window.location.href = `/studio/calendar?project=${output.projectId}`;
                    },
                  },
                );
              }}
            >
              {send.isPending ? "در حال ارسال…" : "ارسال به تقویم"}
            </Button>
          )}
          {output.packageVersionId === null ? null : (
            <Button
              variant="outline"
              data-testid="download-output"
              disabled={download.isPending}
              onClick={() => download.mutate(output.packageVersionId!)}
            >
              {download.isPending ? "در حال آماده‌سازی…" : "بارگیری خروجی"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
