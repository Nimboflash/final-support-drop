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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  useIsMobile,
} from "@drop/ui";
import type { ContentItem, PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, filterByProject, useSelectedProject } from "./project-selector";
import { commandErrorFa, useRequestRevision, useReviewItem } from "../../lib/demo/commands";
import {
  CONTENT_STATE_ACTION_FA,
  CONTENT_STATE_LABEL_FA,
  DIRECTION_LABEL_FA,
  contentStateOf,
  type ContentState,
} from "../../lib/demo/presentation";

/**
 * Content — everything produced from the selected concepts (ADR-0020 D2).
 *
 * This absorbed the separate Reviews queue. There is no parallel review surface
 * and no concept/content tab pair: a person sees the content grouped under the
 * concept it came from, and decides in place.
 *
 * A missing source does NOT disable every control. The brief is specific about
 * this (§7.4): show one clear, actionable message and offer the action that
 * resolves it.
 */
const STATE_TONE: Record<ContentState, string> = {
  draft: "border-border",
  needs_input: "border-warning",
  ready_for_review: "border-selected/50",
  approved: "border-success/60",
};

export function ContentPage({ world }: { world: PanelSnapshot }) {
  const selectedProject = useSelectedProject();
  const [openId, setOpenId] = useState<string | null>(null);

  const items = filterByProject(world.content, selectedProject);
  const open = items.find((i) => i.id === openId) ?? null;

  // Grouped under the parent concept — always, so a content item is never
  // orphaned from the idea it came from (brief §4).
  const groups = new Map<string, ContentItem[]>();
  for (const item of items) {
    groups.set(item.conceptId, [...(groups.get(item.conceptId) ?? []), item]);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">محتوا</h1>
        <ProjectSelector world={world} />
      </header>

      {groups.size === 0 ? (
        <EmptyState
          title="هنوز محتوایی ساخته نشده"
          detail="ابتدا یک کانسپت را برای تولید محتوا انتخاب کنید."
          action={
            <Button asChild variant="outline">
              <a href="/studio/concepts">رفتن به کانسپت‌ها</a>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {[...groups].map(([conceptId, groupItems]) => {
            const concept = world.concepts.find((c) => c.id === conceptId);
            const version = world.conceptVersions.find(
              (v) => v.id === concept?.activeVersionId,
            );
            return (
              <section key={conceptId} className="space-y-3" data-testid="content-group">
                <h2 className="text-lg font-semibold">{version?.titleFa ?? "کانسپت"}</h2>
                <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
                  {groupItems.map((item) => (
                    <li key={item.id}>
                      <ContentCard item={item} world={world} onOpen={() => setOpenId(item.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ContentDetail
        world={world}
        item={open}
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
      />
    </div>
  );
}

function ContentCard({
  item,
  world,
  onOpen,
}: {
  item: ContentItem;
  world: PanelSnapshot;
  onOpen: () => void;
}) {
  const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
  const state = contentStateOf(item);
  const action = CONTENT_STATE_ACTION_FA[state];

  return (
    <Card data-testid="content-card" data-state={state} className={`h-full gap-3 ${STATE_TONE[state]}`}>
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{DIRECTION_LABEL_FA[item.type] ?? item.type}</Badge>
            <Badge variant="outline" data-testid="content-state">
              {CONTENT_STATE_LABEL_FA[state]}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
          >
            {version?.titleFa ?? "محتوای بدون عنوان"}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{version?.bodyFa}</p>
        {action === null ? null : (
          <p data-testid="content-action" className="rounded-md border border-warning bg-warning/10 p-2 text-sm">
            {action}
          </p>
        )}
        <Button size="sm" variant="outline" onClick={onOpen} data-testid="open-content">
          باز کردن و ویرایش
        </Button>
      </CardContent>
    </Card>
  );
}

function ContentDetail({
  world,
  item,
  open,
  onOpenChange,
}: {
  world: PanelSnapshot;
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [note, setNote] = useState("");

  if (item === null) return null;

  const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
  const state = contentStateOf(item);
  const target = { type: "CONTENT" as const, id: item.id, versionId: item.activeVersionId };
  const needsSource = state === "needs_input";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="content-detail"
        className={isMobile ? "w-full sm:max-w-none" : "w-[42rem] sm:max-w-[50rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {version?.titleFa ?? "محتوا"}
            <Badge variant="outline">{CONTENT_STATE_LABEL_FA[state]}</Badge>
          </SheetTitle>
          <SheetDescription>
            {DIRECTION_LABEL_FA[item.type] ?? item.type}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          {needsSource ? (
            <div
              data-testid="needs-source"
              className="space-y-2 rounded-md border border-warning bg-warning/10 p-3 text-sm"
            >
              <p>{CONTENT_STATE_ACTION_FA.needs_input}</p>
              <Button size="sm" variant="outline" data-testid="add-source">
                افزودن منبع
              </Button>
            </div>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-7">{version?.bodyFa}</p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">درخواست تغییر</h3>
            <Textarea
              data-testid="content-feedback"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثلاً: لحن را صمیمی‌تر کن."
              rows={3}
            />
          </div>

          {review.isError || revision.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {commandErrorFa(review.error ?? revision.error)}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
          <Button
            data-testid="approve-content"
            // Approval is unavailable only while a source is genuinely missing,
            // and the reason is stated beside it rather than left to a tooltip.
            disabled={needsSource || review.isPending || state === "approved"}
            onClick={() =>
              review.mutate(
                { target, outcome: "APPROVED", reasonFa: "محتوا تأیید شد." },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            تأیید محتوا
          </Button>
          <Button
            variant="outline"
            data-testid="request-content-change"
            disabled={note.trim() === "" || revision.isPending}
            onClick={() => {
              revision.mutate({ target, feedbackFa: note.trim(), route: "CONTENT_REWRITE" });
              setNote("");
            }}
          >
            نیاز به تغییر
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
