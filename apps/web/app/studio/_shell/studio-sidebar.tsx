"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { STUDIO_NAV, isNavItemActive } from "./studio-nav";

/** The V2 02 §2 navigation — five destinations plus a secondary Settings. */
export function StudioSidebar() {
  const pathname = usePathname();
  const primary = STUDIO_NAV.filter((item) => !item.secondary);
  const secondary = STUDIO_NAV.filter((item) => item.secondary);

  return (
    <Sidebar side="right" collapsible="icon" aria-label="ناوبری اصلی استودیو">
      <SidebarHeader>
        <p className="px-2 py-1 text-lg font-bold tracking-tight">DROP OS</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <NavRow key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {secondary.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavRow({
  item,
  pathname,
}: {
  item: (typeof STUDIO_NAV)[number];
  pathname: string;
}) {
  const active = isNavItemActive(item.href, pathname);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        // The active destination is the one place the brand accent tints a
        // surface (ADR-0019 D14). Position is never the only cue: aria-current
        // carries it for assistive technology.
        className={active ? "border-e-2 border-e-selected font-medium" : undefined}
      >
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
