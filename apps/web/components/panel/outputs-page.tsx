"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  ContentText,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, UnknownProjectState, filterByProject, useProjectFilter } from "./project-selector";
import { useReturnFocus } from "./use-return-focus";
import { useDownloadPackage, useSendToCalendar } from "../../lib/demo/commands";
import { useCanAct } from "../../lib/demo/policy";
import { useDemoSession } from "../../lib/demo/providers";
import { CommandError } from "./command-error";
import { useDownloadMachineReport } from "../../lib/machine/use-download-report";
import { usePulseKey } from "./use-pulse";
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
/*
  A status STRIPE on the start edge, not a coloured outline.

  These were four-edge borders, and at the alpha they used to carry they were
  invisible; at full strength — which is what they needed to reach 3:1 — ten
  cards of brand accent read as ten alarms. Neither is a status marker.

  A stripe is. It is contained, it is legible at full strength, it stacks down a
  column without competing, and it is the same shape the overview already uses
  for a row that wants attention. The card keeps its own hairline for structure;
  the stripe says what state it is in, beside a badge that says it in words.
*/
const STATE_TONE: Record<OutputState, string> = {
  assembling: "",
  ready_for_approval: "border-s-2 border-s-selected",
  approved: "border-s-2 border-s-success",
  scheduled: "border-s-2 border-s-success",
};

export function OutputsPage({ world }: { world: PanelSnapshot }) {
  const { selected: selectedProject, known } = useProjectFilter(world);
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
    <div className="drop-surface space-y-5">
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">خروجی‌ها</h1>
        <ProjectSelector world={world} />
      </header>

      {!known ? (
        <UnknownProjectState />
      ) : outputs.length === 0 ? (
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
  const pulse = usePulseKey(output.state);
  // One press target, matching every other card surface. See `concepts-page`.
  return (
    <Card
      data-testid="output-card"
      data-state={output.state}
      className={`drop-material drop-interactive h-full gap-0 overflow-hidden py-0 ${STATE_TONE[output.state]}`}
    >
      <button
        type="button"
        data-testid="open-output"
        onClick={onOpen}
        className="flex h-full w-full flex-col items-start gap-3 p-4 text-start hover:bg-accent/40"
      >
        <span className="flex flex-wrap items-center gap-2">
          <Badge
            key={pulse}
            variant="outline"
            data-testid="output-state"
            className={pulse > 0 ? "drop-pulse" : undefined}
          >
            {OUTPUT_STATE_LABEL_FA[output.state]}
          </Badge>
          <Badge variant="secondary" className="max-w-full min-w-0 shrink truncate">
            <ContentText>{output.projectTitleFa}</ContentText>
          </Badge>
        </span>
        <span className="text-base font-semibold">
          <ContentText>{output.titleFa}</ContentText>
        </span>
        {/* A human sentence, not a counter (ADR-0020 D5). */}
        <span className="text-sm text-muted-foreground" data-testid="output-summary">
          {output.blockerFa ?? "همهٔ محتواها تأیید شده‌اند."}
        </span>
      </button>
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
  const router = useRouter();
  const download = useDownloadPackage();
  const report = useDownloadMachineReport();
  /** Whether this output came from a real machine session rather than the demo world. */
  const session = useDemoSession();
  const live = session.mode === "REAL";
  const canAct = useCanAct();
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
          {/*
            Named, because the list is a SUBSET and an unlabelled one reads as
            "everything there is". The count beside it is the honest pair: what
            is in the output, out of what the concept produced.
          */}
          <div className="drop-rule flex items-baseline justify-between gap-2 pb-1">
            <h3 className="text-sm font-medium">محتواهای تأییدشده</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {toPersianDigits(String(output.approvedCount))} از{" "}
              {toPersianDigits(String(output.totalCount))}
            </span>
          </div>

          {items.length === 0 ? (
            <p data-testid="output-empty" className="text-sm text-muted-foreground">
              هنوز محتوایی تأیید نشده، پس این خروجی چیزی برای نشان‌دادن ندارد. در «محتوا»
              هر مورد را بررسی و تأیید کنید.
            </p>
          ) : null}

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

          {download.isError ? <CommandError error={download.error} /> : null}
          {report.isError ? <CommandError error={report.error} /> : null}
          {send.isError ? <CommandError error={send.error} /> : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
          {canAct.allowed ? null : (
            <p className="w-full text-sm text-muted-foreground" data-testid="cannot-act-reason">
              {canAct.reason}
            </p>
          )}
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
              <Link href={`/studio/calendar?project=${output.projectId}`}>دیدن در تقویم</Link>
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
              pending={send.isPending}
              disabled={
                !canAct.allowed ||
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
                      router.push(`/studio/calendar?project=${output.projectId}`);
                    },
                  },
                );
              }}
            >
              ارسال به تقویم
            </Button>
          )}
          {/*
            Two files, one button.

            The demo world's export is a zip built from its own files. A machine
            session's output is the machine's own final report, which the
            service writes beside the session and `/api/machine/report` serves.
            This control used to render enabled live, fail every time and blame
            the person's role; then it was hidden behind a sentence saying the
            file was "on this device". It is the file now.
          */}
          {output.packageVersionId === null ? null : live ? (
            <Button
              variant="outline"
              data-testid="download-output"
              pending={report.isPending}
              disabled={!canAct.allowed || report.isPending || session.machineSessionId === null}
              onClick={() => {
                if (session.machineSessionId !== null) report.mutate(session.machineSessionId);
              }}
            >
              بارگیری گزارش کامل
            </Button>
          ) : (
            <Button
              variant="outline"
              data-testid="download-output"
              pending={download.isPending}
              disabled={!canAct.allowed || download.isPending}
              onClick={() => download.mutate(output.packageVersionId!)}
            >
              بارگیری خروجی
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
