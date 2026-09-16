"use client";

import { useEffect, useState } from "react";
import { Badge, Button, ContentText, PersianDateTime } from "@drop/ui";
import { SettingsRow, SettingsSection } from "./settings-section";
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
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setKnown(readStartedSessions());
  }, []);

  if (session.mode !== "REAL" || session.machineSessionId === null) return null;
  const current = session.machineSessionId;
  const others = known.filter((row) => row.id !== current);

  async function go(which: string, action: () => Promise<void>) {
    setError(null);
    setBusy(which);
    try {
      await action();
      window.location.assign("/studio");
    } catch (thrown) {
      setError(thrown);
      setBusy(null);
    }
  }

  return (
    <SettingsSection
      id="session"
      title="جلسهٔ ماشین"
      description="هر درخواست تازه، جلسهٔ تازه‌ای می‌سازد. جلسه‌های قبلی این مرورگر از اینجا و از ستون کناری قابل بازگشت‌اند."
      testId="machine-session-card"
    >
      <SettingsRow
        label="جلسهٔ فعلی"
        description={
          <Badge variant="outline" data-testid="current-session">
            <bdi lang="en" dir="ltr" className="font-mono">{current}</bdi>
          </Badge>
        }
      >
        <Button
          size="sm"
          variant="outline"
          data-testid="forget-session"
          pending={busy === "forget"}
          disabled={busy !== null}
          onClick={() => void go("forget", forgetMachineSession)}
        >
          فراموش‌کردن این جلسه
        </Button>
      </SettingsRow>

      <SettingsRow
        label="جلسه‌های دیگر این مرورگر"
        description={
          others.length === 0 ? (
            <span data-testid="no-other-sessions">جلسهٔ دیگری از این مرورگر شروع نشده است.</span>
          ) : (
            <ul className="space-y-2" data-testid="session-list">
              {others.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
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
                    pending={busy === row.id}
                    disabled={busy !== null}
                    onClick={() => void go(row.id, () => switchMachineSession(row.id))}
                  >
                    رفتن به این جلسه
                  </Button>
                </li>
              ))}
            </ul>
          )
        }
      />

      <SettingsRow
        label="پیش‌فرض سرور"
        description="با فراموش‌کردن جلسه، پنل به جلسهٔ پیش‌فرض سرور برمی‌گردد، یا اگر نباشد، به نسخهٔ نمایشی."
      />

      {error === null ? null : <div className="py-3"><CommandError error={error} /></div>}
    </SettingsSection>
  );
}
