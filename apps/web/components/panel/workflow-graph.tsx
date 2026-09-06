"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toPersianDigits,
} from "@drop/ui";
import {
  GraphCanvas,
  NODE_CLASS_LABEL_FA,
  NODE_STATE_LABEL_FA,
  StageList,
  buildProductGraph,
  type ProductNode,
} from "@drop/workflow-ui";
import type { PanelSnapshot } from "@drop/panel-domain";

/**
 * The workflow tab (V2 02 §9; ADR-0019 D18).
 *
 * EXECUTION INSPECTION IS THE DEFAULT. Definition inspection is the secondary
 * mode; template authoring is deferred and there is no edit, publish or
 * node-library affordance in either.
 *
 * The canvas and the accessible stage list render from ONE `ProductGraph`, so
 * the graph is never the only way to act — and the list cannot fall out of step
 * with the canvas, because there is no second derivation for it to drift from.
 */
export function WorkflowGraph({
  world,
  projectId,
}: {
  world: PanelSnapshot;
  projectId: string;
}) {
  const project = world.projects.find((p) => p.id === projectId);
  const graph = useMemo(
    () => (project === undefined ? null : buildProductGraph(world, project)),
    [world, project],
  );
  const [selected, setSelected] = useState<ProductNode | null>(null);

  if (project === undefined || graph === null) {
    return <EmptyState title="این پروژه پیدا نشد" detail="ممکن است سناریوی نمایشی عوض شده باشد." />;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="execution" className="space-y-3">
        <TabsList>
          {/* Execution first and selected by default (AC-P5.1). */}
          <TabsTrigger value="execution">بازرسی اجرا</TabsTrigger>
          <TabsTrigger value="definition">بازرسی تعریف</TabsTrigger>
        </TabsList>

        <TabsContent value="execution" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <GraphCanvas graph={graph} onSelect={setSelected} />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">فهرست مرحله‌ها</h3>
              <p className="text-xs text-muted-foreground">
                این فهرست معادل دسترس‌پذیر نمودار است؛ همان گره‌ها، همان وضعیت‌ها، و کاملاً با
                صفحه‌کلید قابل استفاده.
              </p>
              <StageList
                graph={graph}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="definition">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-base">تعریف گردش کار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                بازرسی تعریف، الگوی عرضه‌شده را نشان می‌دهد. ویرایش الگو در این نسخه انجام
                نمی‌شود و هیچ گره‌ای قابل افزودن، حذف یا انتشار نیست.
              </p>
              <p className="text-muted-foreground">
                این نسخهٔ نمایشی هنوز تعریف گردش کاری از ماشین دریافت نکرده است؛ پس از اتصال
                آداپتور، نسخهٔ منتشرشده اینجا دیده می‌شود.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selected === null ? null : <NodeInspector node={selected} projectId={projectId} />}
    </div>
  );
}

/**
 * The inspector (AC-P5.9, AC-P5.11).
 *
 * The machine row appears ONLY when the definition supplies a machine number —
 * never inferred from the node's position in the graph (ADR-0019 D18). Review
 * shortcuts render disabled with a Persian reason naming P6; they are not
 * hidden, and nothing here can reach a gateway.
 */
function NodeInspector({ node, projectId }: { node: ProductNode; projectId: string }) {
  const isReviewNode = node.nodeClass === "CONCEPT_REVIEW" || node.nodeClass === "CONTENT_REVIEW";
  return (
    <Card data-testid="node-inspector" className="gap-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {node.labelFa}
          <Badge variant="outline">{NODE_CLASS_LABEL_FA[node.nodeClass]}</Badge>
          <Badge variant="secondary">{NODE_STATE_LABEL_FA[node.state]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">تلاش‌ها</dt>
            <dd>{toPersianDigits(String(node.attempts))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">خروجی‌ها</dt>
            <dd>{toPersianDigits(String(node.outputCount))}</dd>
          </div>
          {/* Absent when the definition supplies no machine number. */}
          {node.machineNumber === null ? null : (
            <div data-testid="machine-row">
              <dt className="text-muted-foreground">ماشین</dt>
              <dd>
                <bdi dir="ltr">{node.machineNumber}</bdi>
              </dd>
            </div>
          )}
        </dl>

        {node.reasonFa === null ? null : (
          <p data-testid="node-reason" className="rounded-md border border-warning bg-warning/10 p-2">
            {node.reasonFa}
          </p>
        )}

        {isReviewNode ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled data-testid="graph-approve-shortcut">
                تأیید
              </Button>
              <Button size="sm" variant="outline" disabled data-testid="graph-revise-shortcut">
                درخواست اصلاح
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              میان‌برهای بررسی در تیکت P6 به همان مسیر تأیید کارت و صف بررسی وصل می‌شوند؛ اینجا
              فقط نمایش داده می‌شوند.
            </p>
          </div>
        ) : null}

        {node.subject === null ? null : (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={
                node.subject.kind === "CONTENT"
                  ? `/studio/projects/${projectId}/content`
                  : node.subject.kind === "CONCEPT"
                    ? `/studio/projects/${projectId}/concepts`
                    : node.subject.kind === "CALENDAR"
                      ? "/studio/calendar"
                      : `/studio/projects/${projectId}/outputs`
              }
            >
              رفتن به کارت
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
