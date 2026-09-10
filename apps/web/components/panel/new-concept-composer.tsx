"use client";

import { useState } from "react";
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

/**
 * The composer (ADR-0020, brief §6 step 1).
 *
 * One surface covering every way to start, and critically NOT asking the person
 * to pick a mode first: they write, or attach, or paste a link, or start with
 * nothing — and the primary action is the same in all four cases. The earlier
 * design made "blank versus reference" a fork before any input; the brief
 * removes that fork.
 *
 * Nothing is uploaded or fetched. A file contributes its name and size; a link
 * is validated and never requested. The demo marker in the shell is what keeps
 * that honest, rather than a notice repeated on this dialog (ADR-0020 D6).
 */
type Attachment =
  | { kind: "link"; value: string; error: string | null }
  | { kind: "note"; value: string };

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

  function addLink() {
    const value = link.trim();
    if (value === "") return;
    const ok = value.startsWith("http://") || value.startsWith("https://");
    setAttachments((prior) => [
      ...prior,
      { kind: "link", value, error: ok ? null : "فقط نشانی‌های http یا https پذیرفته می‌شوند." },
    ]);
    setLink("");
  }

  function start() {
    // Generation belongs to the machine build; the panel shows an honest
    // working state and adds nothing it did not receive.
    setPhase("WORKING");
  }

  function close(next: boolean) {
    if (!next) {
      setPhase("COMPOSE");
      setBrief("");
      setLink("");
      setAttachments([]);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        data-testid="concept-composer" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>شروع کانسپت جدید</DialogTitle>
          <DialogDescription>
            می‌توانید یک درخواست بنویسید، رفرنس بدهید، یا بدون هیچ ورودی شروع کنید.
          </DialogDescription>
        </DialogHeader>

        {phase === "WORKING" ? (
          /*
            Three "working…" lines printed at once implied work that is not
            happening. Concept generation belongs to the machine build, which is
            not connected here, and the panel cannot invent cards it did not
            receive (ADR-0019 D2). So this says so plainly and, rather than
            leaving the person on a dead dialog, takes them to the concepts of
            the project they chose.
          */
          <div className="space-y-3 py-6 text-center" data-testid="composer-working">
            <p className="text-sm">
              ساخت کانسپت در این نسخهٔ نمایشی انجام نمی‌شود.
            </p>
            <p className="text-sm text-muted-foreground">
              کانسپت‌های موجود این پروژه را ببینید.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" asChild data-testid="composer-go-to-concepts">
                <a href={`/studio/concepts?project=${projectId}`}>دیدن کانسپت‌ها</a>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => close(false)}>
                بستن
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                  id="composer-link"
                  dir="ltr"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="https://example.invalid/article"
                />
                <Button type="button" variant="outline" onClick={addLink} disabled={link.trim() === ""}>
                  افزودن
                </Button>
              </div>
            </div>

            {attachments.length === 0 ? null : (
              <ul className="space-y-2 text-sm" data-testid="composer-attachments">
                {attachments.map((attachment, index) => (
                  <li key={index} className="rounded-md border p-2">
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
                    {attachment.kind === "link" && attachment.error !== null ? (
                      <p data-testid="composer-error" className="pt-1 text-destructive">
                        {attachment.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              {/* The secondary route is a button, not a different mode chosen
                  up front: the person can always just begin. */}
              <Button variant="ghost" size="sm" data-testid="start-blank" onClick={start}>
                بدون ورودی شروع کن
              </Button>
              <Button data-testid="generate-concepts" onClick={start} disabled={projectId === ""}>
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
