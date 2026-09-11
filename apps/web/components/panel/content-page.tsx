"use client";

import { useState } from "react";
import {
  BookOpen,
  Clapperboard,
  ClipboardList,
  LayoutTemplate,
  MessageSquare,
  Music,
  Palette,
  PenLine,
  type LucideIcon,
} from "lucide-react";
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
/**
 * One icon per kind, and one dot per state.
 *
 * Borrowed structure, not colour: the reference pattern is an icon tile, a
 * two-line label and a single status dot at the end of the row. The palette is
 * DROP's — Acid marks the one state where a person is the blocker (ADR-0022
 * D3), Oxide is nowhere near it, and `approved` stays quiet because finished
 * work has no claim on anyone's attention.
 *
 * The dot is never the only carrier: the state's Persian name sits under the
 * title on every card (ADR-0010 D11).
 */
const KIND_ICON: Record<ContentItem["type"], LucideIcon> = {
  MUSIC: Music,
  FILM: Clapperboard,
  ART_DESIGN: Palette,
  BOOK: BookOpen,
  EDITORIAL: PenLine,
  SOCIAL: MessageSquare,
  LANDING: LayoutTemplate,
  PRODUCTION_BRIEF: ClipboardList,
};

/**
 * The action line's tone follows the STATE, not the fact that an action exists.
 *
 * It was Acid for all of them, which put "a person is the blocker" (ADR-0022
 * D3) on a build failure and on a missing source. Acid belongs to exactly one
 * state; the others keep the tone they already carry on the card's border, so
 * the strip and the border of a card never disagree.
 */
const STATE_ACTION_TONE: Record<ContentState, string> = {
  draft: "bg-muted text-foreground",
  needs_input: "bg-warning/15 text-foreground",
  failed: "bg-destructive/15 text-foreground",
  ready_for_review: "bg-attention text-attention-foreground",
  approved: "bg-muted text-foreground",
};

const STATE_DOT: Record<ContentState, string> = {
  draft: "bg-muted-foreground",
  needs_input: "bg-warning",
  failed: "bg-destructive",
  ready_for_review: "bg-attention",
  approved: "bg-success",
};

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
                  The concept is a ROW; its kinds are COLUMNS beneath it.

                  Eighteen cards in one flowing grid is a wall — music, film and
                  artwork as a single undifferentiated scroll. Stacking the kinds
                  was better but still made the page long and still asked you to
                  scroll to learn what a concept produced.

                  Side by side, the shape of a concept's portfolio is legible in
                  one look: how much music against how much film, which column
                  is waiting on you, which is empty. The machine's own portfolio
                  is BUILT this way — `music`, `films_and_series` and `artworks`
                  are separate fields on its response — so this shows the shape
                  the work already has rather than inventing one.

                  `auto-fit` rather than a fixed column count, so the columns
                  become rows on a narrow screen instead of scrolling sideways;
                  `items-start` so a short column does not stretch to match a
                  tall one. Insertion order is kept, which is the projection's
                  order and therefore the machine's own.
                */}
                <div className="grid items-start gap-x-5 gap-y-6 grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))]">
                  {[...groupByType(groupItems)].map(([type, typeItems]) => (
                    <section key={type} className="space-y-3" data-testid="content-kind-group">
                      {/*
                        A chip and a count, the way a board heads its columns —
                        quiet enough to read past, specific enough to find.
                      */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium tracking-wide text-muted-foreground">
                          {DIRECTION_LABEL_FA[type] ?? type}
                        </h3>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {toPersianDigits(String(typeItems.length))}
                        </span>
                      </div>
                      <ul className="space-y-3">
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
                </div>
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
  const Icon = KIND_ICON[item.type] ?? PenLine;

  return (
    <Card
      data-testid="content-card"
      data-state={state}
      className={`drop-material gap-0 overflow-hidden py-0 ${STATE_TONE[state]}`}
    >
      {/*
        The whole card is the control, not a button buried at the bottom of it.

        Eighteen cards each carrying a heading, a three-line excerpt, a state
        box and its own «باز کردن و ویرایش» button is a wall of chrome around
        very little information. A row states four things — what kind, what it
        is called, where it stands, and whether it wants you — and opens the
        detail sheet that already holds everything else.
      */}
      <button
        type="button"
        data-testid="open-content"
        onClick={onOpen}
        className="flex w-full items-start gap-3 p-3 text-start transition-colors hover:bg-accent/50"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground"
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            <ContentText>{version?.titleFa ?? "محتوای بدون عنوان"}</ContentText>
          </span>
          {/* The state in words, always — the dot beside it is never alone. */}
          <span data-testid="content-state" className="mt-0.5 block text-xs text-muted-foreground">
            {CONTENT_STATE_LABEL_FA[state]}
          </span>
        </span>
        <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${STATE_DOT[state]}`} />
      </button>
      {action === null ? null : (
        <p
          data-testid="content-action"
          className={`border-t border-border px-3 py-1.5 text-xs font-medium ${STATE_ACTION_TONE[state]}`}
        >
          {action}
        </p>
      )}
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
