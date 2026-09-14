"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Play, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drop/ui";

/**
 * Where a person puts the provider credential (ADR-0024).
 *
 * V2 02 §2 says "Settings should not expose API keys or pretend to connect
 * live providers", and until now this surface obeyed it by stating what was
 * NOT connected. The owner has asked for the other thing, so the section that
 * described an absent connection becomes the place to make a real one.
 *
 * What this component may NOT do, and does not:
 *
 *   - It never receives the key back. The route answers `configured` and the
 *     last four characters; there is no path that returns the value.
 *   - It never puts the key in React state beyond the un-submitted field, and
 *     never in `localStorage`. On submit the field is cleared.
 *   - It never claims the machine is live. A written key reaches the service on
 *     its NEXT start, and the panel says exactly that instead of implying the
 *     provider is already answering.
 *
 * The three-step block is borrowed from the reference the owner sent (Acctual):
 * say what the setup IS before asking for anything, then ask for one thing.
 */
interface KeyState {
  readonly configured: boolean;
  readonly hint: string | null;
}

type Status = "LOADING" | "OFF" | "READY";

export function ProviderKeyCard() {
  const [status, setStatus] = useState<Status>("LOADING");
  const [state, setState] = useState<KeyState>({ configured: false, hint: null });
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/provider-key", { cache: "no-store" });
      if (!response.ok) {
        setStatus("OFF");
        return;
      }
      setState((await response.json()) as KeyState);
      setStatus("READY");
    } catch {
      setStatus("OFF");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/provider-key", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: draft }),
    });
    // Cleared whether or not it was accepted: a rejected key is still a key.
    setDraft("");
    if (!response.ok) {
      setError("این کلید پذیرفته نشد. شکل کلید OpenRouter را بررسی کنید.");
      return;
    }
    setState((await response.json()) as KeyState);
    setEditing(false);
    setRestartNeeded(true);
  }

  async function clear() {
    const response = await fetch("/api/provider-key", { method: "DELETE" });
    if (!response.ok) return;
    setState((await response.json()) as KeyState);
    setRestartNeeded(true);
  }

  if (status === "LOADING") return null;

  return (
    <Card className="drop-material gap-3">
      <CardHeader>
        <CardTitle className="text-base">وضعیت اتصال</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {status === "OFF" ? (
          <>
            <p>
              <Badge variant="outline" data-testid="connection-state">
                متصل نیست
              </Badge>{" "}
              این پنل هیچ کلیدی نگه نمی‌دارد و تا وقتی این بخش روشن نشده، جایی برای واردکردن آن
              هم ندارد.
            </p>
            <p className="text-muted-foreground">
              برای روشن‌کردن، سرور را با{" "}
              <bdi lang="en" dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                DROP_PROVIDER_KEY_ADMIN=1
              </bdi>{" "}
              اجرا کنید. عمداً خاموش است: این صفحه رمزی ندارد، پس هرکسی که به آن برسد به این بخش
              هم می‌رسد. فقط روی دستگاه خودتان.
            </p>
          </>
        ) : (
          <>
            {/*
              Say what the setup is before asking for anything — three steps,
              then one field. The reference's own move.
            */}
            <ul className="grid gap-3 sm:grid-cols-3" data-testid="provider-steps">
              {[
                { icon: KeyRound, title: "کلید را وارد کنید", detail: "روی این دستگاه ذخیره می‌شود، نه در مرورگر." },
                { icon: ShieldCheck, title: "کنار مخزن نگه داشته می‌شود", detail: "در فایلی که از گیت بیرون است." },
                { icon: Play, title: "ماشین را دوباره اجرا کنید", detail: "کلید در اجرای بعدی خوانده می‌شود." },
              ].map((step) => (
                <li key={step.title} className="rounded-md border border-border bg-secondary/40 p-3">
                  <step.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <p className="mt-2 font-medium">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ul>

            {state.configured && !editing ? (
              <div className="flex flex-wrap items-center gap-2" data-testid="provider-configured">
                <Badge variant="outline" data-testid="connection-state">
                  کلید ثبت شده
                </Badge>
                <span className="text-muted-foreground">
                  چهار رقم آخر:{" "}
                  <bdi lang="en" dir="ltr" className="font-mono">
                    {state.hint}
                  </bdi>
                </span>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  تعویض کلید
                </Button>
                <Button size="sm" variant="outline" onClick={() => void clear()}>
                  پاک‌کردن کلید
                </Button>
              </div>
            ) : (
              <form onSubmit={(event) => void submit(event)} className="space-y-2">
                <label htmlFor="provider-key" className="block font-medium">
                  کلید OpenRouter
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="provider-key"
                    data-testid="provider-key-input"
                    // A password field, so it is never shown, never suggested
                    // and never saved by the browser.
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    dir="ltr"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="sk-or-v1-…"
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                  />
                  <Button size="sm" type="submit" disabled={draft.trim() === ""}>
                    ثبت کلید
                  </Button>
                  {state.configured ? (
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      رهاکردن
                    </Button>
                  ) : null}
                </div>
                {error === null ? null : (
                  <p role="alert" className="text-destructive">
                    {error}
                  </p>
                )}
              </form>
            )}

            {restartNeeded ? (
              <p
                data-testid="provider-restart"
                className="rounded-md border border-warning bg-warning/10 p-2"
              >
                برای اثرگذاری، ماشین را دوباره اجرا کنید. تا آن زمان همان چیزی اجرا می‌شود که الان
                در حال اجراست.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
