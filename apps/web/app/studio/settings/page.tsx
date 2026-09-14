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
    <div className="space-y-6">
      <header className="drop-rule pb-4">
        <h1 className="text-3xl font-bold tracking-tight">تنظیمات</h1>
      </header>

      {/* The one thing on this page a person comes here to DO, first. */}
      <ProviderKeyCard />

      <Card className="drop-material gap-3">
        <CardHeader>
          <CardTitle className="text-base">دادهٔ نمونه برای بررسی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/*
            The owner asked what «جهان نمایشی» even was — a fair question, and
            the honest answer is that the card was named after the thing the
            code calls it. The scenarios are the twenty-four recorded review
            situations; a person cannot be expected to infer that from an
            English name and a number. One sentence, saying what it is FOR.
          */}
          <p className="text-muted-foreground">
            پنل با دادهٔ نمونه کار می‌کند تا بدون ماشین هم بشود آن را بررسی کرد. هر ردیف پایین یک
            وضعیت مشخص را می‌سازد — مثلاً وقتی کانسپتی کنار گذاشته شده یا ساخت خروجی شکست خورده —
            تا ببینید پنل در آن وضعیت چه نشان می‌دهد. روی کار واقعی شما اثری ندارد.
          </p>
          {session.hydration === "UNUSABLE" ? (
            <p
              role="alert"
              data-testid="hydration-warning"
              className="rounded-md border border-warning bg-warning/10 p-2"
            >
              وضعیت ذخیره‌شدهٔ قبلی خوانده نشد، پس پنل از جهان تازه شروع کرد.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">جاری:</span>
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

          {/*
            One line per scenario, not a card each.

            This was twenty-four two-line cards carrying the recorded English
            setup sentence, and it made the page mostly scenario list — on a
            surface whose actual job is one credential and one reset. The id and
            the name locate a scenario; the sentence is reference detail that
            belongs in the document it was quoted from.
          */}
          <ul
            className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="scenario-list"
          >
            <li>
              <ScenarioRow id="BASE" nameFa={BASE_WORLD_LABEL_FA} active={active === "BASE"} />
            </li>
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <ScenarioRow
                  id={scenario.id}
                  nameEn={scenario.name}
                  active={active === scenario.id}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One scenario, one line.
 *
 * `nameEn` is the RECORDED name of the (18 §7.2) scenario list, pinned 1:1 by
 * `scenarios.test.ts` against a committed copy — translating it would break that
 * guard and lose the link to the specification. It is marked as reference text
 * rather than passed off as interface language: `lang="en" dir="ltr"`, so a
 * screen reader pronounces it instead of reading English letters as Persian.
 */
function ScenarioRow({
  id,
  nameFa,
  nameEn,
  active,
}: {
  id: string;
  nameFa?: string;
  nameEn?: string;
  active: boolean;
}) {
  const href = id === "BASE" ? "/studio/settings" : `/studio/settings?scenario=${id}`;
  return (
    <a
      href={href}
      data-testid="scenario-option"
      data-scenario={id}
      aria-current={active ? "true" : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent ${
        active ? "bg-selected/15 font-medium" : ""
      }`}
    >
      <bdi lang="en" dir="ltr" className="shrink-0 font-mono text-xs text-muted-foreground">
        {id}
      </bdi>
      {nameFa === undefined ? null : <span className="truncate">{nameFa}</span>}
      {nameEn === undefined ? null : (
        <span className="truncate" lang="en" dir="ltr">
          {nameEn}
        </span>
      )}
    </a>
  );
}
