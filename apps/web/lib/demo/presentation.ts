import { toPersianDigits } from "@drop/ui";
import type { ProjectStage } from "./read-models";
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

export type ConceptState =
  | "generating"
  | "new"
  | "improving"
  | "selected"
  /** Selected, but refined since — the research was built from an older version. */
  | "outdated"
  | "set_aside";

export const CONCEPT_STATE_LABEL_FA: Readonly<Record<ConceptState, string>> = {
  generating: "در حال ساخت",
  new: "جدید",
  improving: "در حال بازنگری",
  selected: "انتخاب‌شده",
  outdated: "محتوا از نسخهٔ قبلی است",
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
  /*
    STALE on a selected concept is the machine's own self-contradiction, made
    visible: an approval survives a later round, so the research was built
    from a version the person has since asked to change. The projection has
    recorded this on the freshness axis all along; nothing read it, so a
    refined-and-selected concept read «انتخاب‌شده» with no trace that its
    content was now about something else.
  */
  if (concept.reviewStatus === "APPROVED") {
    return concept.freshness === "STALE" ? "outdated" : "selected";
  }
  if (concept.reviewStatus === "DRAFT") return "generating";
  // Asking for a change USED to leave the card reading «جدید», identical to
  // before — so D8's central promise, that a person asks in their own words and
  // that produces a revision, left no trace a person could see.
  if (concept.reviewStatus === "REVISION_REQUESTED") return "improving";
  return "new";
}

/* ------------------------------------------------------------- content -- */

export type ContentState =
  | "draft"
  | "needs_input"
  | "failed"
  | "ready_for_review"
  /** A change was asked for and the rewrite has not landed. */
  | "improving"
  | "approved";

export const CONTENT_STATE_LABEL_FA: Readonly<Record<ContentState, string>> = {
  draft: "در حال آماده‌سازی",
  needs_input: "نیازمند منبع",
  failed: "ساخت آن ناتمام ماند",
  ready_for_review: "آماده بررسی",
  improving: "در حال بازنگری",
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
  // No instruction to add a source: adding one would not help. What this state
  // needs is the item's own reason, shown beside it — and the one route out,
  // which is a change request: a rewrite is a fresh attempt with new input.
  failed: "ساخت این محتوا به نتیجه نرسید. با یک درخواست تغییر، دوباره ساخته می‌شود.",
  ready_for_review: "این محتوا منتظر تأیید شماست.",
  improving: "درخواست تغییر شما ثبت شده و نسخهٔ تازه در راه است.",
  approved: null,
};

export function contentStateOf(item: ContentItem): ContentState {
  // BLOCKED and FAILED are NOT the same thing to a person. A blocked item is
  // waiting for a source they can supply; a failed one is not, and telling them
  // to «افزودن منبع» sends them to do work that will not help. The item's own
  // recorded reason is what the failed state shows instead.
  if (item.generationState === "FAILED") return "failed";
  if (item.generationState === "BLOCKED") return "needs_input";
  if (item.generationState === "RUNNING" || item.generationState === "QUEUED") return "draft";
  if (item.reviewStatus === "APPROVED" && item.freshness === "CURRENT") return "approved";
  if (item.reviewStatus === "DRAFT") return "draft";
  // The same signal concepts got at `conceptStateOf`: asking for a change used
  // to leave the card reading «آماده بررسی», identical to before, so the
  // request left no visible trace on the surface it was made from.
  if (item.reviewStatus === "REVISION_REQUESTED") return "improving";
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
  /**
   * What the output IS — the approved content, and only that.
   *
   * Not every content item under the concept. An output is the thing that gets
   * published, so listing the unapproved alongside it was showing a person a
   * set they had not agreed to and calling it their output. The counts below
   * still run over EVERY item, because "three still need a source" is only
   * meaningful against the whole.
   */
  readonly contentIds: readonly string[];
  /** Over all of the concept's content, not over `contentIds`. */
  readonly approvedCount: number;
  readonly totalCount: number;
  /** Plain-language statement of what is missing, or null when nothing is. */
  readonly blockerFa: string | null;
  readonly scheduledDate: string | null;
  readonly packageVersionId: string | null;
  /** The family an entry is keyed on, so scheduling is idempotent per output. */
  readonly packageFamilyId: string | null;
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

    /*
      Readiness is a fact about the REVIEW, not about whether an assembly
      exists — and conflating the two made the panel say the opposite of what
      was true.

      `snapshot !== undefined ? "approved"` was written when a package only ever
      appeared after content had been approved, so its existence implied the
      review. That stopped being true the moment the machine's portfolio was
      projected as a package: the machine builds it in one call, before anyone
      has looked at anything. The card then read «تأییدشده» over a sheet saying
      «هنوز محتوایی تأیید نشده», and «ارسال به تقویم» went live on an output
      containing nothing.

      So the ladder asks about the review first. A plan with nothing REQUIRED —
      which is every machine session — still needs one approval before there is
      an output at all: zero approved items is not a finished output, it is an
      empty one.
    */
    const approvedIds = new Set(
      items.filter((item) => contentStateOf(item) === "approved").map((item) => item.id),
    );
    const requiredMet = project.outputPlan.requiredContentIds.every((id) => approvedIds.has(id));
    const reviewed = requiredMet && approvedIds.size > 0;

    const state: OutputState =
      entry !== undefined && entry.date !== null
        ? "scheduled"
        : reviewed && snapshot !== undefined
          ? "approved"
          : reviewed
            ? "ready_for_approval"
            : "assembling";

    views.push({
      conceptId,
      projectId: project.id,
      titleFa: version?.titleFa ?? "کانسپت بدون عنوان",
      projectTitleFa: project.titleFa,
      state,
      // Approved only. The docblock above this interface has always said an
      // output is "the assembled set of one concept's APPROVED content"; the
      // code took every item regardless, so an output opened mid-review listed
      // everything the machine had produced as though it were the deliverable.
      contentIds: items.filter((i) => contentStateOf(i) === "approved").map((i) => i.id),
      approvedCount: approved,
      totalCount: items.length,
      blockerFa: blockerFor(states),
      scheduledDate: entry?.date ?? null,
      packageVersionId: snapshot?.id ?? null,
      packageFamilyId: snapshot?.familyId ?? null,
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
  // A build that did not finish outranks everything: `null` here rendered as
  // «همهٔ محتواها تأیید شده‌اند» over an item that had failed, because this
  // function had no branch for `failed` and the card turned an absence into
  // a positive claim.
  const failed = states.filter((s) => s === "failed").length;
  if (failed > 0) {
    return failed === 1
      ? "ساخت یک محتوا ناتمام ماند."
      : `ساخت ${toPersianDigits(String(failed))} محتوا ناتمام ماند.`;
  }
  const needsInput = states.filter((s) => s === "needs_input").length;
  if (needsInput > 0) {
    return needsInput === 1
      ? "یک محتوا هنوز منبع لازم را ندارد."
      : `${toPersianDigits(String(needsInput))} محتوا هنوز منبع لازم را ندارند.`;
  }
  /*
    "Not yet reviewed", not "needs your approval". The owner ruled that an
    output is the approved subset and nothing unapproved is REQUIRED — so a
    sentence saying seventeen items "need" approval, beside a badge saying
    the output is approved, contradicted both the badge and the ruling.
  */
  const waiting = states.filter((s) => s === "ready_for_review").length;
  if (waiting > 0) {
    return waiting === 1
      ? "یک محتوای دیگر هنوز بررسی نشده؛ فقط تأییدشده‌ها در خروجی می‌آیند."
      : `${toPersianDigits(String(waiting))} محتوای دیگر هنوز بررسی نشده‌اند؛ فقط تأییدشده‌ها در خروجی می‌آیند.`;
  }
  const improving = states.filter((s) => s === "improving").length;
  if (improving > 0) {
    return improving === 1
      ? "یک محتوا در حال بازنگری است."
      : `${toPersianDigits(String(improving))} محتوا در حال بازنگری‌اند.`;
  }
  const drafting = states.filter((s) => s === "draft").length;
  if (drafting > 0) return "چند محتوا هنوز در حال آماده‌سازی‌اند.";
  return null;
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
  const failed = content.filter((c) => contentStateOf(c) === "failed").length;
  if (failed > 0) {
    return failed === 1
      ? "ساخت یک محتوا ناتمام ماند."
      : `ساخت ${toPersianDigits(String(failed))} محتوا ناتمام ماند.`;
  }
  const needsSource = content.filter((c) => contentStateOf(c) === "needs_input").length;
  if (needsSource > 0) {
    return needsSource === 1
      ? "یک محتوا منتظر منبع است."
      : `${toPersianDigits(String(needsSource))} محتوا منتظر منبع‌اند.`;
  }

  const waitingContent = content.filter((c) => contentStateOf(c) === "ready_for_review").length;
  if (waitingContent > 0) {
    return waitingContent === 1
      ? "یک محتوا به تأیید شما نیاز دارد."
      : `${toPersianDigits(String(waitingContent))} محتوا به تأیید شما نیاز دارند.`;
  }

  const newConcepts = concepts.filter((c) => conceptStateOf(c) === "new").length;
  if (newConcepts > 0) {
    return newConcepts === 1
      ? "یک کانسپت جدید آماده بررسی است."
      : `${toPersianDigits(String(newConcepts))} کانسپت جدید آماده بررسی است.`;
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

/**
 * The five stages, in the user's words (ADR-0020 D5; ADR-0023).
 *
 * Each name is the destination a person already knows from the navigation, so
 * the board and the menu agree: «کانسپت‌ها», «خروجی», «تقویم». `PACKAGE` reads
 * «خروجی» and never «بسته» — that noun is banned from every surface by
 * `interface-language.test.ts`, and the recorded vocabulary keeps its own name
 * underneath regardless.
 */
export const PROJECT_STAGE_LABEL_FA: Readonly<Record<ProjectStage, string>> = {
  DRAFT: "ورودی",
  CONCEPTS: "کانسپت‌ها",
  RESEARCH_CONTENT: "تحقیق و محتوا",
  PACKAGE: "خروجی",
  CALENDAR: "تقویم",
};

