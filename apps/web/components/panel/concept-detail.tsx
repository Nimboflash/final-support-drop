"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
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
}: {
  world: PanelSnapshot;
  concept: Concept | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSent([]);
    }
  }, [open]);

  if (concept === null) return null;

  const versions = world.conceptVersions.filter((v) => v.conceptId === concept.id);
  const active = versions.find((v) => v.id === concept.activeVersionId) ?? versions[0];
  const state = conceptStateOf(concept);
  const target = { type: "CONCEPT" as const, id: concept.id, versionId: concept.activeVersionId };

  function improve() {
    const text = message.trim();
    if (text === "") return;
    setSent((prior) => [...prior, text]);
    setMessage("");
    revision.mutate({ target, feedbackFa: text, route: "CONCEPT_REVISION" });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
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
                { target, outcome: "APPROVED", reasonFa: "برای تولید محتوا انتخاب شد." },
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
            onClick={() =>
              review.mutate(
                { target, outcome: "REJECTED", reasonFa: "فعلاً کنار گذاشته شد." },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            کنار گذاشتن
          </Button>
          {review.isError ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {commandErrorFa(review.error)}
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
          این کانسپت {count} بار بازنگری شده است.
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

function formatDay(instant: string | undefined): string {
  if (instant === undefined) return "—";
  return instant.slice(0, 10);
}
