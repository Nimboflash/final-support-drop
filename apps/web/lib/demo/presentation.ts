import {
  OUTPUT_TYPE_LABEL_FA,
  type Concept,
  type ContentItem,
  type PanelSnapshot,
  type PanelProject,
} from "@drop/panel-domain";

/**
 * The presentation mapping (ADR-0020 D7).
 *
 * The brief is explicit that internal state may stay as complex as it needs to
 * be, provided the interface maps it to a small human set — and that the label,
 * the description and the call to action all come from ONE place. Scattering
 * that mapping across surfaces is how two pages end up calling the same state
 * different things.
 *
 * Nothing here renames a recorded enum. `APPROVAL_DECISIONS`, the ADR-0012
 * stage and run enums and the V2 card vocabulary are all untouched; this is the
 * projection above them, in the same pattern ADR-0019 D5 established.
 */

/**
 * One label per output type, so two surfaces cannot disagree (brief §10).
 *
 * Re-exported rather than declared: the Engine graph in `@drop/workflow-ui`
 * needs the same names and cannot import from the app, so the map itself lives
 * in the projection layer of `@drop/panel-domain`.
 */
export const DIRECTION_LABEL_FA = OUTPUT_TYPE_LABEL_FA;

/* ------------------------------------------------------------- concept -- */

export type ConceptState = "generating" | "new" | "selected" | "set_aside";

export const CONCEPT_STATE_LABEL_FA: Readonly<Record<ConceptState, string>> = {
  generating: "در حال ساخت",
  new: "جدید",
  selected: "انتخاب‌شده",
  set_aside: "کنار گذاشته‌شده",
};

/**
 * Five recorded card statuses collapse to three visible ones.
 *
 * `REVISION_REQUESTED` and `IN_REVIEW` both read as "new": the brief removes
 * review-workflow states from the foreground, because improvement happens
 * through conversation rather than through a status a person has to interpret.
 * The underlying decisions are unchanged and still travel the single approval
 * write path.
 */
export function conceptStateOf(concept: Concept): ConceptState {
  if (concept.reviewStatus === "REJECTED") return "set_aside";
  if (concept.reviewStatus === "APPROVED") return "selected";
  if (concept.reviewStatus === "DRAFT") return "generating";
  return "new";
}

/* ------------------------------------------------------------- content -- */

export type ContentState = "draft" | "needs_input" | "ready_for_review" | "approved";

export const CONTENT_STATE_LABEL_FA: Readonly<Record<ContentState, string>> = {
  draft: "در حال آماده‌سازی",
  needs_input: "نیازمند منبع",
  ready_for_review: "آماده بررسی",
  approved: "تأییدشده",
};

/**
 * What the person should do next, in their words.
 *
 * `needs_input` deliberately does NOT read "blocked by a missing dependency".
 * The brief names that phrasing as technical (§10); the actionable version says
 * what is needed and offers the action that supplies it.
 */
export const CONTENT_STATE_ACTION_FA: Readonly<Record<ContentState, string | null>> = {
  draft: null,
  needs_input: "برای نهایی‌کردن این محتوا یک منبع معتبر لازم است.",
  ready_for_review: "این محتوا منتظر تأیید شماست.",
  approved: null,
};

export function contentStateOf(item: ContentItem): ContentState {
  if (item.generationState === "BLOCKED" || item.generationState === "FAILED") return "needs_input";
  if (item.generationState === "RUNNING" || item.generationState === "QUEUED") return "draft";
  if (item.reviewStatus === "APPROVED" && item.freshness === "CURRENT") return "approved";
  if (item.reviewStatus === "DRAFT") return "draft";
  return "ready_for_review";
}

/* -------------------------------------------------------------- output -- */

export type OutputState = "assembling" | "ready_for_approval" | "approved" | "scheduled";

export const OUTPUT_STATE_LABEL_FA: Readonly<Record<OutputState, string>> = {
  assembling: "در حال تکمیل",
  ready_for_approval: "آماده تأیید",
  approved: "تأییدشده",
  scheduled: "برنامه‌ریزی‌شده",
};

/**
 * An output is the assembled set of one concept's approved content.
 *
 * The word "package" does not appear — in the interface it is «خروجی», and
 * only domain code still calls the underlying record a package snapshot
 * (ADR-0020 D5).
 */
export interface OutputView {
  readonly conceptId: string;
  readonly projectId: string;
  readonly titleFa: string;
  readonly projectTitleFa: string;
  readonly state: OutputState;
  readonly contentIds: readonly string[];
  readonly approvedCount: number;
  readonly totalCount: number;
  /** Plain-language statement of what is missing, or null when nothing is. */
  readonly blockerFa: string | null;
  readonly scheduledDate: string | null;
  readonly packageVersionId: string | null;
  readonly updatedAt: string;
}

export function outputsFor(world: PanelSnapshot): readonly OutputView[] {
  const byConcept = new Map<string, ContentItem[]>();
  for (const item of world.content) {
    byConcept.set(item.conceptId, [...(byConcept.get(item.conceptId) ?? []), item]);
  }

  const views: OutputView[] = [];
  for (const [conceptId, items] of byConcept) {
    const concept = world.concepts.find((c) => c.id === conceptId);
    if (concept === undefined) continue;
    const project = world.projects.find((p) => p.id === concept.projectId);
    if (project === undefined) continue;

    const version = world.conceptVersions.find((v) => v.id === concept.activeVersionId);
    const states = items.map(contentStateOf);
    const approved = states.filter((s) => s === "approved").length;

    const snapshot = world.packages.find((p) => p.projectId === project.id);
    const entry = world.calendar.find((c) => c.projectId === project.id);

    const state: OutputState =
      entry !== undefined && entry.date !== null
        ? "scheduled"
        : snapshot !== undefined
          ? "approved"
          : approved === items.length && items.length > 0
            ? "ready_for_approval"
            : "assembling";

    views.push({
      conceptId,
      projectId: project.id,
      titleFa: version?.titleFa ?? "کانسپت بدون عنوان",
      projectTitleFa: project.titleFa,
      state,
      contentIds: items.map((i) => i.id),
      approvedCount: approved,
      totalCount: items.length,
      blockerFa: blockerFor(states),
      scheduledDate: entry?.date ?? null,
      packageVersionId: snapshot?.id ?? null,
      updatedAt: items.reduce((latest, i) => (i.updatedAt > latest ? i.updatedAt : latest), ""),
    });
  }
  return views;
}

/**
 * The human sentence that replaces «۲ از ۴ مورد الزامی تأیید شده».
 *
 * ADR-0020 D5 supersedes the V2 phrasing but keeps the rule underneath it: no
 * invented global percentage, and no bare internal counter. A count is fine
 * when it is attached to what the person should do about it.
 */
function blockerFor(states: readonly ContentState[]): string | null {
  const needsInput = states.filter((s) => s === "needs_input").length;
  if (needsInput > 0) {
    return needsInput === 1
      ? "یک محتوا هنوز منبع لازم را ندارد."
      : `${toFa(needsInput)} محتوا هنوز منبع لازم را ندارند.`;
  }
  const waiting = states.filter((s) => s === "ready_for_review").length;
  if (waiting > 0) {
    return waiting === 1
      ? "یک محتوا به تأیید شما نیاز دارد."
      : `${toFa(waiting)} محتوا به تأیید شما نیاز دارند.`;
  }
  const drafting = states.filter((s) => s === "draft").length;
  if (drafting > 0) return "چند محتوا هنوز در حال آماده‌سازی‌اند.";
  return null;
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function toFa(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);
}

/* ------------------------------------------------------------ overview -- */

/**
 * One operational sentence per project (brief §7.1).
 *
 * Exactly one, chosen by urgency — a card that lists every fact about a project
 * is the dashboard the brief is replacing.
 */
export function projectMessageFa(world: PanelSnapshot, project: PanelProject): string {
  const concepts = world.concepts.filter((c) => c.projectId === project.id);
  if (concepts.length === 0) return "هنوز کانسپتی برای این پروژه ساخته نشده.";

  const content = world.content.filter((c) => c.projectId === project.id);
  const needsSource = content.filter((c) => contentStateOf(c) === "needs_input").length;
  if (needsSource > 0) {
    return needsSource === 1
      ? "یک محتوا منتظر منبع است."
      : `${toFa(needsSource)} محتوا منتظر منبع‌اند.`;
  }

  const waitingContent = content.filter((c) => contentStateOf(c) === "ready_for_review").length;
  if (waitingContent > 0) {
    return waitingContent === 1
      ? "یک محتوا به تأیید شما نیاز دارد."
      : `${toFa(waitingContent)} محتوا به تأیید شما نیاز دارند.`;
  }

  const newConcepts = concepts.filter((c) => conceptStateOf(c) === "new").length;
  if (newConcepts > 0) {
    return newConcepts === 1
      ? "یک کانسپت جدید آماده بررسی است."
      : `${toFa(newConcepts)} کانسپت جدید آماده بررسی است.`;
  }

  const unscheduled = world.calendar.some(
    (entry) => entry.projectId === project.id && entry.date === null,
  );
  if (unscheduled) return "خروجی آماده برنامه‌ریزی است.";

  const scheduled = world.calendar.some(
    (entry) => entry.projectId === project.id && entry.date !== null,
  );
  if (scheduled) return "خروجی این پروژه برنامه‌ریزی شده است.";

  return "کار جدیدی در انتظار شما نیست.";
}
