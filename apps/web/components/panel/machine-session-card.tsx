"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ContentText, PersianDateTime } from "@drop/ui";
import { useDemoSession } from "../../lib/demo/providers";
import { readStartedSessions, type StartedSession } from "../../lib/machine/session-history";
import { forgetMachineSession, switchMachineSession } from "../../lib/machine/start-session";
import { CommandError } from "./command-error";

/**
 * The session the panel is on, and the way back to the ones it left.
 *
 * «شروع کانسپت جدید» repoints the panel at a new session — deliberately, and
 * the composer now says so — but nothing anywhere could return to the previous
 * one: `DELETE /api/machine/current` had no caller and no surface listed
 * sessions. This is that surface. The list is what this browser started (see
 * `session-history.ts`); switching is a full navigation because a different
 * session is a different world and the provider lives in the layout.
 */
export function MachineSessionCard() {
  const session = useDemoSession();
  const [known, setKnown] = useState<readonly StartedSession[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setKnown(readStartedSessions());
  }, []);

  if (session.mode !== "REAL" || session.machineSessionId === null) return null;
  const current = session.machineSessionId;
  const others = known.filter((row) => row.id !== current);

  async function go(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      window.location.assign("/studio");
    } catch (thrown) {
      setError(thrown);
      setBusy(false);
    }
  }

  return (
    <Card className="drop-material gap-3" data-testid="machine-session-card">
      <CardHeader>
        <CardTitle className="text-base">جلسهٔ ماشین</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" data-testid="current-session">
            <bdi lang="en" dir="ltr" className="font-mono">{current}</bdi>
          </Badge>
          <span className="text-muted-foreground">
            پنل اکنون این جلسه را نشان می‌دهد. هر درخواست تازه، جلسهٔ تازه‌ای می‌سازد.
          </span>
        </p>

        {others.length === 0 ? (
          <p className="text-muted-foreground" data-testid="no-other-sessions">
            جلسهٔ دیگری از این مرورگر شروع نشده است.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="session-list">
            {others.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    <ContentText>{row.briefFa === "" ? "بدون ورودی" : row.briefFa}</ContentText>
                  </span>
                  {row.startedAt === "" ? null : (
                    <PersianDateTime value={row.startedAt} className="text-xs text-muted-foreground" />
                  )}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="switch-session"
                  disabled={busy}
                  onClick={() => void go(() => switchMachineSession(row.id))}
                >
                  رفتن به این جلسه
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            data-testid="forget-session"
            disabled={busy}
            onClick={() => void go(forgetMachineSession)}
          >
            فراموش‌کردن جلسهٔ انتخاب‌شده
          </Button>
          <span className="text-xs text-muted-foreground">
            پنل به جلسهٔ پیش‌فرض سرور برمی‌گردد، یا اگر نباشد، به نسخهٔ نمایشی.
          </span>
        </div>

        {error === null ? null : <CommandError error={error} />}
      </CardContent>
    </Card>
  );
}
