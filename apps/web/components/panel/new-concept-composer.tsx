"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  ContentText,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ALL_PROJECTS, useSelectedProject } from "./project-selector";
import { CommandError } from "./command-error";
import { useCanAct } from "../../lib/demo/policy";
import { useDemoSession } from "../../lib/demo/providers";
import { useStartMachineSession } from "../../lib/machine/use-start-session";

/**
 * The composer (ADR-0020, brief §6 step 1).
 *
 * One surface covering every way to start, and critically NOT asking the person
 * to pick a mode first: they write, or attach, or paste a link, or start with
 * nothing — and the primary action is the same in all four cases. The earlier
 * design made "blank versus reference" a fork before any input; the brief
 * removes that fork.
 *
 * Nothing is uploaded or fetched. A link is validated and never requested. In
 * REAL mode the links are APPENDED to the brief as plain text — that is the
 * only way a reference reaches the machine, whose session takes one string —
 * and the dialog says so. They used to be collected and then silently dropped
 * on send, so a brief built around a pasted article was generated from the
 * prose alone.
 */
type Attachment = { kind: "link"; value: string; error: string | null };

export function NewConceptComposer({
  world,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  world: PanelSnapshot;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Returns focus to the control that opened this overlay. */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  // The project you are already looking at, not projects[0]. Opening the
  // composer from an empty project used to offer to start work in a different
  // one — the first thing that project said to you was about another project.
  const selected = useSelectedProject();
  const [projectId, setProjectId] = useState<string>(
    selected === ALL_PROJECTS ? (world.projects[0]?.id ?? "") : selected,
  );
  const [brief, setBrief] = useState("");
  const [link, setLink] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [phase, setPhase] = useState<"COMPOSE" | "WORKING">("COMPOSE");
  /** Whether this press reaches a real machine, or explains that it does not. */
  const live = useDemoSession().mode === "REAL";
  const canAct = useCanAct();
  const start = useStartMachineSession();
  const linkRef = useRef<HTMLInputElement | null>(null);

  const linkError =
    link.trim() !== "" && !/^https?:\/\//.test(link.trim())
      ? "فقط نشانی‌های http یا https پذیرفته می‌شوند."
      : null;

  function addLink() {
    const value = link.trim();
    if (value === "") return;
    const ok = value.startsWith("http://") || value.startsWith("https://");
    setAttachments((prior) => [
      ...prior,
      { kind: "link", value, error: ok ? null : "فقط نشانی‌های http یا https پذیرفته می‌شوند." },
    ]);
    setLink("");
    // The field is what the person is working in; the button disabling itself
    // under the pointer must not take focus with it.
    linkRef.current?.focus();
  }

  /** What actually goes to the machine: the brief, then the references, in text. */
  function composedBrief(): string {
    const links = attachments.filter((a) => a.error === null).map((a) => a.value);
    const head = brief.trim();
    if (links.length === 0) return head;
    return `${head}\n\nمنابع:\n${links.join("\n")}`;
  }

  function begin() {
    setPhase("WORKING");
    // In MOCK mode there is nothing to ask: generation belongs to the machine,
    // and the panel adds nothing it did not receive (ADR-0019 D2).
    if (!live) return;

    // In REAL mode the brief is the whole point, and it only reaches the
    // machine through session creation — `generate_concepts` takes no body and
    // reads the brief off the session. So a new brief is a new session.
    start.mutate(composedBrief(), {
      onSuccess: () => {
        // A full navigation, not a router push: the provider lives in the
        // LAYOUT and would not remount, leaving the panel on the old session.
        window.location.assign("/studio/concepts");
      },
    });
  }

  function close(next: boolean) {
    if (!next) {
      setPhase("COMPOSE");
      setBrief("");
      setLink("");
      setAttachments([]);
      start.reset();
    }
    onOpenChange(next);
  }

  const projectHasConcepts = world.concepts.some((c) => c.projectId === projectId);
  const cannotStart = !canAct.allowed || projectId === "";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="concept-composer" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>شروع کانسپت جدید</DialogTitle>
          <DialogDescription>
            {live
              ? "هر درخواست تازه یک جلسهٔ تازه روی ماشین می‌سازد و پنل به آن می‌رود. جلسهٔ فعلی از تنظیمات قابل بازگشت است."
              : "می‌توانید یک درخواست بنویسید، رفرنس بدهید، یا بدون هیچ ورودی شروع کنید."}
          </DialogDescription>
        </DialogHeader>

        {phase === "WORKING" ? (
          /*
            Two different truths, and the panel must not tell the wrong one.

            In MOCK mode nothing is generated: three "working…" lines printed at
            once implied work that is not happening, and the panel cannot invent
            cards it did not receive (ADR-0019 D2). So it says so, and takes the
            person to the concepts that do exist rather than leaving them on a
            dead dialog.

            In REAL mode the machine really is working, it takes tens of seconds,
            and it is spending the owner's budget while it does. That deserves a
            different sentence and no action beside it — closing the dialog does
            not stop the call, and the surfaces behind it re-read every ten
            seconds, so the result arrives on its own.
          */
          <div className="space-y-3 py-6 text-center" data-testid="composer-working">
            {live ? (
              <>
                {/*
                  A live region: this phase replaces the whole compose tree,
                  and without it a screen-reader user heard nothing at the
                  moment the paid call began.
                */}
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm"
                  data-testid="composer-live-working"
                >
                  {start.isPending
                    ? "ماشین در حال ساخت کانسپت‌هاست. این کار ممکن است چند ده ثانیه طول بکشد و هزینه دارد؛ دوباره نزنید."
                    : start.isSuccess
                      ? "کانسپت‌ها ساخته شدند."
                      : "درخواست فرستاده نشد."}
                </p>
                {start.isError ? <CommandError error={start.error} /> : null}
                {start.isPending ? null : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {start.isError ? (
                      <Button size="sm" data-testid="composer-retry" onClick={() => setPhase("COMPOSE")}>
                        بازگشت به درخواست
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" asChild data-testid="composer-go-to-concepts">
                      <Link href={`/studio/concepts?project=${projectId}`}>دیدن کانسپت‌ها</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => close(false)}>
                      بستن
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm" role="status">
                  ساخت کانسپت در این نسخهٔ نمایشی انجام نمی‌شود.
                </p>
                <p className="text-sm text-muted-foreground">
                  {projectHasConcepts
                    ? "کانسپت‌های موجود این پروژه را ببینید."
                    : "این پروژه هنوز کانسپتی ندارد؛ پروژه‌های دیگر را در نمای کلی ببینید."}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" asChild data-testid="composer-go-to-concepts">
                    {projectHasConcepts ? (
                      <Link href={`/studio/concepts?project=${projectId}`}>دیدن کانسپت‌ها</Link>
                    ) : (
                      <Link href="/studio">رفتن به نمای کلی</Link>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => close(false)}>
                    بستن
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/*
              One project per machine session, so live there is nothing to
              choose. The select stayed on screen with a single option and
              read as a control; it is the project's name now, stated.
            */}
            {live ? null : (
              <div className="space-y-2">
                <Label htmlFor="composer-project">پروژه</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="composer-project" data-testid="composer-project">
                    <SelectValue placeholder="یک پروژه انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {world.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <ContentText>{project.titleFa}</ContentText>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="composer-brief">درخواست یا بریف</Label>
              <Textarea
                id="composer-brief"
                data-testid="composer-brief"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="مثلاً: یک مسیر دربارهٔ آیین‌های کوچک روزمره."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="composer-link">نشانی یا رفرنس</Label>
              <div className="flex gap-2">
                <Input
                  ref={linkRef}
                  id="composer-link"
                  dir="ltr"
                  value={link}
                  aria-invalid={linkError !== null}
                  aria-describedby={linkError === null ? undefined : "composer-link-error"}
                  onChange={(event) => setLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://example.invalid/article"
                />
                <Button type="button" variant="outline" onClick={addLink} disabled={link.trim() === ""}>
                  افزودن
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {live
                  ? "نشانی‌ها به متن درخواست افزوده می‌شوند تا ماشین ببیندشان؛ چیزی دانلود نمی‌شود."
                  : "نشانی فقط ثبت می‌شود؛ چیزی دانلود نمی‌شود."}
              </p>
            </div>

            {attachments.length === 0 ? null : (
              <ul className="space-y-2 text-sm" data-testid="composer-attachments">
                {attachments.map((attachment, index) => (
                  <li key={index} className="drop-enter rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <bdi dir="ltr" className="truncate text-xs">
                        {attachment.value}
                      </bdi>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAttachments((prior) => prior.filter((_, i) => i !== index))
                        }
                      >
                        حذف
                      </Button>
                    </div>
                    {attachment.error !== null ? (
                      <p
                        id={index === attachments.length - 1 ? "composer-link-error" : undefined}
                        role="alert"
                        data-testid="composer-error"
                        className="pt-1 text-destructive"
                      >
                        {attachment.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {cannotStart ? (
              <p className="text-sm text-muted-foreground" data-testid="start-blocked-reason">
                {canAct.allowed
                  ? "برای شروع، اول یک پروژه لازم است."
                  : canAct.reason}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              {/* The secondary route is a button, not a different mode chosen
                  up front: the person can always just begin. */}
              <Button
                variant="ghost"
                size="sm"
                data-testid="start-blank"
                disabled={cannotStart}
                onClick={begin}
              >
                بدون ورودی شروع کن
              </Button>
              <Button data-testid="generate-concepts" onClick={begin} disabled={cannotStart}>
                تولید کانسپت‌ها
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              معمولاً <Badge variant="outline">۳ تا ۴</Badge> کانسپت برای بررسی ساخته می‌شود.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
