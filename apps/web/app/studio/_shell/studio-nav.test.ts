import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { STUDIO_NAV, STUDIO_REDIRECTS, isNavItemActive } from "./studio-nav";
import { PROJECT_TABS, projectTabHref } from "../projects/[id]/_shell/project-tabs";

/**
 * Ticket P1-R, Seam A. The navigation collapse (ADR-0019 D13) has one failure
 * mode that no screenshot catches: deleting a route folder does NOT produce a
 * 404, because `app/studio/[...rest]/page.tsx` sits at the same depth and
 * renders a bare empty state at HTTP 200. These checks prove every removed
 * destination still exists on disk as a redirect, and that no redirect points
 * somewhere that isn't real.
 */
const STUDIO_DIR = join(__dirname, "..");

describe("studio navigation (AC-P1R.1)", () => {
  it("is exactly the six V2 02 §2 destinations, in order", () => {
    expect(STUDIO_NAV.map((i) => i.href)).toEqual([
      "/studio",
      "/studio/projects",
      "/studio/reviews",
      "/studio/outputs",
      "/studio/calendar",
      "/studio/settings",
    ]);
  });

  it("marks settings secondary and nothing else", () => {
    expect(STUDIO_NAV.filter((i) => i.secondary).map((i) => i.href)).toEqual(["/studio/settings"]);
  });

  it("every destination has a Persian label", () => {
    for (const item of STUDIO_NAV) {
      expect(item.label, `${item.href} needs a Persian label`).toMatch(/[؀-ۿ]/);
    }
  });

  it("only /studio matches exactly; the rest match by prefix", () => {
    expect(isNavItemActive("/studio", "/studio")).toBe(true);
    expect(isNavItemActive("/studio", "/studio/projects")).toBe(false);
    expect(isNavItemActive("/studio/projects", "/studio/projects/p1/overview")).toBe(true);
  });
});

describe("removed destinations redirect rather than dead-end (AC-P1R.2)", () => {
  const removed = Object.keys(STUDIO_REDIRECTS);

  it("covers every path ADR-0019 D13 removed", () => {
    expect(removed.sort()).toEqual(
      [
        "/studio/lenses",
        "/studio/programs",
        "/studio/registries",
        "/studio/requests",
        "/studio/runs",
        "/studio/team",
        "/studio/workflows",
      ].sort(),
    );
  });

  it("each removed path still has a route folder on disk, so the catch-all never swallows it", () => {
    for (const path of removed) {
      const segment = path.replace("/studio/", "");
      const dir = join(STUDIO_DIR, segment);
      expect(statSync(dir).isDirectory(), `${path} must keep its folder`).toBe(true);
      expect(readdirSync(dir), `${path} must have a page`).toContain("page.tsx");
    }
  });

  it("no removed path is still advertised in the sidebar", () => {
    const hrefs = new Set(STUDIO_NAV.map((i) => i.href));
    for (const path of removed) expect(hrefs.has(path)).toBe(false);
  });

  it("every redirect target resolves to a live destination", () => {
    const live = new Set(STUDIO_NAV.map((i) => i.href));
    for (const [from, to] of Object.entries(STUDIO_REDIRECTS)) {
      const base = to.split("?")[0]!;
      expect(live.has(base), `${from} → ${to}: target must be a live destination`).toBe(true);
    }
  });

  it("no redirect points at another redirect", () => {
    const removedSet = new Set(removed);
    for (const [from, to] of Object.entries(STUDIO_REDIRECTS)) {
      expect(removedSet.has(to.split("?")[0]!), `${from} → ${to} would bounce twice`).toBe(false);
    }
  });
});

describe("project tabs (AC-P1R.3)", () => {
  it("is exactly the seven V2 02 §5 tabs, in order", () => {
    expect(PROJECT_TABS.map((t) => t.segment)).toEqual([
      "overview", "concepts", "content", "outputs", "plan", "workflow", "activity",
    ]);
  });

  it("every tab exists as a real route folder with its own loading boundary", () => {
    const tabsDir = join(STUDIO_DIR, "projects", "[id]");
    for (const tab of PROJECT_TABS) {
      const entries = readdirSync(join(tabsDir, tab.segment));
      expect(entries, `${tab.segment} needs a page`).toContain("page.tsx");
      expect(entries, `${tab.segment} needs a loading boundary (V2 02 §10)`).toContain("loading.tsx");
    }
  });

  it("every tab states a prerequisite, so a stage is never disabled without explanation", () => {
    for (const tab of PROJECT_TABS) {
      expect(tab.prerequisite, `${tab.segment}`).toMatch(/[؀-ۿ]/);
    }
  });

  it("builds hrefs under the project it belongs to", () => {
    expect(projectTabHref("p1", "concepts")).toBe("/studio/projects/p1/concepts");
  });
});
