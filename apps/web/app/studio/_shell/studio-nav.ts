import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  PackageCheck,
  Settings,
  SquareCheckBig,
  type LucideIcon,
} from "lucide-react";

/**
 * The V2 02 §2 global navigation: five primary destinations plus settings.
 *
 * This supersedes doc 04 §2's eleven destinations (ADR-0019 D13). The seven
 * removed paths are not deleted — each keeps its folder and redirects, because
 * `app/studio/[...rest]/page.tsx` sits at the same depth and would otherwise
 * catch the missing route and render an empty state at HTTP 200: a dead end
 * that looks like a working page.
 */
export type StudioNavItem = {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  /** Settings is secondary (V2 02 §2) and renders in its own footer group. */
  readonly secondary?: true;
};

export const STUDIO_NAV: readonly StudioNavItem[] = [
  { label: "نمای کلی", href: "/studio", icon: LayoutDashboard },
  { label: "پروژه‌ها", href: "/studio/projects", icon: FolderKanban },
  { label: "بررسی‌ها", href: "/studio/reviews", icon: SquareCheckBig },
  { label: "خروجی‌ها", href: "/studio/outputs", icon: PackageCheck },
  { label: "تقویم و برنامه", href: "/studio/calendar", icon: CalendarDays },
  { label: "تنظیمات", href: "/studio/settings", icon: Settings, secondary: true },
] as const;

/** Where each destination removed by ADR-0019 D13 sends the user instead. */
export const STUDIO_REDIRECTS = {
  "/studio/programs": "/studio/projects?type=program",
  "/studio/lenses": "/studio/projects?type=lens",
  // Owner ruling (ADR-0019 D13): requests live within project context now, and
  // the overview's "Needs your attention" list is the work inbox that replaces
  // a standalone requests queue.
  "/studio/requests": "/studio",
  "/studio/runs": "/studio/projects",
  "/studio/workflows": "/studio/projects",
  "/studio/registries": "/studio/settings",
  "/studio/team": "/studio/settings",
} as const satisfies Record<string, string>;

export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);
}
