import {
  CalendarDays,
  Cpu,
  FileText,
  LayoutDashboard,
  Lightbulb,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * The primary navigation, by WORK UNIT (ADR-0020 D2).
 *
 * The simplification brief's governing sentence: the project is only context.
 * So the destinations are the things a person makes — concepts, content,
 * outputs, a schedule — plus one operational view (Engine) and the overview
 * that points at whatever needs attention.
 *
 * Settings deliberately is NOT here. ADR-0019 D13 had it as a sixth
 * destination; the brief moves it to a secondary menu so the primary bar
 * carries only the path of the work.
 */
export type StudioNavItem = {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  /** The one question this destination answers (brief §5). */
  readonly answersFa: string;
};

export const STUDIO_NAV: readonly StudioNavItem[] = [
  {
    label: "نمای کلی",
    href: "/studio",
    icon: LayoutDashboard,
    answersFa: "الان چه چیزی به توجه من نیاز دارد؟",
  },
  {
    label: "کانسپت‌ها",
    href: "/studio/concepts",
    icon: Lightbulb,
    answersFa: "چه ایده‌هایی داریم و کدام را ادامه بدهم؟",
  },
  {
    label: "محتوا",
    href: "/studio/content",
    icon: FileText,
    answersFa: "برای کانسپت‌های انتخاب‌شده چه محتواهایی آماده یا ناقص‌اند؟",
  },
  {
    label: "خروجی‌ها",
    href: "/studio/outputs",
    icon: PackageCheck,
    answersFa: "چه چیزی آماده تأیید و انتشار است؟",
  },
  {
    label: "تقویم",
    href: "/studio/calendar",
    icon: CalendarDays,
    answersFa: "چه چیزی چه زمانی منتشر می‌شود؟",
  },
  {
    label: "Engine",
    href: "/studio/engine",
    icon: Cpu,
    answersFa: "این پروژه اکنون در کدام بخش جریان کار قرار دارد؟",
  },
] as const;

/** Reachable from the profile menu, not the primary bar (ADR-0020 D2). */
export const SECONDARY_NAV = [
  { label: "تنظیمات", href: "/studio/settings" },
  { label: "تاریخچه", href: "/studio/activity" },
] as const;

/**
 * Where each retired path now goes.
 *
 * Redirects, never deletions: `app/studio/[...rest]/page.tsx` sits at the same
 * depth, so removing a folder produces a silent HTTP 200 dead end rather than a
 * 404 (recorded at ADR-0019 D13 and still true).
 *
 * The project routes carry their project id forward as `?project=`, so an old
 * deep link lands on the same work, filtered — which is the whole point of
 * demoting project from destination to context.
 */
export const STUDIO_REDIRECTS = {
  "/studio/projects": "/studio/concepts",
  "/studio/reviews": "/studio/content",
  "/studio/programs": "/studio/concepts",
  "/studio/lenses": "/studio/concepts",
  "/studio/requests": "/studio",
  "/studio/runs": "/studio/engine",
  "/studio/workflows": "/studio/engine",
  "/studio/registries": "/studio/settings",
  "/studio/team": "/studio/settings",
} as const satisfies Record<string, string>;

/** Per-tab mapping for the retired project detail page (ADR-0020 D2). */
export const PROJECT_TAB_REDIRECTS = {
  overview: "/studio",
  concepts: "/studio/concepts",
  content: "/studio/content",
  outputs: "/studio/outputs",
  plan: "/studio/calendar",
  workflow: "/studio/engine",
  activity: "/studio/activity",
} as const satisfies Record<string, string>;

export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);
}
