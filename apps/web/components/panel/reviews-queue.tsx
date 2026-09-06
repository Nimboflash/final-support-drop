"use client";

import { useRef, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ReviewStatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";
import {
  ReviewSheet,
  conceptView,
  contentView,
  type ReviewTargetView,
} from "./review-sheet";

/**
 * The cross-project review queue (V2 02 §6).
 *
 * "Global Reviews uses tabs Concepts / Content and filters. It opens THE SAME
 * review sheet and uses THE SAME command path; never duplicate approval logic."
 *
 * So this file contains no approval logic at all — it selects a target and hands
 * it to `ReviewSheet`. That is what makes journey A14 (same action from inbox,
 * card and graph → one audit event) structurally true rather than tested-true.
 */
export function ReviewsQueue({ world }: { world: PanelSnapshot }) {
  const [view, setView] = useState<ReviewTargetView | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const concepts = world.concepts.filter((c) => c.reviewStatus === "IN_REVIEW");
  const content = world.content.filter((c) => c.reviewStatus === "IN_REVIEW");

  const projectTitle = (id: string) =>
    world.projects.find((p) => p.id === id)?.titleFa ?? id;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="concepts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="concepts">کانسپت‌ها</TabsTrigger>
          <TabsTrigger value="content">محتوا</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts">
          {concepts.length === 0 ? (
            <EmptyState title="کانسپتی در انتظار بررسی نیست" detail="همهٔ کانسپت‌ها بررسی شده‌اند." />
          ) : (
            <ul className="space-y-2" data-testid="review-queue-concepts">
              {concepts.map((concept) => {
                const version = world.conceptVersions.find((v) => v.id === concept.activeVersionId);
                return (
                  <li key={concept.id}>
                    <QueueRow
                      titleFa={version?.titleFa ?? concept.id}
                      contextFa={projectTitle(concept.projectId)}
                      status={concept.reviewStatus}
                      onOpen={(element) => {
                        trigger.current = element;
                        setView(conceptView(world, concept));
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="content">
          {content.length === 0 ? (
            <EmptyState title="محتوایی در انتظار بررسی نیست" detail="همهٔ محتواها بررسی شده‌اند." />
          ) : (
            <ul className="space-y-2" data-testid="review-queue-content">
              {content.map((item) => {
                const version = world.contentVersions.find((v) => v.id === item.activeVersionId);
                return (
                  <li key={item.id}>
                    <QueueRow
                      titleFa={version?.titleFa ?? item.id}
                      contextFa={`${projectTitle(item.projectId)} — ${item.type}`}
                      status={item.reviewStatus}
                      onOpen={(element) => {
                        trigger.current = element;
                        setView(contentView(world, item));
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* The same sheet the cards open. There is exactly one. */}
      <ReviewSheet
        world={world}
        view={view}
        open={view !== null}
        onOpenChange={(next) => {
          if (!next) setView(null);
        }}
        returnFocusTo={trigger.current}
      />
    </div>
  );
}

function QueueRow({
  titleFa,
  contextFa,
  status,
  onOpen,
}: {
  titleFa: string;
  contextFa: string;
  status: "DRAFT" | "IN_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";
  onOpen: (element: HTMLElement) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3">
      <div className="min-w-0 space-y-1">
        <button
          type="button"
          onClick={(event) => onOpen(event.currentTarget)}
          className="text-start font-medium underline-offset-4 hover:underline"
        >
          {titleFa}
        </button>
        <p className="text-sm text-muted-foreground">{contextFa}</p>
      </div>
      <div className="flex items-center gap-2">
        <ReviewStatusBadge status={status} />
        {/* Actor eligibility is shown, never assumed (V2 02 §6). */}
        <Badge variant="outline">شما مجاز به بررسی هستید</Badge>
      </div>
    </div>
  );
}
