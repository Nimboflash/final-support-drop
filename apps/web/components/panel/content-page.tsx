"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ContentText,
  EmptyState,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import type { ContentItem, PanelSnapshot } from "@drop/panel-domain";
import {
  ALL_PROJECTS,
  ProjectSelector,
  filterByProject,
  useSelectedProject,
} from "./project-selector";
import { useReturnFocus } from "./use-return-focus";
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
  failed: "border-destructive",
  ready_for_review: "border-selected/50",
  approved: "border-success/60",
};

/**
 * Content items by kind, in the order they arrive.
 *
 * A `Map` rather than sorting: insertion order is the projection's order, which
 * is the machine's own field order (music, then films, then artworks). Sorting
 * alphabetically would scramble a sequence somebody chose.
 */
function groupByType(items: readonly ContentItem[]): Map<ContentItem["type"], ContentItem[]> {
  const byType = new Map<ContentItem["type"], ContentItem[]>();
  for (const item of items) {
    byType.set(item.type, [...(byType.get(item.type) ?? []), item]);
  }
  return byType;
}

export function ContentPage({ world }: { world: PanelSnapshot }) {
  const selectedProject = useSelectedProject();
  const [openId, setOpenId] = useState<string | null>(null);
  const detailFocus = useReturnFocus();
  /*
    The overlay is keyed on the LAST item opened, not the currently open one.
    Keying on the current id unmounts the sheet the instant it closes — which
    is exactly when Radix would hand focus back to the card, so the remount
    silently cancelled the focus return. This still resets the sheet's state
    between two different items, which is what the key is for.
  */
  const [lastOpened, setLastOpened] = useState<string>("none");

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
                {/*
                  The project name is not decoration here. The demo world clones
                  one concept across four projects, so the cross-project view
                  showed «آیین مکث» four times with nothing to tell the sections
                  apart — the concepts page already guards against exactly this.
                */}
                <div className="drop-rule flex flex-wrap items-baseline justify-between gap-2 pb-2">
                  <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-lg font-semibold">
                    <ContentText>{version?.titleFa ?? "کانسپت"}</ContentText>
                    {selectedProject === ALL_PROJECTS && concept !== undefined ? (
                      <Badge variant="secondary" className="max-w-full min-w-0 shrink truncate font-normal">
                        <ContentText>
                          {world.projects.find((p) => p.id === concept.projectId)?.titleFa ?? ""}
                        </ContentText>
                      </Badge>
                    ) : null}
                  </h2>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {toPersianDigits(String(groupItems.length))}
                  </span>
                </div>

                {/*
                  Sectioned by kind inside the concept, not one flat list.

                  A real portfolio is eighteen items, and eighteen cards in a
                  single column is a wall: music, film and artwork read as one
                  undifferentiated scroll with only a small badge per card to
                  tell them apart. The machine's own portfolio is BUILT in
                  categories — `music`, `films_and_series`, `artworks` are
                  separate fields on its response — so this shows the shape the
                  work already has rather than inventing one.

                  Insertion order is kept, which is the projection's order and
                  therefore the machine's own.
                */}
                {[...groupByType(groupItems)].map(([type, typeItems]) => (
                  <section key={type} className="space-y-3" data-testid="content-kind-group">
                    <div className="drop-rule flex items-baseline justify-between gap-2 pb-1">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {DIRECTION_LABEL_FA[type] ?? type}
                      </h3>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {toPersianDigits(String(typeItems.length))}
                      </span>
                    </div>
                    <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
                      {typeItems.map((item) => (
                        <li key={item.id}>
                          <ContentCard
                            item={item}
                            world={world}
                            showKind={false}
                            onOpen={() => {
                              detailFocus.remember();
                              setLastOpened(item.id);
                              setOpenId(item.id);
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <ContentDetail
        // Keyed by the item: the sheet is a permanently-mounted sibling, so
        // without this a change request typed for one item stayed in the box
        // when the next was opened — and submitted against the new target.
        key={lastOpened}
        world={world}
        item={open}
        open={open !== null}
        onOpenChange={(next) =>
          detailFocus.onOpenChange(next, (value) => {
            if (!value) setOpenId(null);
          })
        }
        onCloseAutoFocus={detailFocus.onCloseAutoFocus}
      />
    </div>
  );
}

function ContentCard({
  item,
  world,
  onOpen,
  showKind = true,
}: {
  item: ContentItem;
  world: PanelSnapshot;
  onOpen: () => void;
  /** False inside a section that already names the kind. */
  showKind?: boolean;
}) {
  const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
  const state = contentStateOf(item);
  const action = CONTENT_STATE_ACTION_FA[state];

  return (
    <Card data-testid="content-card" data-state={state} className={`h-full gap-3 ${STATE_TONE[state]}`}>
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/*
              Suppressed inside a kind section: eighteen cards each repeating
              the heading directly above them is noise, not information. Still
              shown wherever a card appears outside one.
            */}
            {showKind ? (
              <Badge variant="secondary">{DIRECTION_LABEL_FA[item.type] ?? item.type}</Badge>
            ) : null}
            <Badge variant="outline" data-testid="content-state">
              {CONTENT_STATE_LABEL_FA[state]}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
          >
            <ContentText>{version?.titleFa ?? "محتوای بدون عنوان"}</ContentText>
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground"><ContentText>{version?.bodyFa}</ContentText></p>
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
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Returns focus to the control that opened this overlay. */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const isMobile = useIsMobile();
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);

  if (item === null) return null;

  const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
  const state = contentStateOf(item);
  const target = { type: "CONTENT" as const, id: item.id, versionId: item.activeVersionId };
  const rowVersion = item.rowVersion;
  const needsSource = state === "needs_input";
  const failed = state === "failed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="content-detail"
        className={isMobile ? "w-full sm:max-w-none" : "w-[42rem] sm:max-w-[50rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <ContentText>{version?.titleFa ?? "محتوا"}</ContentText>
            <Badge variant="outline">{CONTENT_STATE_LABEL_FA[state]}</Badge>
          </SheetTitle>
          <SheetDescription>
            {DIRECTION_LABEL_FA[item.type] ?? item.type}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          {failed ? (
            <div
              data-testid="content-failed"
              className="space-y-1 rounded-md border border-destructive bg-destructive/10 p-3 text-sm"
            >
              <p>{CONTENT_STATE_ACTION_FA.failed}</p>
              {/* The item's own reason, rather than an action that cannot help. */}
              {item.blockedReasonFa === null ? null : (
                <p className="text-muted-foreground">{item.blockedReasonFa}</p>
              )}
            </div>
          ) : null}

          {needsSource ? (
            <div
              data-testid="needs-source"
              className="space-y-2 rounded-md border border-warning bg-warning/10 p-3 text-sm"
            >
              <p>{CONTENT_STATE_ACTION_FA.needs_input}</p>
              {/*
                The action has to DO something. An affordance beside a message
                saying what is missing, which then changes nothing when clicked,
                is worse than no affordance at all — the person concludes the
                panel is broken, and they are right.

                Nothing is fetched or extracted (ADR-0019 D2): the reference the
                person supplies is recorded, and recording it is what lifts the
                block, through the RESEARCH_REFRESH route that already means
                exactly this.
              */}
              {sourceOpen ? (
                <div className="space-y-2">
                  <Label htmlFor={`source-${item.id}`}>نشانی یا توضیح منبع</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id={`source-${item.id}`}
                      dir="ltr"
                      className="min-w-0 flex-1"
                      value={source}
                      onChange={(event) => setSource(event.target.value)}
                      placeholder="https://example.invalid/reference"
                    />
                    <Button
                      size="sm"
                      data-testid="save-source"
                      disabled={source.trim() === "" || revision.isPending}
                      onClick={() => {
                        revision.mutate(
                          {
                            target,
                            feedbackFa: `منبع افزوده شد: ${source.trim()}`,
                            route: "RESEARCH_REFRESH",
                            expectedRowVersion: rowVersion,
                          },
                          { onSuccess: () => { setSource(""); setSourceOpen(false); } },
                        );
                      }}
                    >
                      ثبت منبع
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="add-source"
                  onClick={() => setSourceOpen(true)}
                >
                  افزودن منبع
                </Button>
              )}
            </div>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-7"><ContentText>{version?.bodyFa}</ContentText></p>

          <div className="space-y-2">
            <Label htmlFor={`feedback-${item.id}`} className="text-sm font-semibold">
              درخواست تغییر
            </Label>
            <Textarea
              id={`feedback-${item.id}`}
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
            disabled={needsSource || failed || review.isPending || state === "approved"}
            onClick={() =>
              review.mutate(
                {
                  target,
                  outcome: "APPROVED",
                  reasonFa: "محتوا تأیید شد.",
                  // Without this the write is a silent last-write-wins and the
                  // conflict path is unreachable (V2 01 §8; ADR-0019 D10).
                  expectedRowVersion: rowVersion,
                },
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
              // The DECISION is recorded first and durably (ADR-0019 D4): a
              // change request IS a review outcome, and if the rewrite below
              // fails the decision must still stand. Dispatching only the
              // revision left the request absent from the record entirely.
              void (async () => {
                const feedbackFa = note.trim();
                setNote("");
                await review.mutateAsync({
                  target,
                  outcome: "CHANGES_REQUESTED",
                  reasonFa: feedbackFa,
                  expectedRowVersion: rowVersion,
                });
                await revision.mutateAsync({ target, feedbackFa, route: "CONTENT_REWRITE" });
                onOpenChange(false);
              })();
            }}
          >
            نیاز به تغییر
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
