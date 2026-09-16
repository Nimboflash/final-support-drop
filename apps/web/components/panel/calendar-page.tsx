"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Badge,
  Button,
  ContentText,
  EmptyState,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import type { PanelCalendarEntry, PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, UnknownProjectState, filterByProject, useProjectFilter } from "./project-selector";
import { useReturnFocus } from "./use-return-focus";
import { useDemoSession } from "../../lib/demo/providers";
import { useUpdateCalendarEntry } from "../../lib/demo/commands";
import { useCanAct } from "../../lib/demo/policy";
import { CommandError } from "./command-error";
import {
  WEEKDAY_LABELS_FA,
  WEEKDAY_SHORT_FA,
  formatDayFa,
  monthGrid,
  monthTitleFa,
  shiftMonth,
  shiftWeek,
  weekGrid,
  weekTitleFa,
} from "../../lib/demo/calendar-grid";
import { DIRECTION_LABEL_FA } from "../../lib/demo/presentation";

/**
 * A real calendar (ADR-0020 D9).
 *
 * The brief's objection to the previous surface was that it was "merely a dated
 * list wearing the appearance of a calendar". So this one has the behaviours a
 * calendar actually has: a month grid including adjacent-month days, today,
 * day selection, month and week navigation, events inside their day cell, and
 * a date change that persists.
 *
 * There is NO drag-to-reschedule. Earlier comments here described one as an
 * assist beside the picker; none was ever implemented, and a comment claiming a
 * feature is worse than a missing feature — the next person trusts it. Every
 * move goes through the picker, which is reachable from the
 * day picker in the event sheet, so the flow does not depend on a pointer
 * (brief §7.6, and journey A20's keyboard-only walk).
 */
type View = "month" | "week" | "agenda";

export function CalendarPage({ world }: { world: PanelSnapshot }) {
  const session = useDemoSession();
  const isMobile = useIsMobile();
  const { selected: selectedProject, known } = useProjectFilter(world);
  const canActPage = useCanAct();

  const today = session.clock.now().slice(0, 10);
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<View>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const detailFocus = useReturnFocus();
  /*
    Keyed on the LAST entry opened, not the currently open one. Keying on the
    current id unmounts the sheet the instant it closes — exactly when Radix
    would hand focus back to the event button — so the remount silently
    cancelled the focus return. This still resets the draft date between two
    different entries, which is what the key is for.
  */
  const [lastOpened, setLastOpened] = useState<string>("none");
  const openEntryFocused = (id: string) => {
    detailFocus.remember();
    setLastOpened(id);
    setOpenEntryId(id);
  };

  const entries = filterByProject(world.calendar, selectedProject);
  const scheduled = entries.filter((e) => e.date !== null);
  const unscheduled = entries.filter((e) => e.date === null);

  const byDay = useMemo(() => {
    const map = new Map<string, PanelCalendarEntry[]>();
    for (const entry of scheduled) {
      const key = entry.date!;
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [scheduled]);

  const cells = view === "week" ? weekGrid(anchor, today) : monthGrid(anchor, today);
  const openEntry = entries.find((e) => e.id === openEntryId) ?? null;
  /*
    The agenda is the anchored MONTH, listed. It used to be every dated entry
    in the world, while the toolbar above it — «بازهٔ قبلی», «بازهٔ بعدی»,
    «امروز» and a month title — stayed live and moved the anchor that the list
    never read. The title advanced to a month the list did not reflect and not
    one row changed. Scoped, the three controls do in this view exactly what
    they do in the other two, and the title is true.
  */
  const inMonth = (iso: string) => iso.slice(0, 7) === anchor.slice(0, 7);
  const agendaEntries = scheduled.filter((entry) => inMonth(entry.date!));

  if (!known) {
    return (
      <div className="space-y-5">
        <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">تقویم</h1>
          <ProjectSelector world={world} />
        </header>
        <UnknownProjectState />
      </div>
    );
  }

  return (
    <div className="drop-surface space-y-5">
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">تقویم</h1>
        <ProjectSelector world={world} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Tabs
          asChild
          value={view}
          onValueChange={(next) => setView(next as View)}
        >
        <section className="space-y-3">
          <CalendarToolbar
            titleFa={view === "week" ? weekTitleFa(anchor) : monthTitleFa(anchor)}
            onPrev={() => setAnchor(view === "week" ? shiftWeek(anchor, -1) : shiftMonth(anchor, -1))}
            onNext={() => setAnchor(view === "week" ? shiftWeek(anchor, 1) : shiftMonth(anchor, 1))}
            onToday={() => setAnchor(today)}
          />

          <TabsContent value="agenda">
            <AgendaView entries={agendaEntries} onOpen={openEntryFocused} />
          </TabsContent>
          <TabsContent value={view === "week" ? "week" : "month"}>
            <div
              data-testid={view === "week" ? "week-grid" : "month-grid"}
              className="space-y-1"
            >
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {WEEKDAY_LABELS_FA.map((day, index) => (
                  <span key={day}>
                    {isMobile ? (
                      // The full name stays available to a screen reader; only
                      // the visible glyph shortens.
                      <abbr title={day} className="no-underline">
                        {WEEKDAY_SHORT_FA[index]}
                      </abbr>
                    ) : (
                      day
                    )}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => (
                  <DayCellView
                    key={cell.iso}
                    cell={cell}
                    entries={byDay.get(cell.iso) ?? []}
                    selected={selectedDay === cell.iso}
                    compact={view === "month"}
                    onSelectDay={() => setSelectedDay(cell.iso)}
                    onOpenEntry={openEntryFocused}
                    onShowAll={() => {
                      setAnchor(cell.iso);
                      setSelectedDay(cell.iso);
                      setView("week");
                    }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {selectedDay === null ? null : (
            <p className="text-sm text-muted-foreground" data-testid="selected-day">
              روز انتخاب‌شده: {formatDayFa(selectedDay)}
            </p>
          )}
        </section>
        </Tabs>

        <aside className="space-y-3">
          <h2 className="text-lg font-semibold">بدون تاریخ</h2>
          {unscheduled.length === 0 ? (
            <EmptyState
              title="سینی خالی است"
              detail="هنوز خروجی تأییدشده‌ای برای برنامه‌ریزی وجود ندارد."
            />
          ) : (
            <ul className="space-y-2" data-testid="unscheduled-tray">
              {unscheduled.map((entry) => (
                <li key={entry.id} className="drop-material rounded-md border bg-card p-3 text-sm">
                  <p className="font-medium"><ContentText>{entry.titleFa}</ContentText></p>
                  <p className="pb-2 text-muted-foreground">
                    {materialsSummaryFa(world, entry)}
                  </p>
                  <Button
                    size="sm"
                    data-testid="set-date"
                    disabled={!canActPage.allowed}
                    onClick={() => {
                      openEntryFocused(entry.id);
                    }}
                  >
                    تعیین تاریخ
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <EventSheet
        // Keyed by the entry, so a date typed for one event cannot be saved
        // onto the next one opened. Every detail overlay on these surfaces is
        // a permanently-mounted sibling and needs this.
        key={lastOpened}
        world={world}
        entry={openEntry}
        open={openEntry !== null}
        anchorIso={selectedDay ?? anchor}
        onOpenChange={(next) =>
          detailFocus.onOpenChange(next, (value) => {
            if (!value) setOpenEntryId(null);
          })
        }
        onCloseAutoFocus={detailFocus.onCloseAutoFocus}
      />
    </div>
  );
}

function CalendarToolbar({
  titleFa,
  onPrev,
  onNext,
  onToday,
}: {
  titleFa: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        {/* RTL: "previous" sits on the right, so the chevron points that way. */}
        <Button variant="outline" size="sm" onClick={onPrev} aria-label="بازهٔ قبلی" data-testid="cal-prev">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} aria-label="بازهٔ بعدی" data-testid="cal-next">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} data-testid="cal-today">
          امروز
        </Button>
        <span className="ps-2 font-medium" data-testid="cal-title">
          <ContentText>{titleFa}</ContentText>
        </span>
      </div>

      {/*
        The `TabsList` sits inside the page's `Tabs` root rather than a local
        one, so each trigger's `aria-controls` points at a panel that actually
        exists. A standalone `Tabs` here left every trigger referencing a
        missing id — a WCAG 4.1.2 failure that renders perfectly.
      */}
      <TabsList>
        <TabsTrigger value="month">ماه</TabsTrigger>
        <TabsTrigger value="week">هفته</TabsTrigger>
        <TabsTrigger value="agenda">فهرست</TabsTrigger>
      </TabsList>
    </div>
  );
}

function DayCellView({
  cell,
  entries,
  selected,
  compact,
  onSelectDay,
  onOpenEntry,
  onShowAll,
}: {
  cell: { iso: string; labelFa: string; inCurrentMonth: boolean; isToday: boolean };
  entries: readonly PanelCalendarEntry[];
  selected: boolean;
  compact: boolean;
  onSelectDay: () => void;
  onOpenEntry: (id: string) => void;
  /** Opens the week around this day, where nothing is capped. */
  onShowAll: () => void;
}) {
  // Month cells cap at two entries plus a "+N" (brief §7.6).
  const shown = compact ? entries.slice(0, 2) : entries;
  const overflow = entries.length - shown.length;

  return (
    <div
      data-testid="day-cell"
      data-iso={cell.iso}
      data-today={cell.isToday ? "true" : undefined}
      data-outside={cell.inCurrentMonth ? undefined : "true"}
      className={[
        "min-h-24 rounded-md border p-1 text-start",
        cell.inCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
        cell.isToday ? "border-selected" : "border-border",
        selected ? "ring-2 ring-ring" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelectDay}
        className="w-full text-start text-xs"
        // Selection and "today" were carried by CSS classes alone, so every day
        // announced the same thing and choosing one produced no feedback at all
        // for a screen-reader user.
        aria-pressed={selected}
        aria-current={cell.isToday ? "date" : undefined}
        aria-label={`${formatDayFa(cell.iso)}${cell.isToday ? "، امروز" : ""}${
          cell.inCurrentMonth ? "" : "، خارج از این ماه"
        }`}
      >
        {/*
          `text-selected` on the day number measured 4.31:1 against the dark
          surface — below the 4.5:1 minimum. The bold weight and the border
          carry "today" instead, and the accessible name says the word.
        */}
        <span className={cell.isToday ? "font-bold underline underline-offset-4" : ""}>
          <ContentText>{cell.labelFa}</ContentText>
        </span>
      </button>
      <ul className="space-y-1 pt-1">
        {shown.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              data-testid="calendar-event"
              onClick={() => onOpenEntry(entry.id)}
              // Colour marks the project; the text is what states the meaning.
              className="w-full truncate rounded border border-selected bg-selected/10 px-1 py-0.5 text-start text-xs"
            >
              <ContentText>{entry.titleFa}</ContentText>
            </button>
          </li>
        ))}
        {overflow > 0 ? (
          <li>
            {/*
              A control, because the third event was unreachable from here:
              «+N مورد» was muted static text, and the only way to open what
              it counted was to switch views by hand. It now opens the week
              around this day, where the cap does not apply.
            */}
            <button
              type="button"
              data-testid="day-overflow"
              onClick={onShowAll}
              className="w-full rounded px-1 py-0.5 text-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              +{toPersianDigits(String(overflow))} مورد دیگر — دیدن هفته
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function AgendaView({
  entries,
  onOpen,
}: {
  entries: readonly PanelCalendarEntry[];
  onOpen: (id: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="در این ماه موردی برنامه‌ریزی نشده"
        detail="با «بازهٔ قبلی» و «بازهٔ بعدی» ماه‌های دیگر را ببینید."
      />
    );
  }
  return (
    <ul className="space-y-2" data-testid="agenda-list">
      {[...entries]
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        .map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              data-testid="calendar-event"
              onClick={() => onOpen(entry.id)}
              className="drop-material flex w-full flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 text-start"
            >
              <span className="font-medium"><ContentText>{entry.titleFa}</ContentText></span>
              <span className="text-sm text-muted-foreground">{formatDayFa(entry.date!)}</span>
            </button>
          </li>
        ))}
    </ul>
  );
}

/**
 * The event sheet — and the accessible route for changing a date.
 *
 * The picker is the only route to a new date, and it is the route that
 * always works, including by keyboard alone at mobile width (journey A20).
 */
function EventSheet({
  world,
  entry,
  open,
  anchorIso,
  onOpenChange,
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  entry: PanelCalendarEntry | null;
  open: boolean;
  anchorIso: string;
  onOpenChange: (next: boolean) => void;
  /** Returns focus to the control that opened this overlay. */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const isMobile = useIsMobile();
  const update = useUpdateCalendarEntry();
  const canAct = useCanAct();
  const [draftDate, setDraftDate] = useState("");

  if (entry === null) return null;

  const project = world.projects.find((p) => p.id === entry.projectId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="event-sheet"
        className={isMobile ? "w-full sm:max-w-none" : "w-[34rem] sm:max-w-[40rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <ContentText>{entry.titleFa}</ContentText>
            {/* A date is a plan, never a publication (V2 01 §7). */}
            <Badge variant="outline">
              {entry.date === null ? "آماده برنامه‌ریزی" : "برنامه‌ریزی‌شده"}
            </Badge>
          </SheetTitle>
          <SheetDescription><ContentText>{project?.titleFa ?? ""}</ContentText></SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">تاریخ</dt>
              <dd data-testid="event-date">
                {entry.date === null ? "تعیین‌نشده" : formatDayFa(entry.date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">محتواهای همراه</dt>
              <dd>{materialsSummaryFa(world, entry)}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <Label htmlFor="event-date-input">تغییر تاریخ</Label>
            {/* The kit's field, so it has the same states as every other one. */}
            <Input
              id="event-date-input"
              data-testid="event-date-input"
              type="date"
              dir="ltr"
              disabled={!canAct.allowed}
              value={draftDate === "" ? (entry.date ?? anchorIso) : draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                data-testid="save-event-date"
                pending={update.isPending}
                disabled={!canAct.allowed || update.isPending}
                onClick={() =>
                  update.mutate(
                    { entry, date: draftDate === "" ? (entry.date ?? anchorIso) : draftDate },
                    { onSuccess: () => onOpenChange(false) },
                  )
                }
              >
                ذخیرهٔ تاریخ
              </Button>
              {/*
                The way back. A scheduled output could never return to the
                undated tray: the field coalesced an empty value back to the
                existing date, so `null` was unreachable from this sheet, and
                the outputs page had already swapped its send button for a
                link. A wrong date could be changed but never withdrawn.
              */}
              {entry.date === null ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="unschedule-event"
                  disabled={!canAct.allowed || update.isPending}
                  onClick={() =>
                    update.mutate({ entry, date: null }, { onSuccess: () => onOpenChange(false) })
                  }
                >
                  برگرداندن به «بدون تاریخ»
                </Button>
              )}
            </div>
            {canAct.allowed ? null : (
              <p className="text-muted-foreground" data-testid="cannot-act-reason">{canAct.reason}</p>
            )}
            {update.isError ? <CommandError error={update.error} /> : null}
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href={`/studio/outputs?project=${entry.projectId}`}>دیدن خروجی</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** "روایت سردبیری، فیلم" — what actually travels with this plan item. */
function materialsSummaryFa(world: PanelSnapshot, entry: PanelCalendarEntry): string {
  const types = world.content
    .filter((c) => c.projectId === entry.projectId)
    .map((c) => DIRECTION_LABEL_FA[c.type] ?? c.type);
  const unique = [...new Set(types)];
  return unique.length === 0 ? "بدون محتوای همراه" : unique.join("، ");
}
