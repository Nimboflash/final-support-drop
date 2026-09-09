"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@drop/ui";
import { SECONDARY_NAV, STUDIO_NAV, isNavItemActive } from "./studio-nav";

/**
 * The primary navigation (ADR-0020 D2): six work-unit destinations.
 *
 * Settings and history live behind the secondary menu in the footer, so the
 * primary bar carries only the path of the work itself.
 *
 * The destinations sit inside a real `<nav>`. `Sidebar` renders a generic
 * element, so the `aria-label` it used to carry was silently discarded — a
 * screen-reader user had no navigation landmark to jump to, and no test noticed
 * because nothing had queried the landmark before.
 */
export function StudioSidebar() {
  const pathname = usePathname();
  /*
    The project filter has to survive a move between destinations. It is the
    whole mechanism D2 replaced the project page with — and a bare `href` threw
    it away on every click: choose a project on «کانسپت‌ها», press «محتوا», and
    the filter silently vanished. The person then sees every project's content
    and has no way to know why.
  */
  const project = useSearchParams().get("project");
  const carry = (href: string) => (project === null ? href : `${href}?project=${project}`);

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader>
        <p className="px-2 py-1 text-lg font-bold tracking-tight">DROP OS</p>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="ناوبری اصلی استودیو">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {STUDIO_NAV.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        // The active destination is the one place the brand accent
                        // tints a surface (ADR-0019 D14). Position is never the
                        // only cue: aria-current carries it too.
                        className={active ? "border-e-2 border-e-selected font-medium" : undefined}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          title={item.answersFa}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton data-testid="secondary-menu-trigger">
                  <MoreHorizontal aria-hidden="true" />
                  <span>بیشتر</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="end">
                {SECONDARY_NAV.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
