"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drop/ui";
import { ThemeControl } from "../../../components/panel/theme-control";
import { ProviderKeyCard } from "../../../components/panel/provider-key-card";
import { MachineSessionCard } from "../../../components/panel/machine-session-card";
import { useDemoSession } from "../../../lib/demo/providers";

/**
 * V2 02 §2 — demo persona, scenarios, preferences and READ-ONLY integration
 * status.
 *
 * Scenario selection is a LINK per scenario rather than a control that mutates
 * hidden state: the choice lives in the URL, so a particular demo world is
 * shareable, bookmarkable and survives a reload — the same rule the panel
 * applies to filters and sheet identity (ADR-0019 D13).
 *
 * These are plain anchors, not `next/link`, deliberately. A client-side
 * navigation would change the URL without remounting the provider that reads
 * it, leaving the panel showing the previous world under the new address. A
 * full navigation reseeds the demo world, which is also the honest semantics: a
 * different scenario IS a different world.
 *
 * "Settings should not expose API keys or pretend to connect live providers"
 * (V2 02 §2), so the integration section states what is NOT connected rather
 * than offering a connection form.
 */
export default function Page() {
  const session = useDemoSession();
  const active = session.scenarioId;
  /** Whether this page is describing a live machine session rather than the demo world. */
  const live = session.mode === "REAL";

  return (
    <div className="drop-surface space-y-6">
      <header className="drop-rule pb-4">
        <h1 className="text-3xl font-bold tracking-tight">تنظیمات</h1>
      </header>

      {/* The one thing on this page a person comes here to DO, first. */}
      <ProviderKeyCard />

      {/* Which session the panel is on, and the way back to the others. */}
      <MachineSessionCard />

      <Card className="drop-material gap-3">
        <CardHeader>
          <CardTitle className="text-base">ظاهر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            پنل روی تیره ساخته شده، اما روشن هم کار می‌کند. می‌توانید یکی را انتخاب کنید یا بگذارید
            از سیستم پیروی کند.
          </p>
          <ThemeControl />
        </CardContent>
      </Card>

      <Card className="drop-material gap-3">
        <CardHeader>
          <CardTitle className="text-base">وضعیت ذخیره‌شده</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {session.hydration === "UNUSABLE" ? (
            <p
              role="alert"
              data-testid="hydration-warning"
              className="rounded-md border border-warning bg-warning/10 p-2"
            >
              وضعیت ذخیره‌شدهٔ قبلی خوانده نشد، پس پنل از جهان تازه شروع کرد.
            </p>
          ) : null}

          <p className="text-muted-foreground">
            کارهایی که در پنل انجام می‌دهید روی همین دستگاه نگه داشته می‌شود تا با تازه‌کردن صفحه
            از دست نرود. پاک‌کردن، پنل را به حالت اول برمی‌گرداند.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              The demo world's own name, demo only. Live, this printed «BASE» —
              the unused mock id — beside a shell badge saying the data was the
              machine's. The session card above says what is live instead.
            */}
            {live ? null : (
              <Badge variant="outline" data-testid="active-scenario">
                <bdi lang="en" dir="ltr">
                  {active}
                </bdi>
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              data-testid="reset-demo"
              disabled={live}
              onClick={() => {
                session.persistence.reset();
                window.location.reload();
              }}
            >
              پاک‌کردن وضعیت ذخیره‌شده
            </Button>
          </div>

          {live ? (
            <p className="text-muted-foreground" data-testid="reset-disabled-reason">
              این صفحه دادهٔ زندهٔ ماشین را نشان می‌دهد، پس چیزی روی این دستگاه ذخیره نمی‌شود.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

