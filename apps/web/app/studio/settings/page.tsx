"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@drop/ui";
import { ThemeControl } from "../../../components/panel/theme-control";
import { ProviderKeyCard } from "../../../components/panel/provider-key-card";
import { MachineSessionCard } from "../../../components/panel/machine-session-card";
import { SettingsRow, SettingsSection } from "../../../components/panel/settings-section";
import { useDemoSession } from "../../../lib/demo/providers";

/**
 * تنظیمات, in the reference's structure (V2 02 §2; the owner's Claude reference).
 *
 * A title, a sub-navigation down one side, and sections of rows on the
 * other. The page used to be a stack of cards, each with its own frame and
 * nothing between them to say which one you were in; the reference's grammar
 * — heading, sentence, rows divided by hairlines — reads as one document with
 * places in it, and the sub-nav is the table of contents.
 *
 * Two sections, because the panel has two kinds of setting: the ones about
 * this browser («عمومی») and the ones about the machine («ماشین»). The second
 * only means anything when there is a machine, and says so when there is not.
 *
 * "Settings should not expose API keys or pretend to connect live providers"
 * (V2 02 §2) still holds: the connection section states what is and is not
 * connected and never shows a key back.
 */
const SECTIONS = [
  { id: "general", label: "عمومی" },
  { id: "machine", label: "ماشین" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function Page() {
  const session = useDemoSession();
  const active = session.scenarioId;
  /** Whether this page is describing a live machine session rather than the demo world. */
  const live = session.mode === "REAL";

  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("section");
  const [section, setSection] = useState<SectionId>(requested === "machine" ? "machine" : "general");
  useEffect(() => {
    if (requested === "machine" || requested === "general") setSection(requested);
  }, [requested]);
  const choose = (next: SectionId) => {
    setSection(next);
    const query = new URLSearchParams(params.toString());
    if (next === "general") query.delete("section");
    else query.set("section", next);
    const text = query.toString();
    router.replace(text === "" ? pathname : `${pathname}?${text}`);
  };

  return (
    <div className="drop-surface mx-auto max-w-5xl space-y-6">
      <header className="drop-rule pb-4">
        <h1 className="text-3xl font-bold tracking-tight">تنظیمات</h1>
      </header>

      {/*
        A vertical tab list, not a second navigation landmark. The sections
        switch in place, which is what tabs mean — and a `<nav>` here made
        two landmarks on one page, so "the navigation" stopped naming the
        rail. The calendar's views use the same kit part.
      */}
      <Tabs
        value={section}
        onValueChange={(next) => choose(next as SectionId)}
        orientation="vertical"
        className="grid gap-8 lg:grid-cols-[10rem_minmax(0,1fr)]"
      >
        <TabsList
          data-testid="settings-nav"
          aria-label="بخش‌های تنظیمات"
          className="h-auto flex-row flex-wrap items-stretch justify-start gap-1 bg-transparent p-0 lg:flex-col"
        >
          {SECTIONS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              data-testid={`settings-nav-${item.id}`}
              className="justify-start rounded-md px-3 py-1.5 text-sm text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[state=active]:bg-selected/10 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0">
          <TabsContent value="general" className="space-y-10">
              <SettingsSection
                id="appearance"
                title="ظاهر"
                description="پنل روی تیره ساخته شده، اما روشن هم کار می‌کند."
              >
                <SettingsRow
                  label="حالت رنگ"
                  description="یکی را انتخاب کنید یا بگذارید از سیستم پیروی کند."
                >
                  <ThemeControl />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                id="saved-state"
                title="وضعیت ذخیره‌شده"
                description={
                  live
                    ? "این پنل دادهٔ زندهٔ ماشین را نشان می‌دهد، پس چیزی روی این دستگاه ذخیره نمی‌شود."
                    : "کارهایی که در پنل انجام می‌دهید روی همین دستگاه نگه داشته می‌شود تا با تازه‌کردن صفحه از دست نرود."
                }
              >
                {session.hydration === "UNUSABLE" ? (
                  <SettingsRow
                    label="وضعیت قبلی خوانده نشد"
                    description={
                      <p role="alert" data-testid="hydration-warning">
                        پنل از جهان تازه شروع کرد. پاک‌کردن، این هشدار را برمی‌دارد.
                      </p>
                    }
                  />
                ) : null}
                {live ? (
                  <SettingsRow
                    label="ذخیره روی این دستگاه"
                    description={
                      <span data-testid="reset-disabled-reason">
                        در حالت زنده هیچ وضعیتی روی این دستگاه نگه داشته نمی‌شود؛ تصمیم‌ها کنار جلسه روی ماشین ثبت می‌شوند.
                      </span>
                    }
                  />
                ) : (
                  <SettingsRow
                    label="جهان نمایشی"
                    description={
                      <span>
                        {/*
                          The demo world's own name, demo only. Live, this
                          printed «BASE» beside a shell badge saying the data
                          was the machine's.
                        */}
                        <Badge variant="outline" data-testid="active-scenario">
                          <bdi lang="en" dir="ltr">{active}</bdi>
                        </Badge>{" "}
                        پاک‌کردن، پنل را به حالت اول همین جهان برمی‌گرداند.
                      </span>
                    }
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="reset-demo"
                      onClick={() => {
                        session.persistence.reset();
                        window.location.reload();
                      }}
                    >
                      پاک‌کردن وضعیت ذخیره‌شده
                    </Button>
                  </SettingsRow>
                )}
              </SettingsSection>
          </TabsContent>
          <TabsContent value="machine" className="space-y-10">
              {/* The one thing on this page a person comes here to DO, first. */}
              <ProviderKeyCard />
              {live ? (
                <MachineSessionCard />
              ) : (
                <SettingsSection
                  id="session"
                  title="جلسهٔ ماشین"
                  description="پنل اکنون جهان نمایشی را نشان می‌دهد. با تنظیم نشانی ماشین روی سرور، جلسه‌های زنده اینجا فهرست می‌شوند."
                  testId="machine-session-off"
                >
                  <SettingsRow label="جلسهٔ فعلی" description="هیچ جلسهٔ زنده‌ای انتخاب نشده است." />
                </SettingsSection>
              )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
