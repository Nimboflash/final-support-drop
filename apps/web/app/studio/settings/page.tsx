"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@drop/ui";
import { useDemoSession } from "../../../lib/demo/providers";
import { scenarioCatalogue } from "../../../lib/demo/session";

/**
 * V2 02 §2 — demo persona, scenarios, preferences and READ-ONLY integration
 * status.
 *
 * "Settings should not expose API keys or pretend to connect live providers"
 * (V2 02 §2), so the integration section states what is not connected rather
 * than offering a connection form.
 */
export default function Page() {
  const session = useDemoSession();
  const scenarios = scenarioCatalogue();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تنظیمات</h1>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">سناریوی نمایشی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            سناریوی جاری: <bdi dir="ltr">{session.scenarioId}</bdi>. پنل روی «جهان پایه» باز
            می‌شود و هر سناریو آن را برای نمایش یک وضعیت خاص محدود می‌کند. انتخاب سناریو در
            تیکت P6 فعال می‌شود.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="scenario-list">
            {scenarios.map((scenario) => (
              <li key={scenario.id} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <bdi dir="ltr">{scenario.id}</bdi>
                  </Badge>
                  <span>{scenario.name}</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">{scenario.setup}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">وضعیت اتصال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <Badge variant="outline">متصل نیست</Badge> ماشین‌های ۰۱ تا ۰۵ در این نسخه ساخته
            نشده‌اند و از طریق آداپتور بعداً وصل می‌شوند.
          </p>
          <p className="text-muted-foreground">
            این پنل هیچ کلید API‌ای نگه نمی‌دارد و به هیچ ارائه‌دهنده‌ای وصل نمی‌شود.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
