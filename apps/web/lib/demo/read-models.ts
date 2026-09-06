import type {
  Concept,
  ContentItem,
  PanelCalendarEntry,
  PanelProject,
  PanelSnapshot,
} from "@drop/panel-domain";

/**
 * Application read models (V2 03 §7).
 *
 * "Application read models can calculate UI readiness from supplied mock
 * statuses; this is not implementing external machine intelligence." Everything
 * here is arithmetic over statuses the gateway supplied — no inference, no
 * judgement, and nothing that claims a machine did something it did not.
 *
 * These live outside components on purpose: the same numbers appear on the
 * overview counters, the project card, the outputs checklist and the review
 * queue, and journey A14 requires them to agree.
 */

/** V2 01 §6 — readiness is counted against the FROZEN plan's required ids. */
export interface Readiness {
  readonly requiredTotal: number;
  readonly approved: number;
  /** Items that still need a decision, with why, for the "links to unresolved" list. */
  readonly unresolved: readonly { readonly id: string; readonly reason: ReadinessBlocker }[];
  readonly ready: boolean;
}

export type ReadinessBlocker =
  | "AWAITING_REVIEW"
  | "REVISION_REQUESTED"
  | "REJECTED"
  | "BLOCKED"
  | "EDITORIAL_GATE_PENDING"
  | "STALE"
  | "MISSING";

export function readinessFor(world: PanelSnapshot, project: PanelProject): Readiness {
  const required = project.outputPlan.requiredContentIds;
  const unresolved: { id: string; reason: ReadinessBlocker }[] = [];

  for (const id of required) {
    const item = world.content.find((c) => c.id === id);
    if (item === undefined) {
      unresolved.push({ id, reason: "MISSING" });
      continue;
    }
    // Order matters: a blocked item is blocked whatever its review status, and
    // 00 §4 fail-closed means a blocker outranks an approval.
    if (item.generationState === "BLOCKED") unresolved.push({ id, reason: "BLOCKED" });
    else if (item.reviewStatus === "REJECTED") unresolved.push({ id, reason: "REJECTED" });
    else if (item.reviewStatus === "REVISION_REQUESTED")
      unresolved.push({ id, reason: "REVISION_REQUESTED" });
    else if (item.reviewStatus !== "APPROVED") unresolved.push({ id, reason: "AWAITING_REVIEW" });
    // V2 01 §6 — an approved version only counts if it is FRESH and its gates passed.
    else if (item.freshness === "STALE") unresolved.push({ id, reason: "STALE" });
    else if (item.editorialStatus === "PENDING")
      unresolved.push({ id, reason: "EDITORIAL_GATE_PENDING" });
  }

  return {
    requiredTotal: required.length,
    approved: required.length - unresolved.length,
    unresolved,
    // A plan with no required items is not "ready" — it has nothing to package.
    ready: required.length > 0 && unresolved.length === 0,
  };
}

/**
 * The stage-strip states (ADR-0019 D12). The Review segment is DERIVED from open
 * review counts; `PanelProject.stage` has no `review` member and must not gain
 * one to make this easier.
 */
export type SegmentState = "done" | "current" | "upcoming";

export function stageSegments(
  world: PanelSnapshot,
  project: PanelProject,
): Record<"concepts" | "research_content" | "review" | "package" | "calendar", SegmentState> {
  const order = ["DRAFT", "CONCEPTS", "RESEARCH_CONTENT", "PACKAGE", "CALENDAR"] as const;
  const at = order.indexOf(project.stage);
  const openReviews = openReviewCount(world, project.id);

  const positional = (index: number): SegmentState =>
    at > index ? "done" : at === index ? "current" : "upcoming";

  return {
    concepts: positional(1),
    research_content: positional(2),
    // Derived, not positional: review is "current" whenever anything is waiting.
    review: openReviews > 0 ? "current" : at > 2 ? "done" : "upcoming",
    package: positional(3),
    calendar: positional(4),
  };
}

export function openReviewCount(world: PanelSnapshot, projectId: string): number {
  const concepts = world.concepts.filter(
    (c) => c.projectId === projectId && c.reviewStatus === "IN_REVIEW",
  ).length;
  const content = world.content.filter(
    (c) => c.projectId === projectId && c.reviewStatus === "IN_REVIEW",
  ).length;
  return concepts + content;
}

export function blockedCount(world: PanelSnapshot, projectId?: string): number {
  return world.content.filter(
    (c) => (projectId === undefined || c.projectId === projectId) && c.generationState === "BLOCKED",
  ).length;
}

/** V2 02 §3 — the four overview counters. */
export interface OverviewCounters {
  readonly activeProjects: number;
  readonly pendingReviews: number;
  readonly blockedItems: number;
  readonly packagesReadyOrUnscheduled: number;
}

export function overviewCounters(world: PanelSnapshot): OverviewCounters {
  const unscheduled = world.calendar.filter((entry) => entry.date === null).length;
  const readyWithoutEntry = world.projects.filter((project) => {
    if (!readinessFor(world, project).ready) return false;
    return !world.calendar.some((entry) => entry.projectId === project.id);
  }).length;

  return {
    activeProjects: world.projects.filter((p) => p.stage !== "DRAFT").length,
    pendingReviews: world.projects.reduce((sum, p) => sum + openReviewCount(world, p.id), 0),
    blockedItems: blockedCount(world),
    packagesReadyOrUnscheduled: unscheduled + readyWithoutEntry,
  };
}

/**
 * V2 02 §3 — "Needs your attention", ordered by blocked required work, then
 * review, then missing schedule. The order is the product decision; encoding it
 * once here is what keeps every surface agreeing about what is most urgent.
 */
export type AttentionKind = "BLOCKED_REQUIRED" | "AWAITING_REVIEW" | "MISSING_SCHEDULE";

export interface AttentionRow {
  readonly kind: AttentionKind;
  readonly projectId: string;
  readonly projectTitleFa: string;
  readonly detailFa: string;
  readonly href: string;
  readonly actionLabelFa: string;
}

const ATTENTION_ORDER: readonly AttentionKind[] = [
  "BLOCKED_REQUIRED",
  "AWAITING_REVIEW",
  "MISSING_SCHEDULE",
];

export function attentionRows(world: PanelSnapshot): readonly AttentionRow[] {
  const rows: AttentionRow[] = [];

  for (const project of world.projects) {
    const readiness = readinessFor(world, project);

    const blocked = readiness.unresolved.filter((u) => u.reason === "BLOCKED");
    if (blocked.length > 0) {
      rows.push({
        kind: "BLOCKED_REQUIRED",
        projectId: project.id,
        projectTitleFa: project.titleFa,
        detailFa: `${String(blocked.length)} مورد الزامی به دلیل نبود مدرک متوقف شده است.`,
        href: `/studio/projects/${project.id}/content`,
        actionLabelFa: "بررسی وابستگی",
      });
    }

    const open = openReviewCount(world, project.id);
    if (open > 0) {
      rows.push({
        kind: "AWAITING_REVIEW",
        projectId: project.id,
        projectTitleFa: project.titleFa,
        detailFa: `${String(open)} مورد در انتظار بررسی شماست.`,
        href: `/studio/projects/${project.id}/concepts`,
        actionLabelFa: "شروع بررسی",
      });
    }

    const unscheduled = world.calendar.some(
      (entry) => entry.projectId === project.id && entry.date === null,
    );
    if (unscheduled) {
      rows.push({
        kind: "MISSING_SCHEDULE",
        projectId: project.id,
        projectTitleFa: project.titleFa,
        detailFa: "بسته آماده است اما تاریخی برایش تعیین نشده.",
        href: "/studio/calendar",
        actionLabelFa: "تعیین تاریخ",
      });
    }
  }

  return rows.sort(
    (a, b) => ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind),
  );
}

export function conceptsFor(world: PanelSnapshot, projectId: string): readonly Concept[] {
  return world.concepts.filter((c) => c.projectId === projectId);
}

export function contentFor(world: PanelSnapshot, projectId: string): readonly ContentItem[] {
  return world.content.filter((c) => c.projectId === projectId);
}

/** V2 01 §7 — the unscheduled tray is PLANNED with a null date (ADR-0019 D7). */
export function unscheduledEntries(world: PanelSnapshot): readonly PanelCalendarEntry[] {
  return world.calendar.filter((entry) => entry.date === null);
}

export function scheduledEntries(world: PanelSnapshot): readonly PanelCalendarEntry[] {
  return world.calendar.filter((entry) => entry.date !== null);
}
