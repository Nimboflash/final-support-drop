"use client";

import { Check, CircleDashed, Loader } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * The compact five-stage indicator above the project tabs (V2 02 §5).
 *
 * This is a DISPLAY GROUPING, not a stored field (ADR-0019 D12). `PanelProject.stage`
 * enumerates draft, concepts, research_content, package and calendar — it has no
 * `review` member — while the strip shows Concepts, Research/Content, **Review**,
 * Package, Calendar. The Review segment is derived from open review counts, so do
 * not "fix" the mismatch by adding a stored review stage.
 *
 * Purely presentational: it takes plain props and reaches for no gateway.
 */
export const PROJECT_STAGE_SEGMENTS = [
  { key: "concepts", label: "کانسپت‌ها" },
  { key: "research_content", label: "تحقیق و محتوا" },
  { key: "review", label: "بررسی" },
  { key: "package", label: "بسته" },
  { key: "calendar", label: "تقویم" },
] as const;

export type ProjectStageSegmentKey = (typeof PROJECT_STAGE_SEGMENTS)[number]["key"];
export type SegmentState = "done" | "current" | "upcoming";

export function StageStrip({
  states,
  className,
}: {
  /** One state per segment key; a missing key reads as "upcoming". */
  states: Partial<Record<ProjectStageSegmentKey, SegmentState>>;
  className?: string;
}) {
  return (
    <ol
      data-testid="stage-strip"
      aria-label="مرحلهٔ پروژه"
      className={cn("flex flex-wrap items-center gap-x-1 gap-y-2 text-xs", className)}
    >
      {PROJECT_STAGE_SEGMENTS.map((segment, index) => {
        const state = states[segment.key] ?? "upcoming";
        const Icon = state === "done" ? Check : state === "current" ? Loader : CircleDashed;
        return (
          <li key={segment.key} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="mx-1 h-px w-4 bg-border" />
            ) : null}
            <span
              data-segment={segment.key}
              data-state={state}
              // Icon plus label: state is never carried by color alone (ADR-0010 D11).
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-1",
                state === "done" && "border-success/40 text-foreground",
                state === "current" && "border-selected bg-selected/10 font-medium text-foreground",
                state === "upcoming" && "border-border text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{segment.label}</span>
              <span className="sr-only">
                {state === "done" ? "کامل" : state === "current" ? "مرحلهٔ جاری" : "هنوز شروع نشده"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
