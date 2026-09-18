"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  ContentText,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  formatPersianCalendarDate,
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
import { MoreHorizontal } from "lucide-react";
import type { Concept, PanelSnapshot } from "@drop/panel-domain";
import { useRequestRevision, useReviewItem } from "../../lib/demo/commands";
import { useCanAct } from "../../lib/demo/policy";
import { useDemoSession } from "../../lib/demo/providers";
import {
  CONCEPT_STATE_LABEL_FA,
  DIRECTION_LABEL_FA,
  conceptStateOf,
} from "../../lib/demo/presentation";
import { CommandError } from "./command-error";

/**
 * Concept detail: a readable document beside a conversation (ADR-0020 D8).
 *
 * The brief replaces version management as the dominant experience with
 * conversation: a person asks for a change in their own words and that produces
 * a revision. History stays reachable from a small menu rather than occupying a
 * primary tab.
 *
 * Three actions, not a wall of approve/reject/amend buttons: select it, improve
 * it, or set it aside. Each one now says what it will DO before it does it —
 * including what it costs and what it makes stale — because a press that
 * spends money or invalidates research is not a press that should surprise.
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
  const live = useDemoSession().mode === "REAL";
  const canAct = useCanAct();
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [setAsideOpen, setSetAsideOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [replace, setReplace] = useState(false);
  /** Which version the document shows; null is the newest. */
  const [viewing, setViewing] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSent([]);
      setSetAsideOpen(false);
      setReplaceOpen(false);
      setReason("");
      setReplace(false);
      setViewing(null);
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
  const newestId = concept.pendingRevisionId ?? concept.activeVersionId;
  const newest = versions.find((v) => v.id === newestId) ?? versions[versions.length - 1];
  const active = (viewing === null ? null : versions.find((v) => v.id === viewing)) ?? newest;
  const readingHistory = active !== undefined && newest !== undefined && active.id !== newest.id;
  const state = conceptStateOf(concept);
  /*
    Whether the research this concept was selected FOR actually exists, and
    whether some OTHER concept's does.

    The machine holds one portfolio per session. Selecting a second concept
    while one exists therefore REPLACES research — a purchase, not a click —
    and the control has to say so before it happens rather than fail after.
  */
  const hasContent = world.content.some((item) => item.conceptId === concept.id);
  const otherHasContent =
    live &&
    world.content.some(
      (item) => item.conceptId !== concept.id && item.projectId === concept.projectId,
    );
  const target = { type: "CONCEPT" as const, id: concept.id, versionId: concept.activeVersionId };
  // Captured once: the closures below run after a render in which `concept`
  // is narrowed, and TypeScript cannot see that through the callback.
  const rowVersion = concept.rowVersion;
  const conceptId = concept.id;

  /** The durable thread, with the local echoes that have not landed yet. */
  const thread = world.comments.filter((c) => c.target.id === conceptId);
  const pendingEchoes = sent.filter((text) => !thread.some((c) => c.bodyFa === text));

  function improve() {
    const text = message.trim();
    if (text === "") return;
    /*
      Focus moves to the box BEFORE the button disables itself. The click
      handler used to clear the message synchronously, which disabled the
      button under the pointer; Radix's focus scope cannot restore focus to a
      disabled element, so focus fell to `<body>` and the next Tab left the
      sheet entirely. The conversation continues in the box, so that is where
      focus belongs anyway.
    */
    messageRef.current?.focus();
    setSent((prior) => [...prior, text]);
    revision.mutate(
      { target, feedbackFa: text, route: "CONCEPT_REVISION", expectedRowVersion: rowVersion },
      { onSuccess: () => setMessage("") },
    );
  }

  /**
   * V2 01 §4 makes a reason MANDATORY for a rejection, and ADR-0020 does not
   * supersede that — D5 removed identifiers from the interface, not the
   * obligation to say why. The decision is recorded first and durably
   * (ADR-0019 D4): if the replacement below fails, the set-aside must still
   * stand, and retrying must not record it twice.
   */
  function setAside() {
    const text = reason.trim();
    if (text === "") return;
    reasonRef.current?.focus();
    review.mutate(
      { target, outcome: "REJECTED", reasonFa: text, expectedRowVersion: rowVersion },
      {
        onSuccess: () => {
          if (replace && !live) {
            revision.mutate(
              { target, feedbackFa: text, route: "CONCEPT_REPLACEMENT" },
              { onSuccess: () => onOpenChange(false) },
            );
            return;
          }
          onOpenChange(false);
        },
      },
    );
  }

  /** The plain selection: free, and only offered when nothing gets replaced. */
  function select() {
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
    );
  }

  /**
   * The rebuild: research built from THIS concept's newest version, replacing
   * whatever the session holds. Reached through the confirmation below when
   * research exists, and directly when the earlier build simply did not land.
   */
  function rebuild() {
    revision.mutate(
      {
        target,
        feedbackFa: "بازسازی محتوا از نسخهٔ فعلی این کانسپت.",
        route: "RESEARCH_REFRESH",
        expectedRowVersion: rowVersion,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  /*
    One primary control whose label says what pressing it does — and when that
    is "replace research and pay for it", a confirmation that says so first.

      selected, content present    → nothing to do; the badge already says it
      selected, no content         → the build did not land; retry that half
      outdated                     → research is from an older version; rebuild
      another concept has content  → this replaces it; confirm
      otherwise                    → select, free
  */
  const primary =
    state === "selected" && hasContent
      ? { label: "انتخاب‌شده", disabled: true, confirm: false, run: () => {} }
      : state === "selected"
        ? { label: "ساخت دوبارهٔ محتوا", disabled: false, confirm: false, run: live ? rebuild : select }
        : state === "outdated"
          ? { label: "بازسازی محتوا با نسخهٔ تازه", disabled: false, confirm: true, run: rebuild }
          : otherHasContent
            ? { label: "انتخاب به‌جای کانسپت فعلی", disabled: false, confirm: true, run: rebuild }
            : { label: "انتخاب برای تولید محتوا", disabled: false, confirm: false, run: select };

  const busy = review.isPending || revision.isPending;
  const chosen = state === "selected" || state === "outdated";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="concept-detail"
        className={isMobile ? "w-full sm:max-w-none" : "w-[44rem] sm:max-w-[52rem]"}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <ContentText>{active?.titleFa ?? "کانسپت"}</ContentText>
            <Badge variant="outline" data-testid="concept-detail-state">
              {CONCEPT_STATE_LABEL_FA[state]}
            </Badge>
            <ConceptHistoryMenu
              versions={versions.map((v) => ({ id: v.id, number: v.number, createdAt: v.createdAt }))}
              currentId={newest?.id ?? null}
              viewingId={active?.id ?? null}
              onView={(id) => setViewing(id === newest?.id ? null : id)}
            />
          </SheetTitle>
          <SheetDescription>
            {/* Date, not an identifier (ADR-0020 D5). */}
            ساخته‌شده در {formatDay(active?.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div
          className={`flex-1 overflow-y-auto px-4 ${isMobile ? "" : "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6"}`}
        >
          {/* The document */}
          <article className="space-y-4 py-2" data-testid="concept-document">
            {readingHistory ? (
              <p
                role="status"
                data-testid="concept-history-notice"
                className="rounded-md border border-border bg-muted p-2 text-xs text-muted-foreground"
              >
                این نسخهٔ قدیمی فقط برای خواندن است. تصمیم‌ها روی نسخهٔ فعلی ثبت می‌شوند.
              </p>
            ) : null}
            <Section titleFa="ایده اصلی"><ContentText>{active?.thesisFa}</ContentText></Section>
            <Section titleFa="چرا این مسیر">{active?.dropRationaleFa}</Section>
            {/*
              Only when there is something to list. The machine never names a
              direction — the projection emits `[]` — and a heading over an
              empty row read as a section that had failed to load.
            */}
            {(active?.directions ?? []).length === 0 ? null : (
              <Section titleFa="جهت محتوایی">
                <div className="flex flex-wrap gap-1">
                  {(active?.directions ?? []).map((direction) => (
                    <Badge key={direction} variant="secondary" className="text-xs">
                      {DIRECTION_LABEL_FA[direction] ?? direction}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}
            {active?.feedbackAppliedFa == null ? null : (
              <Section titleFa="بازخورد اعمال‌شده"><ContentText>{active.feedbackAppliedFa}</ContentText></Section>
            )}
          </article>

          {/* The conversation */}
          <aside className={isMobile ? "space-y-3 py-4" : "space-y-3 border-s ps-6 py-2"}>
            <h3 className="text-sm font-semibold">گفت‌وگو دربارهٔ این کانسپت</h3>
            {thread.length === 0 && pendingEchoes.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid="assistant-empty">
                هنوز چیزی گفته نشده. آنچه می‌خواهید تغییر کند را به زبان خودتان بنویسید.
              </p>
            ) : null}
            <ul className="space-y-2" data-testid="assistant-thread">
              {thread.map((c) => (
                <li key={c.id} className="rounded-md border p-2 text-sm leading-7">
                  <ContentText>{c.bodyFa}</ContentText>
                </li>
              ))}
              {pendingEchoes.map((text, index) => (
                <li
                  key={`sent-${String(index)}`}
                  className="rounded-md border border-selected bg-selected/5 p-2 text-sm leading-7"
                >
                  {text}
                </li>
              ))}
            </ul>

            {/*
              A live region, so the two moments a screen reader could not see
              — the request leaving, the revision arriving — are said aloud.
              The document re-renders silently otherwise.
            */}
            <p
              role="status"
              aria-live="polite"
              data-testid="assistant-status"
              className="min-h-5 text-xs text-muted-foreground"
            >
              {revision.isPending
                ? live
                  ? "درخواست فرستاده شد؛ ماشین در حال ساخت نسخهٔ تازه است. این کار چند ده ثانیه طول می‌کشد."
                  : "در حال ساخت نسخهٔ تازه…"
                : revision.isSuccess
                  ? "نسخهٔ تازه رسید و بالا نشان داده می‌شود."
                  : ""}
            </p>
            {revision.isError ? <CommandError error={revision.error} /> : null}

            {/*
              The side effect, said BEFORE the press. Refining the concept the
              research was built from makes that research stale — the machine
              keeps the old portfolio and the panel then offers a rebuild. That
              is the right behaviour; what was wrong was that nothing said so.
            */}
            {live && chosen && hasContent ? (
              <p
                data-testid="refine-side-effect"
                className="rounded-md border border-warning bg-warning/10 p-2 text-xs"
              >
                بهبود این کانسپت نسخهٔ تازه‌ای می‌سازد و محتوای ساخته‌شده از نسخهٔ فعلی کهنه می‌شود؛
                بعد از آن می‌توانید محتوا را بازسازی کنید. این کار هزینه دارد.
              </p>
            ) : null}

            <Textarea
              ref={messageRef}
              data-testid="assistant-input"
              aria-label="پیام برای بهبود این کانسپت"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="مثلاً: این مسیر را مینیمال‌تر کن."
              rows={3}
              disabled={!canAct.allowed}
            />
            <Button
              size="sm"
              data-testid="assistant-send"
              pending={revision.isPending}
              disabled={!canAct.allowed || message.trim() === "" || revision.isPending}
              onClick={improve}
            >
              بهبود کانسپت
            </Button>
          </aside>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t p-4" data-testid="concept-actions">
          {canAct.allowed ? null : (
            <p className="w-full text-sm text-muted-foreground" data-testid="cannot-act-reason">
              {canAct.reason}
            </p>
          )}
          <Button
            data-testid="select-concept"
            data-action={primary.confirm ? "replace" : "select"}
            pending={review.isPending || (revision.isPending && primary.confirm)}
            disabled={!canAct.allowed || busy || primary.disabled}
            aria-expanded={primary.confirm ? replaceOpen : undefined}
            aria-controls={primary.confirm ? "replace-confirm" : undefined}
            onClick={() => {
              if (primary.confirm) setReplaceOpen((prior) => !prior);
              else primary.run();
            }}
          >
            {primary.label}
          </Button>
          <Button
            variant="ghost"
            data-testid="set-aside-concept"
            disabled={!canAct.allowed || busy || state === "set_aside" || chosen}
            aria-expanded={setAsideOpen}
            aria-controls="set-aside-form"
            onClick={() => setSetAsideOpen((prior) => !prior)}
          >
            کنار گذاشتن
          </Button>
          {chosen ? (
            <p className="w-full text-xs text-muted-foreground" data-testid="set-aside-blocked-reason">
              کانسپتی که برای ساخت محتوا انتخاب شده کنار گذاشته نمی‌شود.
            </p>
          ) : null}

          {replaceOpen && primary.confirm ? (
            <div
              id="replace-confirm"
              className="drop-enter w-full space-y-2 rounded-md border border-warning bg-warning/10 p-3 text-sm"
              data-testid="replace-confirm"
            >
              <p>
                {state === "outdated"
                  ? "محتوای فعلی از نسخهٔ قبلی این کانسپت ساخته شده. بازسازی، آن را با محتوایی از نسخهٔ تازه جایگزین می‌کند."
                  : "این جلسه قبلاً برای کانسپت دیگری تحقیق ساخته است. انتخاب این یکی، آن تحقیق را جایگزین می‌کند."}{" "}
                تأییدهای قبلی محتوا پاک می‌شوند و این کار هزینه دارد.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" data-testid="confirm-replace" pending={busy} autoFocus onClick={primary.run}>
                  تأیید و ساخت
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplaceOpen(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : null}

          {setAsideOpen ? (
            <div
              id="set-aside-form"
              className="drop-enter w-full space-y-2 rounded-md border p-3"
              data-testid="set-aside-form"
            >
              <Label htmlFor="set-aside-reason">چرا کنار گذاشته می‌شود؟</Label>
              <Textarea
                ref={reasonRef}
                id="set-aside-reason"
                data-testid="set-aside-reason"
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="مثلاً: با لحن این برنامه هم‌خوان نیست."
                rows={2}
              />
              {/*
                A replacement is `regenerate` on the machine: it throws the
                whole round away and pays for another. No panel control may do
                that by accident, so live it is not offered at all rather than
                offered and refused.
              */}
              {live ? null : (
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
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  data-testid="confirm-set-aside"
                  pending={review.isPending}
                  disabled={reason.trim() === "" || busy}
                  onClick={setAside}
                >
                  ثبت
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSetAsideOpen(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : null}

          {/*
            The machine's own pace, said where the press happened. The notice
            in the corner says it too; this is for the person still looking at
            the button they pressed.
          */}
          {live && (review.isPending || revision.isPending) ? (
            <p role="status" className="w-full text-xs text-muted-foreground" data-testid="machine-working">
              {/* A build is the five-minute one; a refinement is the forty-second one. */}
              {review.isPending
                ? "ماشین مشغول ساخت تحقیق و محتواست؛ این کار حدود پنج دقیقه طول می‌کشد و نتیجه خودش می‌آید. این پنجره را می‌توانید ببندید."
                : "ماشین مشغول است؛ این کار چند ده ثانیه طول می‌کشد و نتیجه خودش می‌آید. این پنجره را می‌توانید ببندید."}
            </p>
          ) : null}
          {review.isError ? <CommandError error={review.error} className="w-full" /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * History is available, but never the main event (ADR-0020 D8).
 *
 * It opened onto a single DISABLED sentence — a menu with nothing in it to
 * reach, which for a keyboard user is a menu that does not work. Each version
 * is now an item, and choosing one shows it in the document, read-only.
 */
function ConceptHistoryMenu({
  versions,
  currentId,
  viewingId,
  onView,
}: {
  versions: readonly { id: string; number: number; createdAt: string }[];
  currentId: string | null;
  viewingId: string | null;
  onView: (id: string) => void;
}) {
  if (versions.length <= 1) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="concept-history" aria-label="تاریخچهٔ کانسپت">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>
          {toPersianDigits(String(versions.length))} بار بازنگری شده
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {[...versions].reverse().map((version) => (
          <DropdownMenuItem
            key={version.id}
            data-testid="concept-history-item"
            onSelect={() => onView(version.id)}
          >
            <span className="flex-1">
              {version.id === currentId ? "نسخهٔ فعلی" : `نسخهٔ ${toPersianDigits(String(version.number))}`}
            </span>
            <span className="text-xs text-muted-foreground">{formatDay(version.createdAt)}</span>
            {version.id === viewingId ? <span className="sr-only">در حال نمایش</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({ titleFa, children }: { titleFa: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground"><ContentText>{titleFa}</ContentText></h3>
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
