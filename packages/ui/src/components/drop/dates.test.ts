import { describe, expect, it } from "vitest";
import { formatPersianCalendarDate, formatPersianDateTime, toPersianDigits } from "../../index";

/**
 * Ticket P7 — Jalali month boundaries and the Tehran timezone edge.
 *
 * Both are easy to get wrong and invisible when wrong: an off-by-one date looks
 * like a plausible date. V2 01 §7 requires Asia/Tehran with a Saturday week
 * start, and ADR-0019 D8 separates all-day CALENDAR DATES from timed UTC
 * INSTANTS precisely because conflating them produces exactly this class of bug.
 */
describe("all-day calendar dates carry no timezone (ADR-0019 D8)", () => {
  it("renders the Jalali month boundary correctly", () => {
    // 1405/06/31 → 1405/07/01 is the Shahrivar/Mehr boundary.
    expect(formatPersianCalendarDate("2026-09-22")).toBe(toPersianDigits("31 شهریور 1405"));
    expect(formatPersianCalendarDate("2026-09-23")).toBe(toPersianDigits("1 مهر 1405"));
  });

  it("does not shift a date by a timezone", () => {
    // The bug this guards: pushing "2026-09-12" through a Tehran-zoned Date
    // parses it as midnight UTC, which is 03:30 Tehran the SAME day but the
    // PREVIOUS day for any zone behind UTC — and the reader sees a plausible
    // wrong date.
    expect(formatPersianCalendarDate("2026-09-12")).toBe(toPersianDigits("21 شهریور 1405"));
    expect(formatPersianCalendarDate("2026-01-01")).toBe(toPersianDigits("11 دی 1404"));
  });

  it("renders Persian digits, never Latin ones", () => {
    expect(formatPersianCalendarDate("2026-09-12")).not.toMatch(/[0-9]/);
  });
});

describe("timed instants convert through Asia/Tehran (09 §12)", () => {
  it("crosses the Tehran day boundary correctly", () => {
    // Tehran is UTC+03:30, so 2026-09-22T21:00:00Z is 00:30 on the 23rd local —
    // a different Jalali day from the same instant read as UTC.
    const late = formatPersianDateTime("2026-09-22T21:00:00Z");
    expect(late.date).toBe(toPersianDigits("1 مهر 1405"));
    expect(late.time).toBe(toPersianDigits("00:30"));

    // Half an hour earlier is still the previous day.
    const earlier = formatPersianDateTime("2026-09-22T20:00:00Z");
    expect(earlier.date).toBe(toPersianDigits("31 شهریور 1405"));
  });

  it("renders the demo epoch in Tehran local time", () => {
    const epoch = formatPersianDateTime("2026-09-06T09:00:00Z");
    expect(epoch.date).toBe(toPersianDigits("15 شهریور 1405"));
    expect(epoch.time).toBe(toPersianDigits("12:30"));
  });

  it("an all-day date and the same day's instant agree on the day", () => {
    // Midday UTC is unambiguous in Tehran, so the two formatters must agree —
    // if they disagree here, one of them is applying a zone it should not.
    expect(formatPersianCalendarDate("2026-09-06")).toBe(
      formatPersianDateTime("2026-09-06T12:00:00Z").date,
    );
  });
});
