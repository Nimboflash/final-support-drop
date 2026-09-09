import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PROJECT_TAB_REDIRECTS,
  SECONDARY_NAV,
  STUDIO_NAV,
  STUDIO_REDIRECTS,
  isNavItemActive,
} from "./studio-nav";

/**
 * Ticket P9, Seam A — the navigation restructure (ADR-0020 D2).
 *
 * The failure mode these guard is unchanged from ADR-0019 D13 and still worth
 * guarding: deleting a route folder does NOT produce a 404, because
 * `app/studio/[...rest]/page.tsx` sits at the same depth and renders a bare
 * empty state at HTTP 200 — a dead end that looks like a working page.
 */
const STUDIO_DIR = join(__dirname, "..");

describe("primary navigation is by work unit (ADR-0020 D2)", () => {
  it("is exactly the six destinations, in order", () => {
    expect(STUDIO_NAV.map((i) => i.href)).toEqual([
      "/studio",
      "/studio/concepts",
      "/studio/content",
      "/studio/outputs",
      "/studio/calendar",
      "/studio/engine",
    ]);
  });

  it("does not contain project as a destination", () => {
    // The brief's governing sentence: the project is only context.
    expect(STUDIO_NAV.some((i) => i.href.startsWith("/studio/projects"))).toBe(false);
  });

  it("does not contain settings — it moved to the secondary menu", () => {
    expect(STUDIO_NAV.some((i) => i.href === "/studio/settings")).toBe(false);
    expect(SECONDARY_NAV.some((i) => i.href === "/studio/settings")).toBe(true);
  });

  it("every destination states the one question it answers (brief §5)", () => {
    for (const item of STUDIO_NAV) {
      expect(item.answersFa, `${item.href}`).toMatch(/[؀-ۿ]/);
      expect(item.answersFa.endsWith("؟"), `${item.href} should be a question`).toBe(true);
    }
  });

  it("only /studio matches exactly; the rest match by prefix", () => {
    expect(isNavItemActive("/studio", "/studio")).toBe(true);
    expect(isNavItemActive("/studio", "/studio/concepts")).toBe(false);
    expect(isNavItemActive("/studio/concepts", "/studio/concepts")).toBe(true);
  });
});

describe("retired routes redirect rather than dead-end", () => {
  it("each retired path still has a folder on disk", () => {
    for (const path of Object.keys(STUDIO_REDIRECTS)) {
      const dir = join(STUDIO_DIR, path.replace("/studio/", ""));
      expect(statSync(dir).isDirectory(), `${path} must keep its folder`).toBe(true);
      expect(readdirSync(dir), `${path} needs a page`).toContain("page.tsx");
    }
  });

  it("each redirect page reads the table rather than hard-coding a target", () => {
    // Otherwise this table is decoration: a page could redirect somewhere the
    // table does not name, and every assertion here would still pass.
    for (const path of Object.keys(STUDIO_REDIRECTS)) {
      const page = readFileSync(join(STUDIO_DIR, path.replace("/studio/", ""), "page.tsx"), "utf8");
      expect(page, `${path} must redirect via STUDIO_REDIRECTS`).toContain("STUDIO_REDIRECTS");
      expect(page, `${path} hard-codes its destination`).toMatch(
        new RegExp(`STUDIO_REDIRECTS\\["${path.replace(/\//g, "\\/")}"\\]`),
      );
    }
  });

  it("every redirect target is a live destination or the secondary menu", () => {
    const live = new Set([
      ...STUDIO_NAV.map((i) => i.href),
      ...SECONDARY_NAV.map((i) => i.href),
    ]);
    for (const [from, to] of Object.entries(STUDIO_REDIRECTS)) {
      expect(live.has(to.split("?")[0]!), `${from} → ${to}`).toBe(true);
    }
  });

  it("no redirect points at another redirect", () => {
    const retired = new Set(Object.keys(STUDIO_REDIRECTS));
    for (const [from, to] of Object.entries(STUDIO_REDIRECTS)) {
      expect(retired.has(to.split("?")[0]!), `${from} → ${to} would bounce twice`).toBe(false);
    }
  });

  it("all seven retired project tabs map to a live destination", () => {
    expect(Object.keys(PROJECT_TAB_REDIRECTS).sort()).toEqual([
      "activity", "concepts", "content", "outputs", "overview", "plan", "workflow",
    ]);
    const live = new Set([
      ...STUDIO_NAV.map((i) => i.href),
      ...SECONDARY_NAV.map((i) => i.href),
    ]);
    for (const [tab, target] of Object.entries(PROJECT_TAB_REDIRECTS)) {
      expect(live.has(target), `${tab} → ${target}`).toBe(true);
    }
  });

  it("the project detail page is gone, replaced by two redirects", () => {
    const projectDir = join(STUDIO_DIR, "projects", "[id]");
    const entries = readdirSync(projectDir);
    // A bare project link, and a catch-all for the seven retired tabs.
    expect(entries).toContain("page.tsx");
    expect(entries).toContain("[tab]");
    // No tab folders survive.
    for (const tab of Object.keys(PROJECT_TAB_REDIRECTS)) {
      expect(entries, `${tab} must no longer be a route folder`).not.toContain(tab);
    }
  });
});

describe("every primary destination exists as a route", () => {
  it("has a page on disk", () => {
    for (const item of STUDIO_NAV) {
      if (item.href === "/studio") continue;
      const dir = join(STUDIO_DIR, item.href.replace("/studio/", ""));
      expect(readdirSync(dir), `${item.href} needs a page`).toContain("page.tsx");
    }
  });
});
