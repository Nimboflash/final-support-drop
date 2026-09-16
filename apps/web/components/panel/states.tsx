"use client";

import {
  Button,
  DegradedModeBanner,
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDeniedState,
  formatPersianDateTime,
} from "@drop/ui";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { GatewayError } from "@drop/machine-gateway";

/**
 * The six states every destination must render (V2 02 §10; 18 §4.1).
 *
 * Centralized so a surface cannot accidentally ship five of them. The important
 * distinction encoded here: a DISCONNECTED gateway keeps its content visible
 * under a degraded banner with a last-sync timestamp — "Keep stale content
 * visible with last-sync timestamp; do not erase it on disconnect" — whereas an
 * error with nothing to show falls back to the error state.
 */
export function QueryBoundary<T>({
  query,
  children,
  pending,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
  /** The surface's own shape while it loads. Falls back to the generic state. */
  pending?: ReactNode;
}) {
  /*
    The last SUCCESSFUL read, from the query itself. Six of the seven
    destinations passed no timestamp at all, and the one that did passed the
    current wall-clock — "last synced: now", over data that had just failed
    to refresh. `dataUpdatedAt` is the instant the data on screen actually
    arrived, which is the only number the sentence is about.
  */
  const syncedAt =
    query.dataUpdatedAt > 0 ? formatPersianDateTime(new Date(query.dataUpdatedAt).toISOString()) : null;
  if (query.isPending) return <>{pending ?? <LoadingState />}</>;

  if (query.isError) {
    const error = query.error;
    if (error instanceof GatewayError && error.reason === "UNAUTHORIZED") {
      // No privileged data may render behind this (AC-P4.11).
      return <PermissionDeniedState />;
    }
    if (error instanceof GatewayError && error.reason === "MACHINE_SYSTEM_DISCONNECTED") {
      // Content stays visible beneath the banner. Deliberately NOT OfflineState,
      // which replaces the content — losing what the reviewer was reading is
      // worse than showing it with a caveat (V2 02 §10).
      return (
        <div className="space-y-3">
          <DegradedModeBanner
            detail={
              syncedAt === null
                ? undefined
                : `آخرین همگام‌سازی: ${syncedAt.date}، ${syncedAt.time}. داده‌های نمایش‌داده‌شده ممکن است قدیمی باشند.`
            }
          />
          {query.data === undefined ? null : children(query.data)}
        </div>
      );
    }
    return (
      <ErrorState
        diagnosticId={error instanceof GatewayError ? error.diagnosticId : undefined}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            تلاش دوباره
          </Button>
        }
      />
    );
  }

  const data = query.data;
  if (data === undefined) return <>{pending ?? <LoadingState />}</>;
  return <>{children(data)}</>;
}

export { EmptyState };
