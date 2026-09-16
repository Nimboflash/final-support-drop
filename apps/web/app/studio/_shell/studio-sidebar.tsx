"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  BrandMark,
  ContentText,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@drop/ui";
import { SECONDARY_NAV, STUDIO_NAV, isNavItemActive } from "./studio-nav";
import { useDemoSession } from "../../../lib/demo/providers";
import { readStartedSessions, type StartedSession } from "../../../lib/machine/session-history";
import { switchMachineSession } from "../../../lib/machine/start-session";

/**
 * The rail, in the reference's order (ADR-0020 D2; the owner's Claude reference).
 *
 *   the mark
 *   the one primary action        «شروع کانسپت جدید» — first, like "New chat"
 *   the six destinations          inside the navigation landmark
 *   recent sessions               what this browser has started, current one marked
 *   ─────
 *   history · settings            plain items at the foot, no menu to open first
 *
 * The primary action lives ABOVE the `<nav>`, not in it: it is a thing to do,
 * not a place to go, and the landmark stays exactly the six work units. It is
 * a link to the concepts destination with `?compose=1`, which that page reads
 * and opens the composer for — so the action is addressable, survives a
 * reload, and needs no snapshot in the layout.
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
  const carry = (href: string, extra?: string) => {
    const params = new URLSearchParams();
    if (project !== null) params.set("project", project);
    if (extra !== undefined) params.set(extra, "1");
    const query = params.toString();
    return query === "" ? href : `${href}?${query}`;
  };

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="شروع کانسپت جدید"
              className="font-medium data-[active=true]:bg-transparent"
            >
              <Link href={carry("/studio/concepts", "compose")} data-testid="start-concept">
                <Plus aria-hidden="true" />
                <span>شروع کانسپت جدید</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

        <RecentSessions />
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        {/*
          Carried, like the primary rail. These were bare hrefs behind a menu,
          so «تاریخچه» — which honours the filter — arrived unfiltered, and
          from there every rail link went back to being bare too.
        */}
        <SidebarMenu data-testid="secondary-nav">
          {SECONDARY_NAV.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={
                    active
                      ? "border-e-2 border-e-selected font-medium data-[active=true]:bg-selected/10"
                      : "text-muted-foreground"
                  }
                >
                  <Link href={carry(item.href)} aria-current={active ? "page" : undefined}>
                    <item.icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * «جلسه‌های اخیر» — the reference's Recents, for the thing this panel has many
 * of: machine sessions. Only what this browser started (see
 * `session-history.ts`), the one on screen marked, each row a way back.
 *
 * Read after mount, because the list is in `localStorage` and the server
 * pass has none — rendering it during hydration would disagree with the
 * server's markup. REAL only: the demo world has one session and no history.
 */
function RecentSessions() {
  const session = useDemoSession();
  const [rows, setRows] = useState<readonly StartedSession[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    setRows(readStartedSessions());
  }, []);

  if (session.mode !== "REAL") return null;
  const current = session.machineSessionId;
  const listed = rows.filter((row) => row.id !== current).slice(0, 6);
  if (listed.length === 0) return null;

  return (
    <SidebarGroup data-testid="recent-sessions">
      <SidebarGroupLabel>جلسه‌های اخیر</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {listed.map((row) => {
            const label = row.briefFa === "" ? "بدون ورودی" : row.briefFa;
            return (
              <SidebarMenuItem key={row.id}>
                <SidebarMenuButton
                  tooltip={label}
                  size="sm"
                  disabled={switching !== null}
                  aria-busy={switching === row.id ? true : undefined}
                  onClick={() => {
                    setSwitching(row.id);
                    switchMachineSession(row.id)
                      .then(() => window.location.assign("/studio"))
                      .catch(() => setSwitching(null));
                  }}
                >
                  <span className="truncate">
                    <ContentText>{label}</ContentText>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
