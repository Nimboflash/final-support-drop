"use client";

import { useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  FreshnessBadge,
  ReviewStatusBadge,
  toPersianDigits,
} from "@drop/ui";
import type { Concept, PanelSnapshot, ReviewStatus } from "@drop/panel-domain";
import { ReviewSheet, conceptView, type ReviewTargetView } from "./review-sheet";
import { ReviewActions } from "./review-actions";
import { commandErrorFa, useRequestRevision } from "../../lib/demo/commands";

/**
 * The candidate grid (V2 01 §4, 02 §6).
 *
 * V2 02 §6 asks for three columns at wide desktop, two at medium and one at
 * mobile, with readability — not the column count — setting the ~300px minimum.
 *
 * That is expressed as `auto-fill` over the CONTAINER rather than as viewport
 * breakpoints, because the two disagree: at a 768px viewport Tailwind's `sm:`
 * applies and asks for two columns, but the sidebar takes 256px so the track is
 * only 464px, and two 288px cards overflow the document. `min(18rem, 100%)`
 * makes a column incapable of exceeding its container, so the count follows the
 * space that actually exists.
 *
 * A rejected card STAYS VISIBLE with its reason: "Rejected does not silently
 * mean deleted" (V2 01 §4). Its revise-versus-replace choice is rendered here
 * and wired in P6.
 */
const FILTERS: readonly { value: ReviewStatus | "ALL"; labelFa: string }[] = [
  { value: "ALL", labelFa: "همه" },
  { value: "IN_REVIEW", labelFa: "در حال بررسی" },
  { value: "APPROVED", labelFa: "تأییدشده" },
  { value: "REVISION_REQUESTED", labelFa: "درخواست بازنگری" },
  { value: "REJECTED", labelFa: "ردشده" },
];

export function ConceptGrid({ world, projectId }: { world: PanelSnapshot; projectId: string }) {
  const [filter, setFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [view, setView] = useState<ReviewTargetView | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const all = world.concepts.filter((c) => c.projectId === projectId);
  const shown = filter === "ALL" ? all : all.filter((c) => c.reviewStatus === filter);
  const approved = all.filter((c) => c.reviewStatus === "APPROVED");

  if (all.length === 0) {
    return (
      <EmptyState
        title="هنوز کانسپتی ساخته نشده"
        detail="برای دیدن کانسپت‌ها، ابتدا مسیر را با ورودی خالی یا رفرنس شروع کنید."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر وضعیت">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={filter === option.value ? "default" : "outline"}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.labelFa}
            </Button>
          ))}
        </div>
        {/* V2 01 §4 — the explicit batch transition. Unavailable with zero
            approved cards; pending and rejected proposals never block it. */}
        <Button
          data-testid="continue-with-approved"
          disabled={approved.length === 0}
          title={
            approved.length === 0
              ? "دست‌کم یک کانسپت تأییدشده لازم است."
              : undefined
          }
        >
          ادامه با کانسپت‌های تأییدشده ({toPersianDigits(String(approved.length))})
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="موردی با این فیلتر نیست" detail="فیلتر دیگری را امتحان کنید." />
      ) : (
        <ul
          data-testid="concept-grid"
          className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]"
        >
          {shown.map((concept) => (
            <li key={concept.id}>
              <ConceptCard
                world={world}
                concept={concept}
                onOpen={(element) => {
                  trigger.current = element;
                  setView(conceptView(world, concept));
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ReviewSheet
        world={world}
        view={view}
        open={view !== null}
        onOpenChange={(next) => {
          if (!next) setView(null);
        }}
        returnFocusTo={trigger.current}
      />
    </div>
  );
}

function ConceptCard({
  world,
  concept,
  onOpen,
}: {
  world: PanelSnapshot;
  concept: Concept;
  onOpen: (element: HTMLElement) => void;
}) {
  const versions = world.conceptVersions.filter((v) => v.conceptId === concept.id);
  const active = versions.find((v) => v.id === concept.activeVersionId) ?? versions[0];
  const comments = world.comments.filter((c) => c.target.id === concept.id).length;

  return (
    <Card data-testid="concept-card" data-status={concept.reviewStatus} className="h-full gap-3">
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ReviewStatusBadge status={concept.reviewStatus} />
            {concept.freshness === "STALE" ? <FreshnessBadge freshness="STALE" /> : null}
            {concept.replacesConceptId === null ? null : (
              // Replacement lineage stays visible; the original remains in history.
              <Badge variant="outline" data-testid="replacement-lineage">
                جایگزین <bdi dir="ltr">{concept.replacesConceptId}</bdi>
              </Badge>
            )}
          </div>
          <button
            type="button"
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
            onClick={(event) => onOpen(event.currentTarget)}
          >
            {active?.titleFa ?? concept.id}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Long text truncates only in cards; the sheet carries it in full. */}
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{active?.thesisFa}</p>
        <p className="line-clamp-2 text-sm leading-7">{active?.dropRationaleFa}</p>

        {concept.reviewStatus === "REJECTED" && concept.rejectionReasonFa !== null ? (
          <p
            data-testid="rejection-reason"
            className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm"
          >
            دلیل رد: {concept.rejectionReasonFa}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {(active?.directions ?? []).map((direction) => (
            <Badge key={direction} variant="secondary" className="text-xs">
              {direction}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          نسخهٔ <bdi dir="ltr">{active?.number ?? 1}</bdi> — {toPersianDigits(String(comments))} نظر
        </p>

        {concept.reviewStatus === "REJECTED" ? (
          // V2 01 §4 — a rejected card offers an explicit revise OR replace, and
          // stays visible either way. Rejection is never deletion.
          <RejectedFollowUp concept={concept} />
        ) : (
          <ReviewActions
            target={{ type: "CONCEPT", id: concept.id, versionId: concept.activeVersionId }}
            expectedRowVersion={concept.rowVersion}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What a rejected concept offers next (V2 01 §4; AC-P6.3).
 *
 * Revise keeps the concept id and produces a new version that returns to review
 * without inheriting approval. Replace mints a new id carrying
 * `replacesConceptId`, and the original stays visible in history. Neither
 * deletes anything, and neither starts an unreviewable loop: both land back in
 * review.
 */
function RejectedFollowUp({ concept }: { concept: Concept }) {
  const revision = useRequestRevision();
  const target = { type: "CONCEPT" as const, id: concept.id, versionId: concept.activeVersionId };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          data-testid="revise-idea"
          disabled={revision.isPending}
          onClick={() =>
            revision.mutate({
              target,
              feedbackFa: concept.rejectionReasonFa ?? "بازنگری پس از رد.",
              route: "CONCEPT_REVISION",
            })
          }
        >
          بازنگری این ایده
        </Button>
        <Button
          size="sm"
          variant="ghost"
          data-testid="generate-replacement"
          disabled={revision.isPending}
          onClick={() =>
            revision.mutate({
              target,
              feedbackFa: concept.rejectionReasonFa ?? "ساخت جایگزین پس از رد.",
              route: "CONCEPT_REPLACEMENT",
            })
          }
        >
          ساخت جایگزین
        </Button>
      </div>
      {revision.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {commandErrorFa(revision.error)}
        </p>
      ) : null}
    </div>
  );
}
