"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderKanban,
  Inbox,
  Layers,
  LayoutDashboard,
  Library,
  PlayCircle,
  Settings,
  Telescope,
  Users,
  Workflow,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@drop/ui";

/** The 04 §2 global navigation — Persian labels, right-side RTL placement. */
export const STUDIO_NAV = [
  { label: "نمای کلی", href: "/studio", icon: LayoutDashboard },
  { label: "پروژه‌ها", href: "/studio/projects", icon: FolderKanban },
  { label: "برنامه‌ها", href: "/studio/programs", icon: Layers },
  { label: "لنزهای هفته", href: "/studio/lenses", icon: Telescope },
  { label: "درخواست‌ها", href: "/studio/requests", icon: Inbox },
  { label: "تقویم", href: "/studio/calendar", icon: CalendarDays },
  { label: "اجراها", href: "/studio/runs", icon: PlayCircle },
  { label: "جریان‌های کاری", href: "/studio/workflows", icon: Workflow },
  { label: "رجیسترها", href: "/studio/registries", icon: Library },
  { label: "تیم و دسترسی", href: "/studio/team", icon: Users },
  { label: "تنظیمات", href: "/studio/settings", icon: Settings },
] as const;

export function StudioSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar side="right" collapsible="icon" aria-label="ناوبری اصلی استودیو">
      <SidebarHeader>
        <p className="px-2 py-1 text-lg font-bold tracking-tight">DROP OS</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {STUDIO_NAV.map((item) => {
                const active =
                  item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
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
      </SidebarContent>
    </Sidebar>
  );
}
