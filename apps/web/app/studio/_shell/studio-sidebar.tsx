"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  BrandMark,
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
export function StudioSidebar({ hasWordmark }: { hasWordmark: boolean }) {
  const pathname = usePathname();
  /*
    The project filter has to survive a move between destinations. It is the
    whole mechanism D2 replaced the project page with — and a bare `href` threw
    it away on every click: choose a project on «کانسپت‌ها», press «محتوا», and
    the filter silently vanished. The person then sees every project's content
    and has no way to know why.

    `carry` was written and then never called, so that paragraph described the
    live behaviour rather than the fixed one for as long as it stood. Nothing
    caught it: no test asserted a carried href, and an unused local was not an
    error. Both gaps are closed — `tsconfig.base.json` sets `noUnusedLocals`,
    and shell-and-gallery.spec.ts asserts the rail both carries the filter and
    does not invent one.
  */
  const project = useSearchParams().get("project");
  const carry = (href: string) => (project === null ? href : `${href}?project=${project}`);

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader>
        {/*
          The sidebar carries the mark alone. «OS» was doing no work beside a
          nav that is entirely this product — and the wordmark is the primary
          identifier (Brand DNA §538), not a wordmark-plus-suffix.
        */}
        <div className="px-2 py-1">
          <BrandMark hasWordmark={hasWordmark} className="text-lg" />
        </div>
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
                        /*
                          The rail is `collapsible="icon"`, and collapsed it
                          showed six bare icons with no names — a keyboard user
                          got nothing at all, because focusing an icon surfaced
                          no label anywhere. `SidebarMenuButton` has carried a
                          `tooltip` prop the whole time and nothing passed one,
                          so the component rendered its no-tooltip branch and
                          the collapse quietly removed the navigation's meaning.
                        */
                        tooltip={item.label}
                        // The active destination is the one place the brand accent
                        // tints a surface (ADR-0019 D14). Position is never the
                        // only cue: aria-current carries it too.
                        /*
                          The tint is the brand accent's, not the hover tint's.
                          `sidebarMenuButtonVariants` paints hover, press and
                          active with one token, so the destination you are ON
                          looked like the one under your pointer. The accent
                          stripe already marks it; the ground now agrees.
                        */
                        className={
                          active
                            ? "border-e-2 border-e-selected font-medium data-[active=true]:bg-selected/10 data-[active=true]:hover:bg-selected/15"
                            : undefined
                        }
                      >
                        <Link
                          href={carry(item.href)}
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
                {/*
                  Carried, like the primary rail. These were bare hrefs, so
                  «تاریخچه» — which honours the filter — arrived unfiltered,
                  and from there every rail link went back to being bare too.
                */}
                {SECONDARY_NAV.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={carry(item.href)}>{item.label}</Link>
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
