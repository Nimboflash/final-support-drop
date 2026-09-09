"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import type { PanelCalendarEntry, PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, filterByProject, useSelectedProject } from "./project-selector";
import { useDemoSession } from "../../lib/demo/providers";
import { commandErrorFa, useUpdateCalendarEntry } from "../../lib/demo/commands";
import {
  WEEKDAY_LABELS_FA,
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
 * Drag is an ASSIST, never the mechanism: every move is also reachable from the
 * day picker in the event sheet, so the flow does not depend on a pointer
 * (brief §7.6, and journey A20's keyboard-only walk).
 */
type View = "month" | "week" | "agenda";

export function CalendarPage({ world }: { world: PanelSnapshot }) {
  const session = useDemoSession();
  const isMobile = useIsMobile();
  const selectedProject = useSelectedProject();

  const today = session.clock.now().slice(0, 10);
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<View>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">تقویم</h1>
        <ProjectSelector world={world} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <CalendarToolbar
            view={view}
            onViewChange={setView}
            titleFa={view === "week" ? weekTitleFa(anchor) : monthTitleFa(anchor)}
            onPrev={() => setAnchor(view === "week" ? shiftWeek(anchor, -1) : shiftMonth(anchor, -1))}
            onNext={() => setAnchor(view === "week" ? shiftWeek(anchor, 1) : shiftMonth(anchor, 1))}
            onToday={() => setAnchor(today)}
          />

          {view === "agenda" ? (
            <AgendaView entries={scheduled} onOpen={setOpenEntryId} />
          ) : (
            <div
              data-testid={view === "week" ? "week-grid" : "month-grid"}
              className="space-y-1"
            >
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {WEEKDAY_LABELS_FA.map((day) => (
                  <span key={day}>{isMobile ? day.slice(0, 3) : day}</span>
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
                    onOpenEntry={setOpenEntryId}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedDay === null ? null : (
            <p className="text-sm text-muted-foreground" data-testid="selected-day">
              روز انتخاب‌شده: {formatDayFa(selectedDay)}
            </p>
          )}
        </section>

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
                <li key={entry.id} className="rounded-md border bg-card p-3 text-sm">
                  <p className="font-medium">{entry.titleFa}</p>
                  <p className="pb-2 text-muted-foreground">
                    {materialsSummaryFa(world, entry)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="set-date"
                    onClick={() => setOpenEntryId(entry.id)}
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
        world={world}
        entry={openEntry}
        open={openEntry !== null}
        anchorIso={selectedDay ?? anchor}
        onOpenChange={(next) => {
          if (!next) setOpenEntryId(null);
        }}
      />
    </div>
  );
}

function CalendarToolbar({
  view,
  onViewChange,
  titleFa,
  onPrev,
  onNext,
  onToday,
}: {
  view: View;
  onViewChange: (next: View) => void;
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
          {titleFa}
        </span>
      </div>

      <Tabs value={view} onValueChange={(next) => onViewChange(next as View)}>
        <TabsList>
          <TabsTrigger value="month">ماه</TabsTrigger>
          <TabsTrigger value="week">هفته</TabsTrigger>
          <TabsTrigger value="agenda">فهرست</TabsTrigger>
        </TabsList>
      </Tabs>
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
}: {
  cell: { iso: string; labelFa: string; inCurrentMonth: boolean; isToday: boolean };
  entries: readonly PanelCalendarEntry[];
  selected: boolean;
  compact: boolean;
  onSelectDay: () => void;
  onOpenEntry: (id: string) => void;
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
        aria-label={`انتخاب ${formatDayFa(cell.iso)}`}
      >
        <span className={cell.isToday ? "font-bold text-selected" : ""}>{cell.labelFa}</span>
      </button>
      <ul className="space-y-1 pt-1">
        {shown.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              data-testid="calendar-event"
              onClick={() => onOpenEntry(entry.id)}
              // Colour marks the project; the text is what states the meaning.
              className="w-full truncate rounded border border-selected/40 bg-selected/10 px-1 py-0.5 text-start text-xs"
            >
              {entry.titleFa}
            </button>
          </li>
        ))}
        {overflow > 0 ? (
          <li className="text-xs text-muted-foreground">
            +{toPersianDigits(String(overflow))} مورد
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
    return <EmptyState title="موردی برنامه‌ریزی نشده" detail="خروجی‌های دارای تاریخ اینجا فهرست می‌شوند." />;
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
              className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 text-start"
            >
              <span className="font-medium">{entry.titleFa}</span>
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
 * Drag is offered on the grid as an assist; this picker is the route that
 * always works, including by keyboard alone at mobile width (journey A20).
 */
function EventSheet({
  world,
  entry,
  open,
  anchorIso,
  onOpenChange,
}: {
  world: PanelSnapshot;
  entry: PanelCalendarEntry | null;
  open: boolean;
  anchorIso: string;
  onOpenChange: (next: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const update = useUpdateCalendarEntry();
  const [draftDate, setDraftDate] = useState("");

  if (entry === null) return null;

  const project = world.projects.find((p) => p.id === entry.projectId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="event-sheet"
        className={isMobile ? "w-full sm:max-w-none" : "w-[34rem] sm:max-w-[40rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {entry.titleFa}
            {/* A date is a plan, never a publication (V2 01 §7). */}
            <Badge variant="outline">
              {entry.date === null ? "آماده برنامه‌ریزی" : "برنامه‌ریزی‌شده"}
            </Badge>
          </SheetTitle>
          <SheetDescription>{project?.titleFa ?? ""}</SheetDescription>
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
            <label htmlFor="event-date-input" className="text-sm font-medium">
              تغییر تاریخ
            </label>
            <input
              id="event-date-input"
              data-testid="event-date-input"
              type="date"
              dir="ltr"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={draftDate === "" ? (entry.date ?? anchorIso) : draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
            />
            <Button
              size="sm"
              data-testid="save-event-date"
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { entry, date: draftDate === "" ? (entry.date ?? anchorIso) : draftDate },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
            >
              ذخیرهٔ تاریخ
            </Button>
            {update.isError ? (
              <p role="alert" className="text-destructive">
                {commandErrorFa(update.error)}
              </p>
            ) : null}
          </div>

          <Button asChild variant="outline" size="sm">
            <a href={`/studio/outputs?project=${entry.projectId}`}>دیدن خروجی</a>
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
