/**
 * The seven always-visible project tabs (V2 02 §5; ADR-0019 D13).
 *
 * These supersede doc 04 §3-§5's thirteen program sub-routes. They are REAL
 * route folders rather than a `[[...tab]]` catch-all, so each gets its own
 * `loading.tsx` and its own prerequisites screen, and so the active tab is
 * statically analysable.
 *
 * "Keep all tabs visible for orientation" (V2 02 §5): a not-yet-available stage
 * renders its prerequisites with a link to act — never a hidden tab, and never
 * an unexplained disabled one.
 */
export type ProjectTab = {
  readonly segment: string;
  readonly label: string;
  /** What this tab needs before it can show anything, in Persian. */
  readonly prerequisite: string;
};

export const PROJECT_TABS: readonly ProjectTab[] = [
  {
    segment: "overview",
    label: "خلاصه",
    prerequisite: "این تب همیشه در دسترس است.",
  },
  {
    segment: "concepts",
    label: "کانسپت‌ها",
    prerequisite: "برای دیدن کانسپت‌ها، ابتدا مسیر را با ورودی خالی یا رفرنس شروع کنید.",
  },
  {
    segment: "content",
    label: "محتوا و تحقیق",
    prerequisite: "پس از تأیید دست‌کم یک کانسپت و ادامه دادن با آن، تحقیق و محتوا اینجا دیده می‌شود.",
  },
  {
    segment: "outputs",
    label: "خروجی نهایی",
    prerequisite: "وقتی همهٔ محتواهای الزامی تأیید شوند، بسته به‌صورت خودکار ساخته می‌شود.",
  },
  {
    segment: "plan",
    label: "برنامه",
    prerequisite: "پس از ساخته‌شدن بسته، یک آیتم برنامه ساخته می‌شود؛ اگر تاریخی نباشد به سینی «بدون تاریخ» می‌رود.",
  },
  {
    segment: "workflow",
    label: "گردش کار",
    prerequisite: "نمودار اجرا پس از شروع نخستین اجرا در دسترس است.",
  },
  {
    segment: "activity",
    label: "تاریخچه",
    prerequisite: "این تب همیشه در دسترس است.",
  },
] as const;

export function projectTabHref(projectId: string, segment: string): string {
  return `/studio/projects/${projectId}/${segment}`;
}
