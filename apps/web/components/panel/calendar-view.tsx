"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PersianCalendarDate,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toPersianDigits,
} from "@drop/ui";
import type { PanelCalendarEntry, PanelSnapshot } from "@drop/panel-domain";
import { scheduledEntries, unscheduledEntries } from "../../lib/demo/read-models";

/**
 * The calendar (V2 01 §7, 02 §8; ADR-0019 D7, D8).
 *
 * Three things this surface must never do, each of which it would be easy to do
 * accidentally:
 *
 *  1. Say "published". A date is a plan, not a publication — an item reads
 *     «آماده برنامه‌ریزی» or «برنامه‌ریزی‌شده» and nothing else.
 *  2. Store a formatted Persian date. The ISO calendar date is canonical and the
 *     Jalali rendering is display only.
 *  3. Invent a date. A package with no target date lands in the unscheduled tray
 *     with «تعیین تاریخ», never on a guessed day.
 *
 * The week starts Saturday and the timezone is Asia/Tehran (V2 01 §7).
 */
const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export function CalendarView({ world }: { world: PanelSnapshot }) {
  const scheduled = scheduledEntries(world);
  const unscheduled = unscheduledEntries(world);
  const [selected, setSelected] = useState<PanelCalendarEntry | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <Tabs defaultValue="month" className="space-y-4">
        <TabsList>
          <TabsTrigger value="month">ماه</TabsTrigger>
          <TabsTrigger value="week">هفته</TabsTrigger>
          <TabsTrigger value="agenda">فهرست</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <MonthGrid entries={scheduled} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="week">
          <WeekStrip entries={scheduled} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="agenda">
          {/* The agenda is the fully keyboard-accessible equivalent of the grid
              (V2 02 §8) — the calendar is never drag-only (journey A20). */}
          {scheduled.length === 0 ? (
            <EmptyState title="موردی برنامه‌ریزی نشده" detail="بسته‌های دارای تاریخ اینجا فهرست می‌شوند." />
          ) : (
            <ul className="space-y-2" data-testid="agenda-list">
              {[...scheduled]
                .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                .map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(entry)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 text-start"
                    >
                      <span className="font-medium">{entry.titleFa}</span>
                      <span className="text-sm text-muted-foreground">
                        <PersianCalendarDate value={entry.date!} />
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <aside className="space-y-3">
        <h2 className="text-lg font-semibold">بدون تاریخ</h2>
        {unscheduled.length === 0 ? (
          <EmptyState title="سینی خالی است" detail="هر بستهٔ بدون تاریخ اینجا منتظر می‌ماند." />
        ) : (
          <ul className="space-y-2" data-testid="unscheduled-tray">
            {unscheduled.map((entry) => (
              <li key={entry.id} className="rounded-md border bg-card p-3">
                <p className="font-medium">{entry.titleFa}</p>
                <p className="pb-2 text-sm text-muted-foreground">آماده برنامه‌ریزی</p>
                {/* Keyboard-accessible date edit; the drag affordance is the
                    alternative, not the only route (journey A20). */}
                <Button size="sm" variant="outline" disabled data-testid="set-date">
                  تعیین تاریخ
                </Button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {selected === null ? null : <EventDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MonthGrid({
  entries,
  onSelect,
}: {
  entries: readonly PanelCalendarEntry[];
  onSelect: (entry: PanelCalendarEntry) => void;
}) {
  const byDate = new Map<string, PanelCalendarEntry[]>();
  for (const entry of entries) {
    const key = entry.date!;
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  }
  const days = [...byDate.keys()].sort();

  if (days.length === 0) {
    return <EmptyState title="ماه خالی است" detail="هنوز موردی برنامه‌ریزی نشده." />;
  }

  return (
    <div className="space-y-2" data-testid="month-grid">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {/* Week starts Saturday (V2 01 §7). */}
        {WEEKDAYS_FA.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <ul className="space-y-2">
        {days.map((day) => {
          const cell = byDate.get(day) ?? [];
          // Month cells show two or three compact entries with "+N" (V2 02 §8).
          const shown = cell.slice(0, 3);
          const overflow = cell.length - shown.length;
          return (
            <li key={day} className="rounded-md border bg-card p-3">
              <p className="pb-2 text-sm font-medium">
                <PersianCalendarDate value={day} />
              </p>
              <ul className="space-y-1">
                {shown.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="w-full truncate rounded border px-2 py-1 text-start text-sm"
                    >
                      {entry.titleFa}
                    </button>
                  </li>
                ))}
                {overflow > 0 ? (
                  <li className="text-xs text-muted-foreground">
                    +{toPersianDigits(String(overflow))} مورد دیگر
                  </li>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WeekStrip({
  entries,
  onSelect,
}: {
  entries: readonly PanelCalendarEntry[];
  onSelect: (entry: PanelCalendarEntry) => void;
}) {
  if (entries.length === 0) {
    return <EmptyState title="هفته خالی است" detail="هنوز موردی برنامه‌ریزی نشده." />;
  }
  return (
    <ul className="space-y-2" data-testid="week-strip">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className="flex w-full items-center justify-between gap-3 rounded-md border bg-card p-3 text-start"
          >
            <span>{entry.titleFa}</span>
            <PersianCalendarDate value={entry.date!} className="text-sm text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function EventDetail({
  entry,
  onClose,
}: {
  entry: PanelCalendarEntry;
  onClose: () => void;
}) {
  return (
    <Card className="lg:col-span-2" data-testid="event-detail">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {entry.titleFa}
          {/* Never "published" because a date was chosen (V2 01 §7). */}
          <Badge variant="outline">
            {entry.date === null ? "آماده برنامه‌ریزی" : "برنامه‌ریزی‌شده"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">تاریخ</dt>
            <dd>
              {entry.date === null ? (
                "تعیین‌نشده"
              ) : (
                <>
                  <PersianCalendarDate value={entry.date} />{" "}
                  <bdi dir="ltr" className="text-xs text-muted-foreground">
                    ({entry.date})
                  </bdi>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">منطقهٔ زمانی</dt>
            <dd>
              <bdi dir="ltr">{entry.timezone}</bdi>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">نسخهٔ بسته</dt>
            <dd>
              <bdi dir="ltr">{entry.packageVersionId}</bdi>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مالک</dt>
            <dd>
              <bdi dir="ltr">{entry.ownerId}</bdi>
            </dd>
          </div>
        </dl>
        {entry.noteFa === "" ? null : <p className="text-muted-foreground">{entry.noteFa}</p>}
        <Button size="sm" variant="outline" onClick={onClose}>
          بستن
        </Button>
      </CardContent>
    </Card>
  );
}
