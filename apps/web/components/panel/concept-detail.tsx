"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Checkbox,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  formatPersianCalendarDate,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import { MoreHorizontal } from "lucide-react";
import type { Concept, PanelSnapshot } from "@drop/panel-domain";
import { commandErrorFa, useRequestRevision, useReviewItem } from "../../lib/demo/commands";
import {
  CONCEPT_STATE_LABEL_FA,
  DIRECTION_LABEL_FA,
  conceptStateOf,
} from "../../lib/demo/presentation";

/**
 * Concept detail: a readable document beside a conversation (ADR-0020 D8).
 *
 * The brief replaces version management as the dominant experience with
 * conversation: a person asks for a change in their own words and that produces
 * a revision. History stays reachable from a small menu rather than occupying a
 * primary tab.
 *
 * Three actions, not a wall of approve/reject/amend buttons: select it, improve
 * it, or set it aside.
 */
export function ConceptDetail({
  world,
  concept,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  concept: Concept | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Returns focus to the control that opened this overlay. */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const isMobile = useIsMobile();
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [setAsideOpen, setSetAsideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [replace, setReplace] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSent([]);
      setSetAsideOpen(false);
      setReason("");
      setReplace(false);
    }
  }, [open]);

  if (concept === null) return null;

  const versions = world.conceptVersions.filter((v) => v.conceptId === concept.id);
  /*
    The version a person is shown is the NEWEST one, which after a change
    request is the revision their words produced. Rendering `activeVersionId`
    meant asking for a change updated nothing on screen: the title, the body and
    the «بازخورد اعمال‌شده» line all still showed the version from before, so the
    request appeared to have been swallowed. Actions still target the active
    version — reviewing a revision that has not landed is a different thing.
  */
  const displayed = concept.pendingRevisionId ?? concept.activeVersionId;
  const active = versions.find((v) => v.id === displayed) ?? versions[versions.length - 1];
  const state = conceptStateOf(concept);
  const target = { type: "CONCEPT" as const, id: concept.id, versionId: concept.activeVersionId };
  // Captured once: the closures below run after a render in which `concept`
  // is narrowed, and TypeScript cannot see that through the callback.
  const rowVersion = concept.rowVersion;

  function improve() {
    const text = message.trim();
    if (text === "") return;
    setSent((prior) => [...prior, text]);
    setMessage("");
    revision.mutate({
      target,
      feedbackFa: text,
      route: "CONCEPT_REVISION",
      expectedRowVersion: rowVersion,
    });
  }

  /**
   * V2 01 §4 makes a reason MANDATORY for a rejection, and ADR-0020 does not
   * supersede that — D5 removed identifiers from the interface, not the
   * obligation to say why. The decision is recorded first and durably
   * (ADR-0019 D4): if the replacement below fails, the set-aside must still
   * stand, and retrying must not record it twice.
   */
  async function setAside() {
    const text = reason.trim();
    if (text === "") return;
    await review.mutateAsync({
      target,
      outcome: "REJECTED",
      reasonFa: text,
      expectedRowVersion: rowVersion,
    });
    if (replace) {
      await revision.mutateAsync({ target, feedbackFa: text, route: "CONCEPT_REPLACEMENT" });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="concept-detail"
        className={isMobile ? "w-full sm:max-w-none" : "w-[44rem] sm:max-w-[52rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {active?.titleFa ?? "کانسپت"}
            <Badge variant="outline">{CONCEPT_STATE_LABEL_FA[state]}</Badge>
            <ConceptHistoryMenu count={versions.length} />
          </SheetTitle>
          <SheetDescription>
            {/* Date, not an identifier (ADR-0020 D5). */}
            ساخته‌شده در {formatDay(active?.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div
          ref={bodyRef}
          className={`flex-1 overflow-y-auto px-4 ${isMobile ? "" : "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6"}`}
        >
          {/* The document */}
          <article className="space-y-4 py-2" data-testid="concept-document">
            <Section titleFa="ایده اصلی">{active?.thesisFa}</Section>
            <Section titleFa="چرا این مسیر">{active?.dropRationaleFa}</Section>
            <Section titleFa="جهت محتوایی">
              <div className="flex flex-wrap gap-1">
                {(active?.directions ?? []).map((direction) => (
                  <Badge key={direction} variant="secondary" className="text-xs">
                    {DIRECTION_LABEL_FA[direction] ?? direction}
                  </Badge>
                ))}
              </div>
            </Section>
            {active?.feedbackAppliedFa == null ? null : (
              <Section titleFa="بازخورد اعمال‌شده">{active.feedbackAppliedFa}</Section>
            )}
          </article>

          {/* The conversation */}
          <aside className={isMobile ? "space-y-3 py-4" : "space-y-3 border-s ps-6 py-2"}>
            <h3 className="text-sm font-semibold">گفت‌وگو دربارهٔ این کانسپت</h3>
            <ul className="space-y-2" data-testid="assistant-thread">
              {world.comments
                .filter((c) => c.target.id === concept.id)
                .map((c) => (
                  <li key={c.id} className="rounded-md border p-2 text-sm leading-7">
                    {c.bodyFa}
                  </li>
                ))}
              {sent.map((text, index) => (
                <li
                  key={`sent-${String(index)}`}
                  className="rounded-md border border-selected/50 bg-selected/5 p-2 text-sm leading-7"
                >
                  {text}
                </li>
              ))}
            </ul>

            {revision.isPending ? (
              <p className="text-xs text-muted-foreground">در حال ساخت نسخهٔ تازه…</p>
            ) : null}
            {revision.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {commandErrorFa(revision.error)}
              </p>
            ) : null}

            <Textarea
              data-testid="assistant-input"
              aria-label="پیام برای بهبود این کانسپت"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="مثلاً: این مسیر را مینیمال‌تر کن."
              rows={3}
            />
            <Button
              size="sm"
              data-testid="assistant-send"
              disabled={message.trim() === "" || revision.isPending}
              onClick={improve}
            >
              بهبود کانسپت
            </Button>
          </aside>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4" data-testid="concept-actions">
          <Button
            data-testid="select-concept"
            disabled={review.isPending || state === "selected"}
            onClick={() =>
              review.mutate(
                {
                  target,
                  outcome: "APPROVED",
                  reasonFa: "برای تولید محتوا انتخاب شد.",
                  // Without this the write is a silent last-write-wins and the
                  // conflict path is unreachable (V2 01 §8; ADR-0019 D10).
                  expectedRowVersion: rowVersion,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            انتخاب برای تولید محتوا
          </Button>
          <Button
            variant="ghost"
            data-testid="set-aside-concept"
            disabled={review.isPending || state === "set_aside"}
            onClick={() => setSetAsideOpen(true)}
          >
            کنار گذاشتن
          </Button>
          {setAsideOpen ? (
            <div className="w-full space-y-2 rounded-md border p-3" data-testid="set-aside-form">
              <Label htmlFor="set-aside-reason">چرا کنار گذاشته می‌شود؟</Label>
              <Textarea
                id="set-aside-reason"
                data-testid="set-aside-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="مثلاً: با لحن این برنامه هم‌خوان نیست."
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="set-aside-replace"
                  data-testid="set-aside-replace"
                  checked={replace}
                  onCheckedChange={(next) => setReplace(next === true)}
                />
                <Label htmlFor="set-aside-replace" className="font-normal">
                  به‌جای آن یک کانسپت جایگزین بساز
                </Label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  data-testid="confirm-set-aside"
                  disabled={reason.trim() === "" || review.isPending}
                  onClick={() => void setAside()}
                >
                  ثبت
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSetAsideOpen(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : null}

          {review.isError || revision.isError ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {commandErrorFa(review.error ?? revision.error)}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** History is available, but never the main event (ADR-0020 D8). */
function ConceptHistoryMenu({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="concept-history" aria-label="تاریخچهٔ کانسپت">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem disabled>
          این کانسپت {toPersianDigits(String(count))} بار بازنگری شده است.
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({ titleFa, children }: { titleFa: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground">{titleFa}</h3>
      <div className="text-sm leading-7">{children}</div>
    </section>
  );
}

/**
 * A Jalali date, not the stored ISO string. The Gregorian value stays canonical;
 * only the display is Persian (V2 01 §7). Built from the date parts rather than
 * parsed as an instant, so no timezone can shift it a day.
 */
function formatDay(instant: string | undefined): string {
  if (instant === undefined) return "—";
  return formatPersianCalendarDate(instant.slice(0, 10));
}
