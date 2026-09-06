"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@drop/ui";
import { PROJECT_TABS, projectTabHref } from "./project-tabs";

/**
 * One stable tab row (V2 02 §5). All seven stay visible for orientation — a
 * stage that is not yet available explains its prerequisites inside the tab
 * body, rather than the tab hiding or going unexplained-disabled.
 *
 * On narrow screens this is a horizontally scrollable row with the active tab
 * visible; there is no nested tab hierarchy anywhere below it.
 */
export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="بخش‌های پروژه" className="border-b border-border">
      <ul className="flex gap-1 overflow-x-auto pb-px">
        {PROJECT_TABS.map((tab) => {
          const href = projectTabHref(projectId, tab.segment);
          const active = pathname === href;
          return (
            <li key={tab.segment} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                data-segment={tab.segment}
                className={cn(
                  "inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-b-selected font-medium text-foreground"
                    : "border-b-transparent text-muted-foreground hover:border-b-border hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
