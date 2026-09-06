/**
 * THE central Persian label mapping (09 §9; P1 adr_constraints / ADR-0015).
 * Internal enums stay English; every UI label resolves here — no component-local
 * status vocabulary anywhere. Copy is PROVISIONAL pending FA_EDITORIAL sign-off
 * (a human client gate, 15 §12); structure and coverage are contractual now.
 *
 * A missing key never falls back to silent English: `faLabel` returns the visible
 * unknown-value marker (failure_states, ticket P1).
 */

export const FA_LABELS = {
  stage: {
    DRAFT: "پیش‌نویس",
    READY: "آماده",
    QUEUED: "در صف",
    RUNNING: "در حال اجرا",
    WAITING_FOR_DEPENDENCY: "در انتظار وابستگی",
    WAITING_FOR_INPUT: "در انتظار ورودی",
    WAITING_FOR_APPROVAL: "در انتظار تأیید",
    PAUSED: "متوقف موقت",
    FAILED_RETRYABLE: "خطا — قابل تلاش دوباره",
    FAILED_FINAL: "خطای نهایی",
    SUCCEEDED: "موفق",
    SKIPPED: "صرف‌نظرشده",
    CANCELLED: "لغوشده",
    SUPERSEDED: "جایگزین‌شده",
  },
  run: {
    DRAFT: "پیش‌نویس",
    QUEUED: "در صف",
    RUNNING: "در حال اجرا",
    WAITING_INPUT: "در انتظار ورودی",
    WAITING_APPROVAL: "در انتظار تأیید",
    PAUSED: "متوقف موقت",
    SUCCEEDED: "موفق",
    FAILED: "ناموفق",
    CANCELLED: "لغوشده",
  },
  project: {
    ACTIVE: "فعال",
    ARCHIVED: "بایگانی‌شده",
  },
  program: {
    DRAFT: "پیش‌نویس",
    IN_PIPELINE: "در خط تولید",
    APPROVED: "تأییدشده",
    ARCHIVED: "بایگانی‌شده",
  },
  lens: {
    DRAFT: "پیش‌نویس",
    IN_PIPELINE: "در خط تولید",
    APPROVED: "تأییدشده",
    COMMISSIONED: "سفارش‌داده‌شده",
    ARCHIVED: "بایگانی‌شده",
  },
  request: {
    DRAFT: "پیش‌نویس",
    OPEN: "باز",
    BLOCKED: "مسدود",
    IN_PROGRESS: "در جریان",
    IN_REVIEW: "در بازبینی",
    CHANGES_REQUESTED: "نیازمند اصلاح",
    APPROVED: "تأییدشده",
    COMPLETED: "انجام‌شده",
    CANCELLED: "لغوشده",
  },
  calendarItem: {
    PLANNED: "برنامه‌ریزی‌شده",
    CONFIRMED: "قطعی",
    DONE: "انجام‌شده",
    CANCELLED: "لغوشده",
  },
  approval: {
    PENDING: "در انتظار تصمیم",
    APPROVED: "تأییدشده",
    CHANGES_REQUESTED: "نیازمند اصلاح",
    REJECTED: "ردشده",
    ESCALATED: "ارجاع‌شده",
  },
  review: {
    DRAFT: "پیش‌نویس",
    IN_REVIEW: "در حال بررسی",
    REVISION_REQUESTED: "درخواست بازنگری",
    APPROVED: "تأییدشده",
    REJECTED: "ردشده",
  },
  freshness: {
    CURRENT: "به‌روز",
    STALE: "کهنه‌شده",
  },
  packageStatus: {
    CURRENT: "نسخهٔ جاری",
    HISTORICAL: "بایگانی",
    STALE: "کهنه‌شده",
  },
  role: {
    WORKSPACE_OWNER: "مالک فضای کاری",
    DROP_GUARDIAN: "نگهبان دراپ",
    PROJECT_LEAD: "سرپرست پروژه",
    REVIEWER_EDITOR: "بازبین و ویراستار",
    CONTRIBUTOR: "مشارکت‌کننده",
    VIEWER: "بیننده",
    TECHNICAL_MAINTAINER: "نگهدارندهٔ فنی",
  },
} as const;

export type LabelDomain = keyof typeof FA_LABELS;

/** The visible unknown-value marker — never silent English (P1 failure_states). */
export const FA_UNKNOWN_LABEL = "وضعیت ناشناخته";

export function faLabel(domain: LabelDomain, value: string): string {
  const table: Record<string, string> = FA_LABELS[domain];
  // Object.hasOwn: a value like "toString" must hit the fallback, not the prototype.
  return Object.hasOwn(table, value) ? (table[value] as string) : FA_UNKNOWN_LABEL;
}

/** Common shell strings (central, not component-local). PROVISIONAL copy. */
export const FA_UI = {
  loading: "در حال بارگذاری…",
  empty: "چیزی برای نمایش نیست",
  emptyDetail: "این بخش هنوز محتوایی ندارد.",
  error: "خطایی رخ داد",
  errorDetail: "مشکلی در نمایش این بخش پیش آمد. شناسهٔ تشخیصی را برای پیگیری نگه دارید.",
  offline: "اتصال برقرار نیست",
  offlineDetail: "دسترسی به سامانه ممکن نیست. اتصال شبکه را بررسی کنید.",
  permissionDenied: "دسترسی مجاز نیست",
  permissionDeniedDetail: "برای دیدن این بخش، نقش یا دسترسی لازم را ندارید.",
  degraded: "حالت محدود",
  degradedDetail: "بخشی از قابلیت‌ها در دسترس نیست؛ داده‌های نمایشی ممکن است قدیمی باشند.",
  copy: "کپی",
  copied: "کپی شد",
  diagnosticId: "شناسهٔ تشخیصی",
} as const;
