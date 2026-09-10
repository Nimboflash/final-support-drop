"use client";

/**
 * Bidi/locale primitives and the six 18 §4.1 state primitives — the canonical
 * components every later surface reuses verbatim (ticket P1; P4 wires, never
 * reinvents). All copy resolves through the central mapping (09 §9).
 */

import {
  CircleAlert,
  Copy,
  Inbox,
  Loader2,
  Lock,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { format as formatJalali } from "date-fns-jalali";
import { TZDate } from "@date-fns/tz";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { FA_UI } from "./labels-fa";

/* ------------------------------------------------------------------ */
/* BidiIdentifier — 09 §5/§12: Latin IDs, URLs and code live in dir=ltr
   isolation so surrounding Persian text never reorders them.          */
/* ------------------------------------------------------------------ */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] as string);
}

export function BidiIdentifier({
  value,
  withCopy = true,
  className,
}: {
  value: string;
  withCopy?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <span
      data-testid="bidi-identifier"
      className={cn("inline-flex items-center gap-1 align-middle", className)}
    >
      <bdi dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        {value}
      </bdi>
      {withCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? FA_UI.copied : FA_UI.copy}
          title={copied ? FA_UI.copied : FA_UI.copy}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Copy aria-hidden="true" />
        </Button>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* PersianDateTime — 09 §12 / 05 §2: store UTC, display Jalali Tehran,
   expose the raw instant for sorting.                                 */
/* ------------------------------------------------------------------ */

export function formatPersianDateTime(utcIso: string): { date: string; time: string } {
  const tehran = new TZDate(utcIso, "Asia/Tehran");
  return {
    date: toPersianDigits(formatJalali(tehran, "d MMMM yyyy")),
    time: toPersianDigits(formatJalali(tehran, "HH:mm")),
  };
}

/**
 * Jalali display for an ALL-DAY calendar date (V2 01 §7; ADR-0019 D8).
 *
 * Deliberately separate from `formatPersianDateTime`. An all-day date has no
 * time and no timezone: pushing "2026-09-12" through `TZDate(..., "Asia/Tehran")`
 * would parse it as midnight UTC and render the previous day in Tehran, which is
 * exactly the off-by-one that makes calendars untrustworthy.
 *
 * The Gregorian string stays canonical; this is display only — a formatted
 * Persian date is never stored (V2 01 §7).
 */
export function formatPersianCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  // Constructed from the parts, so no timezone is ever applied.
  const local = new Date(year, month - 1, day);
  return toPersianDigits(formatJalali(local, "d MMMM yyyy"));
}

export function PersianCalendarDate({ value, className }: { value: string; className?: string }) {
  return (
    <time data-testid="persian-calendar-date" dateTime={value} className={className}>
      {formatPersianCalendarDate(value)}
    </time>
  );
}

export function PersianDateTime({
  value,
  withTime = true,
  className,
}: {
  /** UTC ISO-8601 instant — storage format (09 §12). */
  value: string;
  withTime?: boolean;
  className?: string;
}) {
  const { date, time } = formatPersianDateTime(value);
  return (
    <time
      data-testid="persian-datetime"
      data-utc={value}
      dateTime={value}
      className={cn("whitespace-nowrap tabular-nums", className)}
    >
      {withTime ? `${date}، ${time}` : date}
    </time>
  );
}

/* ------------------------------------------------------------------ */
/* The six 18 §4.1 state primitives.                                    */
/* ------------------------------------------------------------------ */

function StateShell({
  icon,
  title,
  detail,
  action,
  testId,
  role = "status",
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
  testId: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      data-testid={testId}
      className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center"
    >
      <span aria-hidden="true" className="text-muted-foreground">{icon}</span>
      <p className="font-medium">{title}</p>
      {detail ? <p className="max-w-md text-sm text-muted-foreground">{detail}</p> : null}
      {action}
    </div>
  );
}

export function LoadingState({ title = FA_UI.loading }: { title?: string }) {
  return (
    <StateShell
      testId="loading-state"
      icon={<Loader2 className="size-6 motion-safe:animate-spin" />}
      title={title}
    />
  );
}

export function EmptyState({
  title = FA_UI.empty,
  detail = FA_UI.emptyDetail,
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return <StateShell testId="empty-state" icon={<Inbox className="size-6" />} title={title} detail={detail} action={action} />;
}

export function ErrorState({
  title = FA_UI.error,
  detail = FA_UI.errorDetail,
  diagnosticId,
  action,
}: {
  title?: string;
  detail?: string;
  /** Shown in bidi isolation — never a raw enum without Persian explanation (09 §9). */
  diagnosticId?: string;
  action?: ReactNode;
}) {
  return (
    <StateShell
      testId="error-state"
      role="alert"
      icon={<CircleAlert className="size-6 text-destructive" />}
      title={title}
      detail={detail}
      action={
        <div className="flex flex-col items-center gap-2">
          {diagnosticId ? (
            <p className="text-xs text-muted-foreground">
              {FA_UI.diagnosticId}: <BidiIdentifier value={diagnosticId} withCopy={false} />
            </p>
          ) : null}
          {action}
        </div>
      }
    />
  );
}

export function OfflineState({ title = FA_UI.offline, detail = FA_UI.offlineDetail }: { title?: string; detail?: string }) {
  return <StateShell testId="offline-state" role="alert" icon={<WifiOff className="size-6" />} title={title} detail={detail} />;
}

export function PermissionDeniedState({
  title = FA_UI.permissionDenied,
  detail = FA_UI.permissionDeniedDetail,
}: {
  title?: string;
  detail?: string;
}) {
  return <StateShell testId="permission-denied-state" icon={<Lock className="size-6" />} title={title} detail={detail} />;
}

/** Degraded-mode banner — honest about reduced capability (18 §4.1, §12). */
export function DegradedModeBanner({
  title = FA_UI.degraded,
  detail = FA_UI.degradedDetail,
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div
      role="status"
      data-testid="degraded-mode-banner"
      className="flex items-center gap-2 rounded-md border border-[var(--warning)] bg-[var(--warning)]/10 px-3 py-2 text-sm"
    >
      <TriangleAlert className="size-4 shrink-0 text-[var(--warning)]" aria-hidden="true" />
      <p>
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground"> — {detail}</span>
      </p>
    </div>
  );
}
