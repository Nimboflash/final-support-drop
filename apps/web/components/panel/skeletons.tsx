import { Skeleton } from "@drop/ui";
import type { ReactNode } from "react";

/**
 * Page-shaped loading states, one per destination (V2 02 §10).
 *
 * Every destination showed the same centred spinner while loading, which is
 * a state with no information in it: the person cannot tell what is coming,
 * and when it arrives the page jumps from a spinner to a layout. A skeleton
 * holds the SHAPE of the surface — its header, its grid, its columns — so the
 * arrival is a fill, not a jump. `role="status"` and `aria-busy` say what the
 * shape means to someone who cannot see it.
 *
 * Used twice each, deliberately: by the route's `loading.tsx` (the server's
 * boundary during navigation) and by the page's query boundary (the client's,
 * while the snapshot loads). The same shape both times, so a navigation and a
 * refetch look like one thing.
 */
function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid="loading-state"
      className="space-y-5"
    >
      {children}
    </div>
  );
}

function HeaderSkeleton({ withSelector = true, withAction = false }: { withSelector?: boolean; withAction?: boolean }) {
  return (
    <div className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
      <Skeleton className="h-9 w-40" />
      <div className="flex items-center gap-2">
        {withSelector ? <Skeleton className="h-9 w-56" /> : null}
        {withAction ? <Skeleton className="h-9 w-36" /> : null}
      </div>
    </div>
  );
}

function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/5" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={index === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />
      ))}
    </div>
  );
}

export function ConceptsSkeleton() {
  return (
    <Frame label="در حال بارگذاری کانسپت‌ها">
      <HeaderSkeleton withAction />
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={index} lines={3} />
        ))}
      </div>
    </Frame>
  );
}

export function OutputsSkeleton() {
  return (
    <Frame label="در حال بارگذاری خروجی‌ها">
      <HeaderSkeleton />
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]">
        {Array.from({ length: 3 }, (_, index) => (
          <CardSkeleton key={index} lines={1} />
        ))}
      </div>
    </Frame>
  );
}

export function ContentSkeleton() {
  return (
    <Frame label="در حال بارگذاری محتوا">
      <HeaderSkeleton />
      <div className="drop-rule flex items-baseline justify-between pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-6" />
      </div>
      <div className="grid items-start gap-x-5 gap-y-6 grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))]">
        {Array.from({ length: 3 }, (_, column) => (
          <div key={column} className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <Skeleton className="size-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="mt-2 size-2 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function OverviewSkeleton() {
  return (
    <Frame label="در حال بارگذاری نمای کلی">
      <HeaderSkeleton withAction />
      <div className="grid items-start gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, column) => (
          <div key={column} className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
            {column === 1 || column === 2 ? <CardSkeleton lines={1} /> : null}
            {column === 2 ? <CardSkeleton lines={1} /> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CalendarSkeleton() {
  return (
    <Frame label="در حال بارگذاری تقویم">
      <HeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="ms-2 h-5 w-28" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="mx-auto h-4 w-10" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }, (_, index) => (
              <Skeleton key={index} className="min-h-24 rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-24" />
          <CardSkeleton lines={1} />
        </div>
      </div>
    </Frame>
  );
}

export function ActivitySkeleton() {
  return (
    <Frame label="در حال بارگذاری تاریخچه">
      <HeaderSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-md border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ms-auto h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function EngineSkeleton() {
  return (
    <Frame label="در حال بارگذاری جریان کار">
      <HeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[28rem] rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-24" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function SettingsSkeleton() {
  return (
    <Frame label="در حال بارگذاری تنظیمات">
      <HeaderSkeleton withSelector={false} />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-40" />
        </div>
      ))}
    </Frame>
  );
}
