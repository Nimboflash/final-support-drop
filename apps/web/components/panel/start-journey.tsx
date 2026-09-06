"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toPersianDigits,
} from "@drop/ui";

/**
 * The start flow (V2 01 §3; journeys A01, A02, A18).
 *
 * Two entry cards, and the distinction between them is load-bearing:
 * «بدون ورودی» produces a literal absent input, NOT an empty reference list —
 * "Start without mandatory prompt, upload or URL" is a mode, not a degenerate
 * case of the other one.
 *
 * Nothing is uploaded, fetched or extracted (ADR-0019 D2). File handling shows
 * name, size, remove and a demo processing state; URLs are validated and never
 * requested; pasted text renders as plain text. The demo notice says so
 * explicitly, because a UI that looks like it is uploading is a lie about what
 * happened.
 */
const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = [".pdf", ".docx", ".md", ".txt"];

type DraftReference =
  | { kind: "FILE"; name: string; sizeBytes: number; error: string | null }
  | { kind: "URL"; url: string; error: string | null }
  | { kind: "TEXT"; text: string };

export function StartJourneyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [mode, setMode] = useState<"CHOOSE" | "BLANK" | "REFERENCE">("CHOOSE");
  const [references, setReferences] = useState<DraftReference[]>([]);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const validReferences = references.filter((r) => !("error" in r) || r.error === null);
  const canStart = mode === "BLANK" || (mode === "REFERENCE" && validReferences.length > 0);

  function addUrl() {
    const trimmed = url.trim();
    // V2 01 §3 — HTTP(S) only, and never fetched.
    const ok = trimmed.startsWith("http://") || trimmed.startsWith("https://");
    setReferences((prev) => [
      ...prev,
      { kind: "URL", url: trimmed, error: ok ? null : "فقط نشانی‌های http یا https پذیرفته می‌شوند." },
    ]);
    setUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="start-journey-dialog" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>شروع مسیر جدید</DialogTitle>
          <DialogDescription>
            پردازش رفرنس شبیه‌سازی‌شده است. هیچ فایلی بارگذاری نمی‌شود و هیچ نشانی‌ای واکشی نمی‌شود.
          </DialogDescription>
        </DialogHeader>

        {mode === "CHOOSE" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <EntryCard
              testId="entry-blank"
              titleFa="بدون ورودی"
              detailFa="بدون پرامپت، فایل یا نشانی شروع کنید؛ ماشین در چارچوب خودش کاوش می‌کند."
              onSelect={() => setMode("BLANK")}
            />
            <EntryCard
              testId="entry-reference"
              titleFa="با رفرنس"
              detailFa="فایل، نشانی مقاله یا متن چسبانده‌شده بدهید. دست‌کم یک رفرنس معتبر لازم است."
              onSelect={() => setMode("REFERENCE")}
            />
          </div>
        ) : null}

        {mode === "BLANK" ? (
          <div className="space-y-3" data-testid="blank-mode">
            <p className="text-sm">
              این مسیر با ورودیِ <bdi dir="ltr">null</bdi> شروع می‌شود — نه با فهرست رفرنس خالی.
            </p>
          </div>
        ) : null}

        {mode === "REFERENCE" ? (
          <div className="space-y-4" data-testid="reference-mode">
            <div className="space-y-2">
              <Label htmlFor="start-url">نشانی مقاله</Label>
              <div className="flex gap-2">
                <Input
                  id="start-url"
                  dir="ltr"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.invalid/article"
                />
                <Button type="button" variant="outline" onClick={addUrl} disabled={url.trim() === ""}>
                  افزودن
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-text">متن چسبانده‌شده</Label>
              <Textarea
                id="start-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="متن رفرنس را اینجا بچسبانید"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={text.trim() === ""}
                onClick={() => {
                  setReferences((prev) => [...prev, { kind: "TEXT", text: text.trim() }]);
                  setText("");
                }}
              >
                افزودن متن
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              قالب‌های پذیرفته‌شده: {ACCEPTED.join("، ")} — حداکثر{" "}
              {toPersianDigits(String(MAX_FILES))} فایل، هرکدام تا{" "}
              {toPersianDigits("20")} مگابایت.
            </p>

            {references.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز رفرنسی افزوده نشده.</p>
            ) : (
              <ul className="space-y-2" data-testid="reference-list">
                {references.map((reference, index) => (
                  <li key={index} className="rounded-md border p-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary">{reference.kind}</Badge>
                        <bdi dir="ltr" className="truncate text-xs">
                          {reference.kind === "URL"
                            ? reference.url
                            : reference.kind === "FILE"
                              ? `${reference.name} — ${toPersianDigits(String(Math.round(reference.sizeBytes / 1024)))} کیلوبایت`
                              : reference.text.slice(0, 40)}
                        </bdi>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setReferences((prev) => prev.filter((_, i) => i !== index))}
                      >
                        حذف
                      </Button>
                    </div>
                    {"error" in reference && reference.error !== null ? (
                      <p data-testid="reference-error" className="pt-1 text-destructive">
                        {reference.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          {mode === "CHOOSE" ? (
            <span className="text-xs text-muted-foreground">یکی از دو حالت را انتخاب کنید.</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setMode("CHOOSE")}>
              بازگشت
            </Button>
          )}
          <Button
            data-testid="start-journey-submit"
            disabled={!canStart}
            title={canStart ? "شروع در تیکت P6 فعال می‌شود." : "دست‌کم یک رفرنس معتبر لازم است."}
          >
            شروع
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ثبت فرمان شروع در تیکت P6 فعال می‌شود؛ هیچ اجرای واقعی ماشین انجام نشده است.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function EntryCard({
  testId,
  titleFa,
  detailFa,
  onSelect,
}: {
  testId: string;
  titleFa: string;
  detailFa: string;
  onSelect: () => void;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader>
        <CardTitle className="text-base">{titleFa}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{detailFa}</p>
        <Button type="button" size="sm" data-testid={testId} onClick={onSelect}>
          انتخاب
        </Button>
      </CardContent>
    </Card>
  );
}

export { MAX_FILES, MAX_BYTES, ACCEPTED };
