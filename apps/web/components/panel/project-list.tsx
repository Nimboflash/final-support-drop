"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { openReviewCount, readinessFor, stageSegments } from "../../lib/demo/read-models";

/**
 * The project list (V2 02 §4).
 *
 * Programs and Weekly Lenses share this surface with a type filter rather than
 * duplicating the navigation (V2 02 §2) — which is why `/studio/programs` and
 * `/studio/lenses` redirect here carrying `?type=`. Filter state lives in the
 * URL so a filtered list is linkable and survives a reload (ADR-0019 D13).
 */
const TYPE_FILTERS = [
  { value: "all", labelFa: "همه" },
  { value: "program", labelFa: "برنامه‌ها" },
  { value: "lens", labelFa: "لنزهای هفته" },
] as const;

export function ProjectList({ world }: { world: PanelSnapshot }) {
  const params = useSearchParams();
  const type = params.get("type") ?? "all";

  const shown = world.projects.filter((project) => {
    if (type === "program") return project.type === "PROGRAM";
    if (type === "lens") return project.type === "WEEKLY_LENS";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر نوع">
        {TYPE_FILTERS.map((option) => (
          <Button
            key={option.value}
            asChild
            size="sm"
            variant={type === option.value ? "default" : "outline"}
          >
            <Link
              href={option.value === "all" ? "/studio/projects" : `/studio/projects?type=${option.value}`}
              aria-current={type === option.value ? "true" : undefined}
            >
              {option.labelFa}
            </Link>
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="پروژه‌ای با این فیلتر نیست" detail="فیلتر دیگری را امتحان کنید." />
      ) : (
        <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]" data-testid="project-list">
          {shown.map((project) => {
            const readiness = readinessFor(world, project);
            const open = openReviewCount(world, project.id);
            return (
              <li key={project.id}>
                <Card className="h-full gap-3" data-testid="project-list-card">
                  <CardHeader>
                    <CardTitle className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {project.type === "PROGRAM" ? "برنامه" : "لنز هفته"}
                        </Badge>
                        {project.type === "WEEKLY_LENS" ? (
                          // Parent breadcrumb rather than a separate destination.
                          <Badge variant="outline">
                            والد: <bdi dir="ltr">{project.parentProgramId}</bdi>
                          </Badge>
                        ) : null}
                      </div>
                      <Link
                        href={`/studio/projects/${project.id}/overview`}
                        className="text-base font-semibold underline-offset-4 hover:underline"
                      >
                        {project.titleFa}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <StageStrip states={stageSegments(world, project)} />
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">در انتظار بررسی</dt>
                        <dd>{toPersianDigits(String(open))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">تاریخ برنامه</dt>
                        <dd>
                          {project.targetDate === null ? (
                            "تعیین‌نشده"
                          ) : (
                            <bdi dir="ltr">{project.targetDate}</bdi>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="text-sm text-muted-foreground">
                      {readiness.requiredTotal === 0
                        ? "برنامهٔ خروجی هنوز تعیین نشده."
                        : `${toPersianDigits(String(readiness.approved))} از ${toPersianDigits(String(readiness.requiredTotal))} مورد الزامی تأیید شده`}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
