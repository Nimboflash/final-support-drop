"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
  UnknownProjectState,
  filterByProject,
  useProjectFilter,
} from "./project-selector";
import { useReturnFocus } from "./use-return-focus";
import { useRequestRevision, useReviewItem } from "../../lib/demo/commands";
import { useCanAct } from "../../lib/demo/policy";
import { useDemoSession } from "../../lib/demo/providers";
import { CommandError } from "./command-error";
import { usePulseKey } from "./use-pulse";
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
/*
  Acid is for the EXCEPTION, and «آماده بررسی» is not one.

  ADR-0022 D3 reserves Acid Lime for "a person is the blocker", and warned in
  terms that "a full-width bar on four of seven cards floods the board with the
  one colour that exists to stand out". A real machine portfolio is eighteen
  items and every one of them arrives awaiting review — so every card carried a
  full-width Acid strip, seventeen at a time down a single column. A signal that
  is on everything is not a signal; it is a background.

  So «منتظر تأیید» is quiet. It IS the normal state of freshly built content,
  and the state badge and the dot both already say it in words.

  What keeps Acid: `needs_input`. That one genuinely cannot proceed without the
  person going and fetching something, it is rare, and it is the only state on
  this surface where the work is actually stopped.
*/
const STATE_ACTION_TONE: Record<ContentState, string> = {
  draft: "bg-muted text-foreground",
  needs_input: "bg-attention text-attention-foreground",
  failed: "bg-destructive/15 text-foreground",
  ready_for_review: "bg-muted text-muted-foreground",
  improving: "bg-muted text-muted-foreground",
  approved: "bg-muted text-foreground",
};

/*
  The dot follows the stripe. Seventeen Acid dots down a column is the same
  flood ADR-0022 D3 warned about at a smaller size: a signal on everything is
  a background. Acid keeps `needs_input` — the one state where the person is
  the blocker — and «آماده بررسی» wears the brand accent its stripe already
  wears, so a card never disagrees with itself.
*/
const STATE_DOT: Record<ContentState, string> = {
  draft: "bg-muted-foreground",
  needs_input: "bg-attention",
  failed: "bg-destructive",
  ready_for_review: "bg-selected",
  improving: "bg-warning",
  approved: "bg-success",
};

/*
  A status STRIPE on the start edge, not a coloured outline.

  These were four-edge borders, and at the alpha they used to carry they were
  invisible; at full strength — which is what they needed to reach 3:1 — ten
  cards of brand accent read as ten alarms. Neither is a status marker.

  A stripe is. It is contained, it is legible at full strength, it stacks down a
  column without competing, and it is the same shape the overview already uses
  for a row that wants attention. The card keeps its own hairline for structure;
  the stripe says what state it is in, beside a badge that says it in words.
*/
const STATE_TONE: Record<ContentState, string> = {
  draft: "",
  needs_input: "border-s-2 border-s-warning",
  failed: "border-s-2 border-s-destructive",
  ready_for_review: "border-s-2 border-s-selected",
  improving: "border-s-2 border-s-warning",
  approved: "border-s-2 border-s-success",
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
  const { selected: selectedProject, known } = useProjectFilter(world);
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
    <div className="drop-surface space-y-5">
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">محتوا</h1>
        <ProjectSelector world={world} />
      </header>

      {!known ? (
        <UnknownProjectState />
      ) : groups.size === 0 ? (
        <EmptyState
          title="هنوز محتوایی ساخته نشده"
          detail="ابتدا یک کانسپت را برای تولید محتوا انتخاب کنید."
          action={
            <Button asChild variant="outline">
              <Link href="/studio/concepts">رفتن به کانسپت‌ها</Link>
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
}: {
  item: ContentItem;
  world: PanelSnapshot;
  onOpen: () => void;
}) {
  const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
  const state = contentStateOf(item);
  const action = CONTENT_STATE_ACTION_FA[state];
  const Icon = KIND_ICON[item.type] ?? PenLine;
  const pulse = usePulseKey(state);

  return (
    <Card
      data-testid="content-card"
      data-state={state}
      className={`drop-material drop-interactive gap-0 overflow-hidden py-0 ${STATE_TONE[state]}`}
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
          <span
            key={pulse}
            data-testid="content-state"
            className={`mt-0.5 block text-xs text-muted-foreground ${pulse > 0 ? "drop-pulse" : ""}`}
          >
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
  /*
    One of these two controls can act here and the other cannot, and the first
    attempt at this got both wrong in turn.

    The machine's whole write surface is five calls — create a session, generate
    concepts, refine them, approve ONE concept, build the portfolio — and the
    portfolio arrives complete, in one shot. So «تأیید محتوا» first FAILED after
    the click (it sent a content id where the real world looked for a concept),
    and was then disabled outright. Disabling it was the worse mistake: an
    output assembles when its content is approved, so with nothing approvable
    the work dead-ends at content, every item stuck on «آماده بررسی» forever.

    Approving is the PERSON's decision, not the machine's, and it is now
    recorded beside the session and laid back over the next snapshot. What
    genuinely cannot happen is a REWRITE: «نیاز به تغییر» promises the item
    comes back changed, and the machine has no call that changes one.
  */
  const machineCannotRewrite = useDemoSession().mode === "REAL";
  const canAct = useCanAct();
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

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
              {/*
                The trigger STAYS. It used to be replaced by the field, which
                unmounted the element that had focus; Radix then parked focus
                on the sheet container and a keyboard user tabbed back down to
                the field they had just asked for. A disclosure keeps its
                button and says what it opened.
              */}
              <Button
                size="sm"
                data-testid="add-source"
                aria-expanded={sourceOpen}
                aria-controls={`source-form-${item.id}`}
                disabled={!canAct.allowed}
                onClick={() => setSourceOpen((prior) => !prior)}
              >
                افزودن منبع
              </Button>
              {sourceOpen ? (
                <div id={`source-form-${item.id}`} className="drop-enter space-y-2">
                  <Label htmlFor={`source-${item.id}`}>نشانی یا توضیح منبع</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id={`source-${item.id}`}
                      dir="ltr"
                      autoFocus
                      className="min-w-0 flex-1"
                      value={source}
                      onChange={(event) => setSource(event.target.value)}
                      placeholder="https://example.invalid/reference"
                    />
                    <Button
                      size="sm"
                      data-testid="save-source"
                      pending={revision.isPending}
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
              ) : null}
            </div>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-7"><ContentText>{version?.bodyFa}</ContentText></p>

          <div className="space-y-2">
            <Label htmlFor={`feedback-${item.id}`} className="text-sm font-semibold">
              درخواست تغییر
            </Label>
            <Textarea
              ref={noteRef}
              id={`feedback-${item.id}`}
              data-testid="content-feedback"
              disabled={!canAct.allowed || machineCannotRewrite}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثلاً: لحن را صمیمی‌تر کن."
              rows={3}
            />
          </div>

          {review.isError ? <CommandError error={review.error} /> : null}
          {revision.isError ? <CommandError error={revision.error} /> : null}

          {machineCannotRewrite ? (
            <p
              data-testid="machine-rewrite-unavailable"
              className="rounded-md border border-border bg-muted p-3 text-sm"
            >
              تأیید شما همین‌جا ثبت می‌شود. اما ماشین این محتوا را در یک مرحله ساخته و
              نمی‌تواند تک‌تک موارد را بازنویسی کند. برای تغییر، در کانسپت درخواست بهبود
              بدهید و سپس «بازسازی محتوا» را بزنید؛ همهٔ محتوا از نسخهٔ تازه ساخته می‌شود.
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
          {canAct.allowed ? null : (
            <p className="w-full text-sm text-muted-foreground" data-testid="cannot-act-reason">
              {canAct.reason}
            </p>
          )}
          <Button
            data-testid="approve-content"
            pending={review.isPending}
            // Approval is unavailable only while a source is genuinely missing,
            // and the reason is stated beside it rather than left to a tooltip.
            disabled={
              !canAct.allowed || needsSource || failed || review.isPending || state === "approved"
            }
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
            pending={review.isPending || revision.isPending}
            disabled={
              !canAct.allowed || machineCannotRewrite || note.trim() === "" || revision.isPending
            }
            onClick={() => {
              // The DECISION is recorded first and durably (ADR-0019 D4): a
              // change request IS a review outcome, and if the rewrite below
              // fails the decision must still stand. Dispatching only the
              // revision left the request absent from the record entirely.
              //
              // The box is cleared on SUCCESS, not before the write. Cleared
              // first, a refusal arrived over an empty box while the conflict
              // sentence promised the text had been kept — and the button
              // disabled itself under the pointer, dropping focus out of the
              // sheet. Focus goes to the box first, for the same reason the
              // concept sheet does it.
              const feedbackFa = note.trim();
              noteRef.current?.focus();
              review.mutate(
                {
                  target,
                  outcome: "CHANGES_REQUESTED",
                  reasonFa: feedbackFa,
                  expectedRowVersion: rowVersion,
                },
                {
                  onSuccess: () =>
                    revision.mutate(
                      { target, feedbackFa, route: "CONTENT_REWRITE" },
                      {
                        onSuccess: () => {
                          setNote("");
                          onOpenChange(false);
                        },
                      },
                    ),
                },
              );
            }}
          >
            نیاز به تغییر
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
