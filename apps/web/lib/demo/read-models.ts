import { toPersianDigits } from "@drop/ui";
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

export function openReviewCount(world: PanelSnapshot, projectId: string): number {
  const concepts = world.concepts.filter(
    (c) => c.projectId === projectId && c.reviewStatus === "IN_REVIEW",
  ).length;
  const content = world.content.filter(
    (c) => c.projectId === projectId && c.reviewStatus === "IN_REVIEW",
  ).length;
  return concepts + content;
}

/**
 * V2 02 §3 — "Needs your attention", ordered by blocked required work, then
 * review, then missing schedule. The order is the product decision; encoding it
 * once here is what keeps every surface agreeing about what is most urgent.
 */
export type AttentionKind =
  | "BLOCKED_REQUIRED"
  | "AWAITING_REVIEW"
  /** An output whose content is all approved and which is waiting to be sent. */
  | "OUTPUT_READY"
  | "MISSING_SCHEDULE";

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
  "OUTPUT_READY",
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
        // "بررسی وابستگی" is named as technical in the brief (§10); this says
        // what is needed and offers the action that supplies it.
        detailFa:
          blocked.length === 1
            ? "یک محتوا منتظر منبع است."
            : `${toPersianDigits(String(blocked.length))} محتوا منتظر منبع‌اند.`,
        href: `/studio/content?project=${project.id}`,
        actionLabelFa: "افزودن منبع",
      });
    }

    const openConcepts = world.concepts.filter(
      (c) => c.projectId === project.id && c.reviewStatus === "IN_REVIEW",
    ).length;
    const openContent = world.content.filter(
      (c) => c.projectId === project.id && c.reviewStatus === "IN_REVIEW",
    ).length;
    const open = openConcepts + openContent;
    if (open > 0) {
      // The row has to land where the work IS. It used to always link to
      // concepts, so a project whose pending work was content sent the person
      // to a page with nothing on it to review.
      const toConcepts = openConcepts > 0;
      rows.push({
        kind: "AWAITING_REVIEW",
        projectId: project.id,
        projectTitleFa: project.titleFa,
        detailFa:
          open === 1
            ? toConcepts
              ? "یک کانسپت به تأیید شما نیاز دارد."
              : "یک محتوا به تأیید شما نیاز دارد."
            : `${toPersianDigits(String(open))} مورد به تأیید شما نیاز دارند.`,
        href: toConcepts
          ? `/studio/concepts?project=${project.id}`
          : `/studio/content?project=${project.id}`,
        actionLabelFa: toConcepts ? "بررسی کانسپت‌ها" : "بررسی محتوا",
      });
    }

    /*
      The brief's own primary action — approve the output and send it on — was
      invisible on the one surface whose job is "what needs me now". A project
      literally named «خروجی آماده بدون تاریخ» reported that nothing was
      waiting.
    */
    // `readiness` above is the same computation; reuse it.
    const hasEntry = world.calendar.some((entry) => entry.projectId === project.id);
    if (readiness.ready && !hasEntry) {
      rows.push({
        kind: "OUTPUT_READY",
        projectId: project.id,
        projectTitleFa: project.titleFa,
        detailFa: "خروجی این پروژه آماده است و هنوز فرستاده نشده.",
        href: `/studio/outputs?project=${project.id}`,
        actionLabelFa: "دیدن خروجی",
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
        // "بسته" leaves the interface entirely (ADR-0020 D5).
        detailFa: "خروجی آماده است اما تاریخی برایش تعیین نشده.",
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

/**
 * Where a project stands in the journey (ADR-0023).
 *
 * The five recorded product stages, derived from FACTS rather than from a
 * stored status — the panel has no `stage` column and inventing one would be a
 * state the V2 pack never defines. Read the other way round: the furthest thing
 * that exists is the stage the work has reached.
 *
 * Deliberately the same five as `PRODUCT_STAGES` in `@drop/panel-domain`, and
 * deliberately not re-exported from there: that enum belongs to the machine
 * contract, this is a read model over a snapshot, and collapsing the two would
 * make a UI grouping look like part of the contract.
 */
export const PROJECT_STAGES = [
  "DRAFT",
  "CONCEPTS",
  "RESEARCH_CONTENT",
  "PACKAGE",
  "CALENDAR",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export function projectStage(world: PanelSnapshot, project: PanelProject): ProjectStage {
  // A DATED entry only: an output sitting in the unscheduled tray has not
  // reached the calendar, and saying it had would be the panel's own lie.
  if (world.calendar.some((e) => e.projectId === project.id && e.date !== null)) return "CALENDAR";
  if (world.packages.some((pkg) => pkg.projectId === project.id)) return "PACKAGE";
  if (contentFor(world, project.id).length > 0) return "RESEARCH_CONTENT";
  if (conceptsFor(world, project.id).length > 0) return "CONCEPTS";
  return "DRAFT";
}

/** The attention rows belonging to one project — what it needs from a person. */
export function attentionFor(
  world: PanelSnapshot,
  projectId: string,
): readonly AttentionRow[] {
  return attentionRows(world).filter((row) => row.projectId === projectId);
}

