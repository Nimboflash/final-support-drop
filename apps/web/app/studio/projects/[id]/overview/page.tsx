"use client";

import { use } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, toPersianDigits } from "@drop/ui";
import { QueryBoundary } from "../../../../../components/panel/states";
import { usePanelSnapshot } from "../../../../../lib/demo/queries";
import { readinessFor, openReviewCount } from "../../../../../lib/demo/read-models";

/** V2 02 §5 tab «خلاصه» — original input, scope, selected concepts, blocker, next step. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePanelSnapshot();
  return (
    <section aria-labelledby="tab-heading-overview" className="space-y-3">
      <h2 id="tab-heading-overview" className="text-lg font-semibold">خلاصه</h2>
      <QueryBoundary query={query}>
        {(world) => {
          const project = world.projects.find((p) => p.id === id);
          if (project === undefined) {
            return <EmptyState title="این پروژه پیدا نشد" detail="ممکن است سناریوی نمایشی عوض شده باشد." />;
          }
          const readiness = readinessFor(world, project);
          const open = openReviewCount(world, project.id);
          const nextStep =
            readiness.unresolved.find((u) => u.reason === "BLOCKED") !== undefined
              ? { labelFa: "بررسی وابستگی متوقف‌شده", href: `/studio/projects/${id}/content` }
              : open > 0
                ? { labelFa: "شروع بررسی", href: `/studio/projects/${id}/concepts` }
                : readiness.ready
                  ? { labelFa: "دیدن بستهٔ آماده", href: `/studio/projects/${id}/outputs` }
                  : { labelFa: "دیدن محتوا", href: `/studio/projects/${id}/content` };

          return (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="gap-3">
                <CardHeader><CardTitle className="text-base">ورودی اولیه</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {project.input.mode === "BLANK" ? (
                    <p>بدون ورودی — ماشین در چارچوب خودش کاوش می‌کند.</p>
                  ) : (
                    <ul className="space-y-1" data-testid="input-references">
                      {project.input.references.map((reference, index) => (
                        <li key={index} className="rounded border p-2">
                          <Badge variant="secondary" className="me-2">{reference.kind}</Badge>
                          <bdi dir="ltr" className="text-xs">
                            {reference.kind === "URL" ? reference.url : reference.kind === "FILE" ? reference.name : "متن چسبانده‌شده"}
                          </bdi>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">پردازش رفرنس شبیه‌سازی‌شده است؛ هیچ بارگذاری یا واکشی واقعی انجام نمی‌شود.</p>
                </CardContent>
              </Card>

              <Card className="gap-3">
                <CardHeader><CardTitle className="text-base">گام بعد</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {readiness.requiredTotal === 0
                      ? "برنامهٔ خروجی هنوز تعیین نشده."
                      : `${toPersianDigits(String(readiness.approved))} از ${toPersianDigits(String(readiness.requiredTotal))} مورد الزامی تأیید شده`}
                  </p>
                  <Button asChild size="sm"><Link href={nextStep.href}>{nextStep.labelFa}</Link></Button>
                </CardContent>
              </Card>

              <Card className="gap-3 md:col-span-2">
                <CardHeader><CardTitle className="text-base">کانسپت‌های انتخاب‌شده</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  {project.selectedConceptVersionIds.length === 0 ? (
                    <p className="text-muted-foreground">هنوز کانسپتی برای ادامه انتخاب نشده.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2" data-testid="selected-concepts">
                      {project.selectedConceptVersionIds.map((versionId) => (
                        <li key={versionId}><Badge variant="outline"><bdi dir="ltr">{versionId}</bdi></Badge></li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </section>
  );
}
