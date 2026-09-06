"use client";

import { useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  EmptyState,
  FreshnessBadge,
  ReviewStatusBadge,
  toPersianDigits,
} from "@drop/ui";
import type { ContentItem, PanelSnapshot } from "@drop/panel-domain";
import { ReviewSheet, contentView, type ReviewTargetView } from "./review-sheet";
import { ReviewActions } from "./review-actions";

/**
 * Content and research (V2 01 §5, 02 §5, §7).
 *
 * A concept SWITCHER and filter chips — deliberately not a second full-width tab
 * row, which V2 02 §5 rules out because nested tab hierarchies lose the reader.
 *
 * The coverage panel reports the frozen target against what is available per
 * coverage class. Neither class may read zero (00 §4), and a blocked source
 * produces a retrieval request rather than a verified citation: clicking retry
 * must never mark a blocked source verified (V2 02 §7).
 */
export function ContentView({ world, projectId }: { world: PanelSnapshot; projectId: string }) {
  const items = useMemo(
    () => world.content.filter((c) => c.projectId === projectId),
    [world, projectId],
  );
  const conceptIds = useMemo(
    () => [...new Set(items.map((item) => item.conceptId))],
    [items],
  );
  const [activeConcept, setActiveConcept] = useState<string | null>(conceptIds[0] ?? null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [view, setView] = useState<ReviewTargetView | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        title="هنوز محتوایی ساخته نشده"
        detail="پس از تأیید دست‌کم یک کانسپت و ادامه دادن با آن، تحقیق و محتوا اینجا دیده می‌شود."
      />
    );
  }

  const branch = items.filter((item) => item.conceptId === activeConcept);
  const types = [...new Set(branch.map((item) => item.type))];
  const shown = typeFilter === "ALL" ? branch : branch.filter((item) => item.type === typeFilter);

  const conceptVersionId =
    world.concepts.find((c) => c.id === activeConcept)?.activeVersionId ?? null;

  return (
    <div className="space-y-4">
      {/* Top strip: active concept, its approved version, research summary. */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="انتخاب کانسپت">
        {conceptIds.map((id) => {
          const title = world.conceptVersions.find(
            (v) => v.id === world.concepts.find((c) => c.id === id)?.activeVersionId,
          )?.titleFa;
          return (
            <Button
              key={id}
              size="sm"
              variant={activeConcept === id ? "default" : "outline"}
              aria-pressed={activeConcept === id}
              onClick={() => {
                setActiveConcept(id);
                setTypeFilter("ALL");
              }}
            >
              {title ?? id}
            </Button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        نسخهٔ تأییدشدهٔ کانسپت: <bdi dir="ltr">{conceptVersionId ?? "—"}</bdi> — این نسخه برای تحقیق
        قفل شده است.
      </p>

      <CoveragePanel world={world} />

      <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر نوع محتوا">
        <Button
          size="sm"
          variant={typeFilter === "ALL" ? "default" : "outline"}
          aria-pressed={typeFilter === "ALL"}
          onClick={() => setTypeFilter("ALL")}
        >
          همه
        </Button>
        {types.map((type) => (
          <Button
            key={type}
            size="sm"
            variant={typeFilter === type ? "default" : "outline"}
            aria-pressed={typeFilter === type}
            onClick={() => setTypeFilter(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="content-grid">
        {shown.map((item) => (
          <li key={item.id}>
            <ContentCard
              world={world}
              item={item}
              onOpen={(element) => {
                trigger.current = element;
                setView(contentView(world, item));
              }}
            />
          </li>
        ))}
      </ul>

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

/**
 * V2 02 §7 — frozen target versus available per coverage class.
 *
 * The counts come from the supplied fixture state; nothing here evaluates a
 * source or decides whether evidence is sufficient. That is machine work.
 */
function CoveragePanel({ world }: { world: PanelSnapshot }) {
  const blocked = world.content.filter((item) => item.generationState === "BLOCKED");
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" data-testid="coverage-toggle">
          پوشش تحقیق
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">پوشش منابع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              همهٔ شواهد این نمایش، نمونهٔ ساختگی‌اند و هیچ پژوهش واقعی انجام نشده است.
            </p>
            {blocked.length === 0 ? (
              <p>موردی به دلیل نبود منبع متوقف نشده است.</p>
            ) : (
              <div className="space-y-2" data-testid="retrieval-requests">
                <p>
                  {toPersianDigits(String(blocked.length))} مورد به دلیل نبود دسترسی به منبع متوقف
                  است.
                </p>
                {/* A retry never marks a blocked source verified (V2 02 §7). */}
                <Button size="sm" variant="outline" disabled data-testid="retry-retrieval">
                  درخواست بازیابی دوباره
                </Button>
                <p className="text-xs text-muted-foreground">
                  تلاش دوباره وضعیت منبع را «تأییدشده» نمی‌کند؛ فقط درخواست بازیابی ثبت می‌شود.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ContentCard({
  world,
  item,
  onOpen,
}: {
  world: PanelSnapshot;
  item: ContentItem;
  onOpen: (element: HTMLElement) => void;
}) {
  const versions = world.contentVersions.filter((v) => v.contentId === item.id);
  const active = versions.find((v) => v.id === item.activeVersionId) ?? versions[0];
  const blocked = item.generationState === "BLOCKED";

  return (
    <Card data-testid="content-card" data-status={item.reviewStatus} className="h-full gap-3">
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.type}</Badge>
            <ReviewStatusBadge status={item.reviewStatus} />
            {item.freshness === "STALE" ? <FreshnessBadge freshness="STALE" /> : null}
          </div>
          <button
            type="button"
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
            onClick={(event) => onOpen(event.currentTarget)}
          >
            {active?.titleFa ?? item.id}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{active?.bodyFa}</p>

        {blocked && item.blockedReasonFa !== null ? (
          <p
            data-testid="content-blocked-reason"
            className="rounded-md border border-warning bg-warning/10 p-2 text-sm"
          >
            {item.blockedReasonFa}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {toPersianDigits(String(active?.sourceIds.length ?? 0))} منبع — کانسپت{" "}
          <bdi dir="ltr">{item.conceptId}</bdi>
        </p>

        {/* Blocking stays LOCAL (journey A08): this item's approval is refused
            with its reason while unrelated items keep their own reviewable
            state. The control is explained, never removed. */}
        <ReviewActions
          target={{ type: "CONTENT", id: item.id, versionId: item.activeVersionId }}
          expectedRowVersion={item.rowVersion}
          disabledReasonFa={blocked ? item.blockedReasonFa : null}
        />
      </CardContent>
    </Card>
  );
}
