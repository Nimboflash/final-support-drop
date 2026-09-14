"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drop/ui";
import { ProviderKeyCard } from "../../../components/panel/provider-key-card";
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
  const scenarios = scenarioCatalogue();
  const active = session.scenarioId;
  /** Whether this page is describing a live machine session rather than the demo world. */
  const live = session.mode === "REAL";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تنظیمات</h1>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">سناریوی نمایشی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            نام و شرح هر سناریو، عیناً از فهرست ثبت‌شدهٔ سند مرجع است و ترجمه نمی‌شود تا
            پیوندش با آن سند حفظ بماند.
          </p>
          <p className="text-muted-foreground">
            پنل روی «جهان پایه» باز می‌شود؛ هر سناریو آن را برای نمایش یک وضعیت خاص محدود
            می‌کند. انتخاب سناریو در نشانی صفحه ذخیره می‌شود، پس می‌توانید یک وضعیت مشخص را
            هم‌رسانی کنید یا صفحه را تازه کنید بدون از دست رفتن آن.
          </p>

          {/*
            V2 03 §6 — "Corrupt/old data offers Reset Demo with confirmation
            instead of crashing." The panel now RESUMES stored state, so this is
            the way out when what was stored cannot be read, and the way to
            return to a clean world after a demo.
          */}
          {session.hydration === "UNUSABLE" ? (
            <p
              role="alert"
              data-testid="hydration-warning"
              className="rounded-md border border-warning bg-warning/10 p-2 text-sm"
            >
              وضعیت ذخیره‌شدهٔ قبلی خوانده نشد، پس پنل از جهان تازه شروع کرد. می‌توانید آن را
              پاک کنید تا این پیام دیگر دیده نشود.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">سناریوی جاری:</span>
            <Badge data-testid="active-scenario">
              <bdi lang="en" dir="ltr">
                {active}
              </bdi>
            </Badge>
            {active === "BASE" ? null : (
              <Button asChild size="sm" variant="outline">
                <a href="/studio/settings">بازگشت به جهان پایه</a>
              </Button>
            )}
            {/*
              Disabled rather than removed when the panel is reading a live
              machine session: there is no stored world to clear, because REAL
              mode deliberately writes nothing. `no-inert-controls.test.ts`
              wants the `disabled` in the tag itself, and V2 03 §6 wants the
              reason on screen rather than in a tooltip.
            */}
            <Button
              size="sm"
              variant="outline"
              data-testid="reset-demo"
              disabled={live}
              onClick={() => {
                session.persistence.reset();
                // A full navigation, so the world is rebuilt from the seed
                // rather than patched in place.
                window.location.reload();
              }}
            >
              پاک‌کردن وضعیت ذخیره‌شده
            </Button>
          </div>

          {live ? (
            <p className="text-sm text-muted-foreground" data-testid="reset-disabled-reason">
              چون این صفحه دادهٔ زندهٔ ماشین را نشان می‌دهد، چیزی روی این دستگاه ذخیره نمی‌شود و
              پاک‌کردنی هم در کار نیست.
            </p>
          ) : null}

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
                  nameEn={scenario.name}
                  setup={scenario.setup}
                  acceptanceId={scenario.acceptanceId}
                  active={active === scenario.id}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ProviderKeyCard />
    </div>
  );
}

/**
 * A scenario row.
 *
 * `nameEn` and its setup line are the RECORDED names of the (18 §7.2) scenario
 * list, pinned 1:1 by `scenarios.test.ts` against a committed copy — translating
 * them would break that guard and lose the link to the specification. They are
 * therefore marked as reference text rather than passed off as interface
 * language: `lang="en" dir="ltr"` so a screen reader pronounces them correctly
 * instead of reading English letters as Persian.
 */
function ScenarioRow({
  id,
  nameFa,
  nameEn,
  setup,
  acceptanceId,
  active,
}: {
  id: string;
  nameFa?: string;
  nameEn?: string;
  setup: string;
  acceptanceId?: string;
  active: boolean;
}) {
  const href = id === "BASE" ? "/studio/settings" : `/studio/settings?scenario=${id}`;
  return (
    <a
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
          {/* The recorded scenario id, quoted verbatim like the names above. */}
          <bdi lang="en" dir="ltr">
            {id}
          </bdi>
        </Badge>
        {nameFa === undefined ? null : <span className="font-medium">{nameFa}</span>}
        {nameEn === undefined ? null : (
          <span className="font-medium" lang="en" dir="ltr">
            {nameEn}
          </span>
        )}
        {acceptanceId === undefined || acceptanceId === "-" ? null : (
          <Badge variant="secondary">
            <bdi dir="ltr">{acceptanceId}</bdi>
          </Badge>
        )}
        {active ? <Badge>فعال</Badge> : null}
      </div>
      <p
        className="pt-1 text-xs text-muted-foreground"
        lang={nameEn === undefined ? undefined : "en"}
        dir={nameEn === undefined ? undefined : "ltr"}
      >
        {setup}
      </p>
    </a>
  );
}
