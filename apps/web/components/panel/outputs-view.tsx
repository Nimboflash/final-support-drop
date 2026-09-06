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
  PackageStatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toPersianDigits,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { readinessFor, type ReadinessBlocker } from "../../lib/demo/read-models";
import { commandErrorFa, useDownloadPackage } from "../../lib/demo/commands";

/**
 * Outputs (V2 01 §6, 02 §8).
 *
 * Readiness reads «۳ از ۴ مورد الزامی تأیید شده» with each unresolved item
 * linked — NOT a percentage, and deliberately not the `Progress` primitive:
 * V2 02 §8 rules out "an invented global percentage", and a progress bar is
 * exactly that shape.
 */
const BLOCKER_LABEL: Record<ReadinessBlocker, string> = {
  AWAITING_REVIEW: "در انتظار بررسی",
  REVISION_REQUESTED: "درخواست بازنگری",
  REJECTED: "ردشده",
  BLOCKED: "متوقف — نبود مدرک",
  EDITORIAL_GATE_PENDING: "در انتظار ویرایش فارسی",
  STALE: "کهنه‌شده پس از تغییر کانسپت",
  MISSING: "ساخته نشده",
};

export function OutputsView({ world, projectId }: { world: PanelSnapshot; projectId?: string }) {
  const projects = projectId === undefined ? world.projects : world.projects.filter((p) => p.id === projectId);

  return (
    <Tabs defaultValue="contents" className="space-y-4">
      <TabsList>
        <TabsTrigger value="contents">محتواها</TabsTrigger>
        <TabsTrigger value="packages">نسخه‌های بسته</TabsTrigger>
      </TabsList>

      <TabsContent value="contents" className="space-y-4">
        {projects.map((project) => {
          const readiness = readinessFor(world, project);
          return (
            <Card key={project.id} className="gap-3" data-testid="readiness-card">
              <CardHeader>
                <CardTitle className="text-base">{project.titleFa}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p data-testid="readiness-summary" className="text-sm">
                  {readiness.requiredTotal === 0
                    ? "برنامهٔ خروجی هنوز تعیین نشده."
                    : `${toPersianDigits(String(readiness.approved))} از ${toPersianDigits(String(readiness.requiredTotal))} مورد الزامی تأیید شده`}
                </p>
                {readiness.unresolved.length === 0 ? null : (
                  <ul className="space-y-1 text-sm" data-testid="unresolved-list">
                    {readiness.unresolved.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{BLOCKER_LABEL[item.reason]}</Badge>
                        {/* Each unresolved item links to the card that resolves it. */}
                        <Link
                          href={`/studio/projects/${project.id}/content`}
                          className="underline-offset-4 hover:underline"
                        >
                          <bdi dir="ltr">{item.id}</bdi>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      <TabsContent value="packages" className="space-y-4">
        {world.packages.length === 0 ? (
          <EmptyState
            title="هنوز بسته‌ای ساخته نشده"
            detail="وقتی همهٔ محتواهای الزامی تأیید شوند، بسته به‌صورت خودکار ساخته می‌شود."
          />
        ) : (
          <ul className="space-y-3" data-testid="package-list">
            {world.packages.map((snapshot) => (
              <li key={snapshot.id}>
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <bdi dir="ltr">{snapshot.id}</bdi>
                      <PackageStatusBadge status={snapshot.status} />
                      <Badge variant="outline">نمونهٔ نمایشی</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {snapshot.status === "STALE" ? (
                      <p
                        data-testid="stale-package-warning"
                        className="rounded-md border border-warning bg-warning/10 p-2"
                      >
                        این یک عکس‌برداری تاریخی است، نه بستهٔ آمادهٔ جاری. محتوای بالادستی پس از
                        ساخت آن تغییر کرده است.
                      </p>
                    ) : null}
                    <dl className="grid gap-1 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">نسخه</dt>
                        <dd>{toPersianDigits(String(snapshot.version))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">ساخته‌شده در</dt>
                        <dd>
                          <bdi dir="ltr">{snapshot.createdAt}</bdi>
                        </dd>
                      </div>
                    </dl>
                    <details>
                      <summary className="cursor-pointer">فهرست محتوا (manifest)</summary>
                      <ul className="pt-2" data-testid="manifest-list">
                        {snapshot.files.map((file) => (
                          <li key={file.path}>
                            <bdi dir="ltr" className="font-mono text-xs">
                              {file.path}
                            </bdi>
                          </li>
                        ))}
                      </ul>
                    </details>
                    {/* V2 01 §6 — download requires an EXPLICIT click; nothing
                        downloads on render. */}
                    <DownloadButton packageVersionId={snapshot.id} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

/**
 * The download control (AC-P6.9).
 *
 * `exportPackage` returns `PackageExport { bytes, filename, mediaType }` because
 * the contract packages are transport-free (ADR-0019 D17); `apps/web` is the one
 * place a `Blob` is constructed. The archive contains real files matching its
 * synthesized manifest — never an empty placeholder behind a working-looking
 * button (V2 01 §6).
 */
function DownloadButton({ packageVersionId }: { packageVersionId: string }) {
  const download = useDownloadPackage();
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        data-testid="download-package"
        disabled={download.isPending}
        onClick={() => download.mutate(packageVersionId)}
      >
        {download.isPending ? "در حال آماده‌سازی…" : "بارگیری ZIP"}
      </Button>
      {download.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {commandErrorFa(download.error)}
        </p>
      ) : null}
      {download.isSuccess ? (
        <p className="text-xs text-muted-foreground" data-testid="download-done">
          بستهٔ نمایشی بارگیری شد: <bdi dir="ltr">{download.data}</bdi>
        </p>
      ) : null}
    </div>
  );
}
