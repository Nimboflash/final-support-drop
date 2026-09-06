"use client";

import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drop/ui";
import { useDemoSession } from "../../../lib/demo/providers";
import { BASE_WORLD_LABEL_FA, scenarioCatalogue } from "../../../lib/demo/session";

/**
 * V2 02 §2 — demo persona, scenarios, preferences and READ-ONLY integration
 * status.
 *
 * Scenario selection is a LINK per scenario rather than a control that mutates
 * hidden state: the choice lives in the URL, so a particular demo world is
 * shareable, bookmarkable and survives a reload — the same rule the panel
 * applies to filters and sheet identity (ADR-0019 D13).
 *
 * "Settings should not expose API keys or pretend to connect live providers"
 * (V2 02 §2), so the integration section states what is NOT connected rather
 * than offering a connection form.
 */
export default function Page() {
  const session = useDemoSession();
  const scenarios = scenarioCatalogue();
  const active = session.scenarioId;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تنظیمات</h1>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">سناریوی نمایشی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            پنل روی «جهان پایه» باز می‌شود؛ هر سناریو آن را برای نمایش یک وضعیت خاص محدود
            می‌کند. انتخاب سناریو در نشانی صفحه ذخیره می‌شود، پس می‌توانید یک وضعیت مشخص را
            هم‌رسانی کنید یا صفحه را تازه کنید بدون از دست رفتن آن.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">سناریوی جاری:</span>
            <Badge data-testid="active-scenario">
              <bdi dir="ltr">{active}</bdi>
            </Badge>
            {active === "BASE" ? null : (
              <Button asChild size="sm" variant="outline">
                <Link href="/studio/settings">بازگشت به جهان پایه</Link>
              </Button>
            )}
          </div>

          <ul className="grid gap-2 sm:grid-cols-2" data-testid="scenario-list">
            <li>
              <ScenarioRow
                id="BASE"
                nameFa={BASE_WORLD_LABEL_FA}
                setup="جهان پایهٔ کامل با هفت پروژه، بدون هیچ پوشش سناریویی."
                active={active === "BASE"}
              />
            </li>
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <ScenarioRow
                  id={scenario.id}
                  nameFa={scenario.name}
                  setup={scenario.setup}
                  acceptanceId={scenario.acceptanceId}
                  active={active === scenario.id}
                />
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

function ScenarioRow({
  id,
  nameFa,
  setup,
  acceptanceId,
  active,
}: {
  id: string;
  nameFa: string;
  setup: string;
  acceptanceId?: string;
  active: boolean;
}) {
  const href = id === "BASE" ? "/studio/settings" : `/studio/settings?scenario=${id}`;
  return (
    <Link
      href={href}
      data-testid="scenario-option"
      data-scenario={id}
      aria-current={active ? "true" : undefined}
      className={`block rounded-md border p-2 transition-colors hover:bg-accent ${
        active ? "border-selected bg-selected/10" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <bdi dir="ltr">{id}</bdi>
        </Badge>
        <span className="font-medium">{nameFa}</span>
        {acceptanceId === undefined || acceptanceId === "-" ? null : (
          <Badge variant="secondary">
            <bdi dir="ltr">{acceptanceId}</bdi>
          </Badge>
        )}
        {active ? <Badge>فعال</Badge> : null}
      </div>
      <p className="pt-1 text-xs text-muted-foreground">{setup}</p>
    </Link>
  );
}
