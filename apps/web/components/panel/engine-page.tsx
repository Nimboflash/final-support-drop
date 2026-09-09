"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import { GraphCanvas, StageList, buildProductGraph, type ProductNode } from "@drop/workflow-ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, useSelectedProject, ALL_PROJECTS } from "./project-selector";
import { useDemoSession } from "../../lib/demo/providers";

/**
 * Engine — the one home for execution detail (ADR-0020 D4).
 *
 * Its existence is what made the simplification safe: the concept, content and
 * output pages could shed process furniture because that information was
 * relocated here rather than deleted.
 *
 * Read-first by decision. No destructive operations, no forced skip, no manual
 * state editing — a node that needs a person links to the page where the work
 * actually happens, and the work happens there.
 */
const NODE_STATE_LABEL_FA: Record<string, string> = {
  PENDING: "هنوز شروع نشده",
  RUNNING: "در حال اجرا",
  AWAITING_REVIEW: "منتظر اقدام شما",
  DONE: "کامل",
  BLOCKED: "متوقف",
  REJECTED: "کنار گذاشته‌شده",
};

export function EnginePage({ world }: { world: PanelSnapshot }) {
  const session = useDemoSession();
  const isMobile = useIsMobile();
  const selectedProject = useSelectedProject();
  const [selected, setSelected] = useState<ProductNode | null>(null);

  const project =
    selectedProject === ALL_PROJECTS
      ? world.projects[0]
      : world.projects.find((p) => p.id === selectedProject);

  const graph = useMemo(
    () => (project === undefined ? null : buildProductGraph(world, project)),
    [world, project],
  );

  if (project === undefined || graph === null) {
    return (
      <div className="space-y-5">
        <EngineHeader world={world} />
        <EmptyState
          title="جریانی برای نمایش نیست"
          detail="یک پروژه را انتخاب کنید تا جریان اجرای آن را ببینید."
        />
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="space-y-5">
        <EngineHeader world={world} />
        <EmptyState
          title="هنوز جریانی شروع نشده"
          detail="هنوز جریانی برای این پروژه شروع نشده است."
        />
      </div>
    );
  }

  const counts = graph.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.state] = (acc[node.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <EngineHeader world={world} lastSyncedAt={session.clock.now()} />

      {/* Legend: status is stated in words, never carried by colour alone. */}
      <ul className="flex flex-wrap gap-2 text-xs" data-testid="engine-legend">
        {Object.entries(counts).map(([state, count]) => (
          <li key={state}>
            <Badge variant="outline">
              {NODE_STATE_LABEL_FA[state] ?? state} — {toPersianDigits(String(count))}
            </Badge>
          </li>
        ))}
      </ul>

      <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}>
        <GraphCanvas graph={graph} onSelect={setSelected} />
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">مرحله‌ها</h2>
          <p className="text-xs text-muted-foreground">
            این فهرست معادل دسترس‌پذیر نمودار است و با صفحه‌کلید کار می‌کند.
          </p>
          <StageList graph={graph} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>
      </div>

      {selected === null ? null : (
        <NodeDetails node={selected} projectId={project.id} />
      )}
    </div>
  );
}

function EngineHeader({
  world,
  lastSyncedAt,
}: {
  world: PanelSnapshot;
  lastSyncedAt?: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Engine</h1>
        {lastSyncedAt === undefined ? null : (
          <p className="text-xs text-muted-foreground">
            آخرین به‌روزرسانی: {toPersianDigits(lastSyncedAt.slice(11, 16))}
          </p>
        )}
      </div>
      <ProjectSelector world={world} />
    </header>
  );
}

/**
 * The node panel: what this step is, where it stands, and — when it is waiting
 * on a person — the link to the page where they can act (ADR-0020 D4).
 *
 * No raw identifier, no payload, no internal state name.
 */
function NodeDetails({ node, projectId }: { node: ProductNode; projectId: string }) {
  const destination =
    node.subject?.kind === "CONCEPT"
      ? { href: `/studio/concepts?project=${projectId}`, labelFa: "رفتن به کانسپت‌ها" }
      : node.subject?.kind === "CONTENT"
        ? { href: `/studio/content?project=${projectId}`, labelFa: "رفتن به محتوا" }
        : node.subject?.kind === "CALENDAR"
          ? { href: `/studio/calendar?project=${projectId}`, labelFa: "رفتن به تقویم" }
          : { href: `/studio/outputs?project=${projectId}`, labelFa: "رفتن به خروجی‌ها" };

  return (
    <Card data-testid="engine-node-details" className="gap-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {node.labelFa}
          <Badge variant="secondary">{NODE_STATE_LABEL_FA[node.state] ?? node.state}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">دفعات اجرا</dt>
            <dd>{toPersianDigits(String(node.attempts))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">نتیجه‌ها</dt>
            <dd>{toPersianDigits(String(node.outputCount))}</dd>
          </div>
        </dl>

        {node.reasonFa === null ? null : (
          <p data-testid="engine-node-reason" className="rounded-md border border-warning bg-warning/10 p-2">
            {node.reasonFa}
          </p>
        )}

        {node.state === "AWAITING_REVIEW" || node.state === "BLOCKED" ? (
          <Button asChild size="sm" data-testid="engine-node-link">
            <a href={destination.href}>{destination.labelFa}</a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
