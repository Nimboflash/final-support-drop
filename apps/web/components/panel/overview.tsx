"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StageStrip,
  toPersianDigits,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import {
  attentionRows,
  overviewCounters,
  readinessFor,
  scheduledEntries,
  stageSegments,
  type AttentionKind,
} from "../../lib/demo/read-models";

/**
 * The overview (V2 02 §3) — and, since ADR-0019 D13 removed the standalone
 * requests queue, the work inbox that replaces it.
 *
 * Explicitly NOT here: KPI charts, an oversized welcome block, and any global
 * completion percentage. V2 02 §1 rules out "large decorative KPI charts,
 * oversized welcome blocks and financial-dashboard filler", and V2 02 §8 rules
 * out an invented percentage in favour of "3 of 4 required items approved".
 */
const ATTENTION_TONE: Record<AttentionKind, string> = {
  BLOCKED_REQUIRED: "border-destructive/50",
  AWAITING_REVIEW: "border-warning/50",
  MISSING_SCHEDULE: "border-border",
};

const ATTENTION_LABEL: Record<AttentionKind, string> = {
  BLOCKED_REQUIRED: "کار الزامی متوقف",
  AWAITING_REVIEW: "در انتظار بررسی",
  MISSING_SCHEDULE: "بدون تاریخ",
};

function fa(value: number): string {
  return toPersianDigits(String(value));
}

export function Overview({ world }: { world: PanelSnapshot }) {
  const counters = overviewCounters(world);
  const rows = attentionRows(world);
  const planned = scheduledEntries(world);

  if (world.projects.length === 0) {
    // V2 02 §3 — the empty state explains BOTH entry modes and offers the CTA.
    return (
      <div className="space-y-4">
        <OverviewHeader />
        <EmptyState
          title="هنوز مسیری شروع نشده"
          detail="می‌توانید بدون هیچ ورودی شروع کنید تا ماشین در چارچوب خودش کاوش کند، یا با یک رفرنس (فایل، نشانی یا متن) مسیر را هدایت کنید."
          action={<StartCta />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewHeader />

      <section aria-label="شمارنده‌ها" className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))]">
        <Counter label="پروژه‌های فعال" value={counters.activeProjects} />
        <Counter label="در انتظار بررسی" value={counters.pendingReviews} />
        <Counter label="موارد متوقف" value={counters.blockedItems} tone="danger" />
        <Counter label="بستهٔ آماده یا بدون تاریخ" value={counters.packagesReadyOrUnscheduled} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section aria-labelledby="attention-heading" className="space-y-3">
            <h2 id="attention-heading" className="text-lg font-semibold">
              نیازمند توجه شما
            </h2>
            {rows.length === 0 ? (
              <EmptyState title="چیزی در انتظار شما نیست" detail="همهٔ کارهای الزامی بررسی شده‌اند." />
            ) : (
              <ul className="space-y-2" data-testid="attention-list">
                {rows.map((row, index) => (
                  <li key={`${row.kind}-${row.projectId}-${String(index)}`}>
                    <div
                      data-kind={row.kind}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 ${ATTENTION_TONE[row.kind]}`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Icon-free label plus text: state never rides on colour alone. */}
                          <Badge variant="outline">{ATTENTION_LABEL[row.kind]}</Badge>
                          <span className="font-medium">{row.projectTitleFa}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{row.detailFa}</p>
                      </div>
                      {/* One next action per row (V2 02 §3). */}
                      <Button asChild size="sm" variant="outline">
                        <Link href={row.href}>{row.actionLabelFa}</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="projects-heading" className="space-y-3">
            <h2 id="projects-heading" className="text-lg font-semibold">
              پروژه‌های فعال
            </h2>
            <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
              {world.projects.map((project) => {
                const readiness = readinessFor(world, project);
                return (
                  <li key={project.id}>
                    <Card data-testid="project-card" className="h-full gap-4">
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/studio/projects/${project.id}/overview`}
                            className="underline-offset-4 hover:underline"
                          >
                            {project.titleFa}
                          </Link>
                          <Badge variant="secondary">
                            {project.type === "PROGRAM" ? "برنامه" : "لنز هفته"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <StageStrip states={stageSegments(world, project)} />
                        <p className="text-sm text-muted-foreground">
                          {readiness.requiredTotal === 0
                            ? "هنوز برنامهٔ خروجی تعیین نشده."
                            : `${fa(readiness.approved)} از ${fa(readiness.requiredTotal)} مورد الزامی تأیید شده`}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="planned-heading" className="space-y-3">
            <h2 id="planned-heading" className="text-lg font-semibold">
              دو هفتهٔ آینده
            </h2>
            {planned.length === 0 ? (
              <EmptyState title="موردی برنامه‌ریزی نشده" detail="پس از کامل‌شدن بسته، آیتم برنامه ساخته می‌شود." />
            ) : (
              <ul className="space-y-2" data-testid="planned-list">
                {planned.map((entry) => (
                  <li key={entry.id} className="rounded-md border bg-card p-3 text-sm">
                    <p className="font-medium">{entry.titleFa}</p>
                    <p className="text-muted-foreground">
                      {/* Never "published" because a date was chosen (V2 01 §7). */}
                      برنامه‌ریزی‌شده — <bdi dir="ltr">{entry.date}</bdi>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function OverviewHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">نمای کلی</h1>
      <StartCta />
    </div>
  );
}

function StartCta() {
  return (
    <Button asChild>
      <Link href="/studio/projects?start=1">شروع مسیر جدید</Link>
    </Button>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <Card data-testid="overview-counter" data-label={label} className="gap-2 py-4">
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-bold ${tone === "danger" && value > 0 ? "text-destructive" : ""}`}
        >
          {fa(value)}
        </p>
      </CardContent>
    </Card>
  );
}
