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
  ContentText,
  EmptyState,
  formatPersianDateTime,
  toPersianDigits,
  useIsMobile,
} from "@drop/ui";
import {
  GraphCanvas,
  NODE_STATE_LABEL_FA,
  StageList,
  buildProductGraph,
  type ProductNode,
} from "@drop/workflow-ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import { ProjectSelector, UnknownProjectState, useSelectedProject, ALL_PROJECTS } from "./project-selector";
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
 *
 * The state names come from `@drop/workflow-ui`, which is also what the canvas
 * nodes read. This page once declared its own copy, and the two disagreed: the
 * canvas said «در انتظار بررسی» while the list beside it said «منتظر اقدام شما»
 * for the same node. One mapping, one name (ADR-0020 D7).
 */

export function EnginePage({ world }: { world: PanelSnapshot }) {
  const session = useDemoSession();
  const isMobile = useIsMobile();
  const selectedProject = useSelectedProject();
  const [selected, setSelected] = useState<ProductNode | null>(null);

  // A graph can only ever be ONE project's, so "all projects" is not a state
  // this surface has. Falling back to the first one is fine; doing it while the
  // selector still read «همه پروژه‌ها» was not — the page described a project it
  // never named. The selector below resolves the same fallback and shows it.
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
        {/*
          Two different absences. A filter naming a project the world does not
          hold is a bad address, and says so like every other surface; a world
          with no project at all is the honest empty state.
        */}
        {selectedProject !== ALL_PROJECTS && world.projects.length > 0 ? (
          <UnknownProjectState />
        ) : (
          <EmptyState
            title="جریانی برای نمایش نیست"
            detail="هنوز پروژه‌ای برای نمایش جریان اجرا وجود ندارد."
          />
        )}
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
            {/*
              The waiting count carries the acid signal (ADR-0022); the rest
              stay neutral. This strip is the first thing read on the surface,
              and "how many are waiting for me" is the only number on it that
              asks for anything. The label is still the word, not the colour.
            */}
            <Badge
              variant="outline"
              className={
                state === "AWAITING_REVIEW"
                  ? "bg-attention text-attention-foreground border-attention font-medium"
                  : undefined
              }
            >
              {NODE_STATE_LABEL_FA[state as keyof typeof NODE_STATE_LABEL_FA] ?? state} — {toPersianDigits(String(count))}
            </Badge>
          </li>
        ))}
      </ul>

      <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}>
        <GraphCanvas graph={graph} onSelect={setSelected} />
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">مرحله‌ها</h2>
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
    <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Engine</h1>
        {lastSyncedAt === undefined ? null : (
          <p className="text-xs text-muted-foreground">
            {/*
              Formatted in Asia/Tehran, not sliced out of the UTC instant.
              Slicing showed a time three and a half hours from the truth on
              the one surface whose whole job is saying where things stand.
            */}
            آخرین به‌روزرسانی: {formatPersianDateTime(lastSyncedAt).time}
          </p>
        )}
      </div>
      <ProjectSelector world={world} allowAll={false} />
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
          <ContentText>{node.labelFa}</ContentText>
          <Badge variant="secondary">{NODE_STATE_LABEL_FA[node.state]}</Badge>
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
            <ContentText>{node.reasonFa}</ContentText>
          </p>
        )}

        {node.state === "AWAITING_REVIEW" || node.state === "BLOCKED" ? (
          <Button asChild size="sm" data-testid="engine-node-link">
            <Link href={destination.href}><ContentText>{destination.labelFa}</ContentText></Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
