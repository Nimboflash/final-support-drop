import { toPersianDigits } from "@drop/ui";
import {
  addDays,
  addMonths,
  endOfMonth,
  format as formatJalali,
  startOfMonth,
  startOfWeek,
} from "date-fns-jalali";

/**
 * Calendar arithmetic (ADR-0020 D9).
 *
 * The brief's complaint about the previous surface was precise: it was "merely
 * a dated list wearing the appearance of a calendar". A real month grid needs
 * adjacent-month days, a today marker, day selection and navigation — and all
 * of that is arithmetic, which belongs here rather than inside a component
 * where it cannot be tested.
 *
 * Everything is computed in the JALALI calendar, because that is what the grid
 * displays: a Gregorian month grid relabelled in Persian digits would put the
 * month boundary in the wrong cell. `date-fns-jalali` is already a pinned
 * dependency (ADR-0020 D9 reuses rather than adds).
 *
 * Dates crossing this module are ISO calendar dates (`YYYY-MM-DD`) — the stored
 * canonical form of ADR-0019 D8. A formatted Persian date is never canonical.
 */

/** Saturday. `date-fns-jalali` uses 0 = Sunday, so Saturday is 6 (V2 01 §7). */
export const WEEK_STARTS_ON = 6;

export const WEEKDAY_LABELS_FA = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export interface DayCell {
  /** ISO calendar date — the key events are matched on. */
  readonly iso: string;
  /** Jalali day-of-month, already in Persian digits. */
  readonly labelFa: string;
  /** False for the leading/trailing days borrowed from adjacent months. */
  readonly inCurrentMonth: boolean;
  readonly isToday: boolean;
}

function toIso(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` without a timezone, so the day cannot shift. */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/**
 * Six weeks, always.
 *
 * A grid that changes height between months makes the surrounding layout jump
 * on every navigation; a fixed six-week grid is what real calendars do.
 */
export function monthGrid(anchorIso: string, todayIso: string): readonly DayCell[] {
  const anchor = fromIso(anchorIso);
  const firstCell = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);

  const cells: DayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(firstCell, index);
    const iso = toIso(date);
    cells.push({
      iso,
      labelFa: toPersianDigits(formatJalali(date, "d")),
      inCurrentMonth: date >= monthStart && date <= monthEnd,
      isToday: iso === todayIso,
    });
  }
  return cells;
}

export function weekGrid(anchorIso: string, todayIso: string): readonly DayCell[] {
  const start = startOfWeek(fromIso(anchorIso), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const iso = toIso(date);
    return {
      iso,
      labelFa: toPersianDigits(formatJalali(date, "d")),
      inCurrentMonth: true,
      isToday: iso === todayIso,
    };
  });
}

/** «شهریور ۱۴۰۵» — the range title above the grid. */
export function monthTitleFa(anchorIso: string): string {
  return toPersianDigits(formatJalali(fromIso(anchorIso), "MMMM yyyy"));
}

export function weekTitleFa(anchorIso: string): string {
  const start = startOfWeek(fromIso(anchorIso), { weekStartsOn: WEEK_STARTS_ON });
  const end = addDays(start, 6);
  return `${toPersianDigits(formatJalali(start, "d MMMM"))} تا ${toPersianDigits(
    formatJalali(end, "d MMMM yyyy"),
  )}`;
}

export function shiftMonth(anchorIso: string, delta: number): string {
  return toIso(addMonths(fromIso(anchorIso), delta));
}

export function shiftWeek(anchorIso: string, delta: number): string {
  return toIso(addDays(fromIso(anchorIso), delta * 7));
}

export function formatDayFa(iso: string): string {
  return toPersianDigits(formatJalali(fromIso(iso), "d MMMM yyyy"));
}
