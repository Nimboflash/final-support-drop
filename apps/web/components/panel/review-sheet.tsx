"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  FreshnessBadge,
  ReviewStatusBadge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useIsMobile,
} from "@drop/ui";
import type {
  Concept,
  ContentItem,
  PanelSnapshot,
  ReviewStatus,
  Target,
} from "@drop/panel-domain";

/**
 * THE review sheet (V2 02 §6; ADR-0019 D4).
 *
 * One component, three doors: the concept card, the content card and the global
 * `/studio/reviews` queue all mount THIS and call the same command port.
 * Journey A14 requires the same action from any entry point to produce one audit
 * event and identical results — which is only true if there is one component and
 * one path, so a second "quick approve" implemented anywhere else is a defect by
 * construction.
 *
 * Commands are wired in P6; here the footer renders the actions with their
 * target version and the actor's eligibility, disabled with a stated reason.
 * ADR-0019 D18's rule for the graph applies to every door: the affordance is
 * visible and explained, never silently absent.
 */
export interface ReviewTargetView {
  readonly target: Target;
  readonly titleFa: string;
  readonly reviewStatus: ReviewStatus;
  readonly freshness: "CURRENT" | "STALE";
  readonly bodyFa: string;
  readonly versionLabel: string;
  readonly versions: readonly { readonly id: string; readonly number: number; readonly feedbackFa: string | null }[];
  readonly sourceIds: readonly string[];
  readonly blockedReasonFa: string | null;
}

export function ReviewSheet({
  view,
  world,
  open,
  onOpenChange,
  returnFocusTo,
}: {
  view: ReviewTargetView | null;
  world: PanelSnapshot;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** V2 02 §6 — "Focus returns to triggering card after closing." */
  returnFocusTo?: HTMLElement | null;
}) {
  const isMobile = useIsMobile();
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) returnFocusTo?.focus();
    wasOpen.current = open;
  }, [open, returnFocusTo]);

  if (view === null) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="review-sheet"
        // V2 02 §6 — a resizable desktop side sheet of about 560–720px, and a
        // full-screen drawer on mobile.
        className={isMobile ? "w-full sm:max-w-none" : "w-[38rem] sm:max-w-[45rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {view.titleFa}
            <ReviewStatusBadge status={view.reviewStatus} />
            {/* Freshness is a SEPARATE axis: an approved card can be stale. */}
            {view.freshness === "STALE" ? <FreshnessBadge freshness="STALE" /> : null}
          </SheetTitle>
          <SheetDescription>
            نسخهٔ هدف: <bdi dir="ltr">{view.versionLabel}</bdi>
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="preview" className="px-4">
          <TabsList>
            <TabsTrigger value="preview">پیش‌نمایش</TabsTrigger>
            <TabsTrigger value="sources">منابع و بررسی‌ها</TabsTrigger>
            <TabsTrigger value="comments">نظرها</TabsTrigger>
            <TabsTrigger value="versions">نسخه‌ها</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-3 py-4">
            {view.blockedReasonFa === null ? null : (
              <p
                role="status"
                data-testid="blocked-reason"
                className="rounded-md border border-warning bg-warning/10 p-3 text-sm"
              >
                {view.blockedReasonFa}
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-7">{view.bodyFa}</p>
          </TabsContent>

          <TabsContent value="sources" className="space-y-2 py-4">
            {view.sourceIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">منبعی به این مورد پیوست نشده است.</p>
            ) : (
              <ul className="space-y-2" data-testid="source-list">
                {view.sourceIds.map((id) => (
                  <li key={id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <bdi dir="ltr" className="font-mono text-xs">{id}</bdi>
                      {/* Every demo source is labelled fictional (V2 02 §7). */}
                      <Badge variant="outline">نمونهٔ نمایشی</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-2 py-4">
            <CommentList world={world} target={view.target} />
          </TabsContent>

          <TabsContent value="versions" className="space-y-2 py-4">
            <ul className="space-y-2" data-testid="version-list">
              {view.versions.map((version) => (
                <li key={version.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      نسخهٔ <bdi dir="ltr">{version.number}</bdi>
                    </span>
                    {version.id === view.target.versionId ? (
                      <Badge>نسخهٔ فعال</Badge>
                    ) : (
                      // Switching versions makes historical views read-only.
                      <Badge variant="outline">فقط خواندنی</Badge>
                    )}
                  </div>
                  {version.feedbackFa === null ? null : (
                    <p className="pt-2 text-muted-foreground">دلیل بازنگری: {version.feedbackFa}</p>
                  )}
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>

        <ReviewFooter view={view} />
      </SheetContent>
    </Sheet>
  );
}

function CommentList({ world, target }: { world: PanelSnapshot; target: Target }) {
  const comments = world.comments.filter(
    (c) => c.target.id === target.id && c.target.type === target.type,
  );
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده است.</p>;
  }
  return (
    <ul className="space-y-2" data-testid="comment-list">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-md border p-3 text-sm">
          <p className="leading-7">{comment.bodyFa}</p>
          <p className="pt-1 text-xs text-muted-foreground">
            <bdi dir="ltr">{comment.actorId}</bdi>
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The footer names the exact target version and states why an action is
 * unavailable. "Buttons show pending state; failures retain draft feedback"
 * (V2 02 §6) — the wiring itself is P6, so every control is disabled with its
 * reason rather than hidden.
 */
function ReviewFooter({ view }: { view: ReviewTargetView }) {
  const blocked = view.blockedReasonFa !== null;
  const reason = blocked
    ? "تا زمانی که وابستگی نبود مدرک برطرف نشود، تأیید ممکن نیست."
    : "ثبت تصمیم در تیکت P6 فعال می‌شود.";
  return (
    <div className="mt-auto space-y-2 border-t p-4" data-testid="review-footer">
      <p className="text-xs text-muted-foreground">
        تصمیم روی نسخهٔ <bdi dir="ltr">{view.versionLabel}</bdi> ثبت می‌شود. {reason}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled data-testid="approve-action">
          تأیید
        </Button>
        <Button variant="outline" disabled data-testid="request-changes-action">
          درخواست اصلاح
        </Button>
        <Button variant="ghost" disabled data-testid="reject-action">
          رد کردن
        </Button>
      </div>
    </div>
  );
}

/** Builds the sheet's view model from a concept or a content item. */
export function conceptView(world: PanelSnapshot, concept: Concept): ReviewTargetView {
  const versions = world.conceptVersions.filter((v) => v.conceptId === concept.id);
  const active = versions.find((v) => v.id === concept.activeVersionId) ?? versions[0];
  return {
    target: { type: "CONCEPT", id: concept.id, versionId: concept.activeVersionId },
    titleFa: active?.titleFa ?? concept.id,
    reviewStatus: concept.reviewStatus,
    freshness: concept.freshness,
    bodyFa: [active?.thesisFa, active?.dropRationaleFa].filter(Boolean).join("\n\n"),
    versionLabel: concept.activeVersionId,
    versions: versions.map((v) => ({ id: v.id, number: v.number, feedbackFa: v.feedbackAppliedFa })),
    sourceIds: [],
    blockedReasonFa: null,
  };
}

export function contentView(world: PanelSnapshot, item: ContentItem): ReviewTargetView {
  const versions = world.contentVersions.filter((v) => v.contentId === item.id);
  const active = versions.find((v) => v.id === item.activeVersionId) ?? versions[0];
  return {
    target: { type: "CONTENT", id: item.id, versionId: item.activeVersionId },
    titleFa: active?.titleFa ?? item.id,
    reviewStatus: item.reviewStatus,
    freshness: item.freshness,
    bodyFa: active?.bodyFa ?? "",
    versionLabel: item.activeVersionId,
    versions: versions.map((v) => ({ id: v.id, number: v.number, feedbackFa: null })),
    sourceIds: active?.sourceIds ?? [],
    blockedReasonFa: item.blockedReasonFa,
  };
}

export type { ReactNode };
