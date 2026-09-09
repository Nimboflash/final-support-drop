import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Ticket P1, Seam E: root direction (AC-P1.1), shell navigation (AC-P1.9),
 * local-fonts/no-external-requests (AC-P1.5), state primitives on scaffolds
 * (AC-P1.10), themes + axe WCAG 2.2 AA + reduced motion (AC-P1.11), and the
 * committed visual baselines at the three 09 §14 breakpoints.
 *
 * Retargeted by ticket P9 to the work-unit navigation (ADR-0020 D2). The shell
 * contract itself is unchanged — direction, fonts, focus, axe and the baselines
 * are all still asserted here; only the destinations moved.
 */

const BREAKPOINTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// The six primary destinations are the work units plus Engine (ADR-0020 D2).
// This supersedes ADR-0019 D13's five, which were named after stages of a
// process rather than after the things a person works on.
const NAV_LABELS = ["نمای کلی", "کانسپت‌ها", "محتوا", "خروجی‌ها", "تقویم", "Engine"];

// Settings and history left the sidebar; they are not work.
const SECONDARY_LABELS = ["تنظیمات", "تاریخچه"];

// Every destination retired by either restructure, with where it now lands.
// They REDIRECT rather than 404: `app/studio/[...rest]/page.tsx` sits at the
// same depth, so deleting a folder would silently render an empty state at
// HTTP 200 instead.
const REDIRECTS: readonly (readonly [string, string])[] = [
  ["/studio/projects", "/studio/concepts"],
  ["/studio/reviews", "/studio/content"],
  ["/studio/programs", "/studio/concepts"],
  ["/studio/lenses", "/studio/concepts"],
  ["/studio/requests", "/studio"],
  ["/studio/runs", "/studio/engine"],
  ["/studio/workflows", "/studio/engine"],
  ["/studio/registries", "/studio/settings"],
  ["/studio/team", "/studio/settings"],
];

// The seven project tabs ADR-0020 D2 dissolved, with the destination each
// folds into. A project is now a filter, so every tab had a work unit to
// land on.
const PROJECT_TAB_REDIRECTS: readonly (readonly [string, string])[] = [
  ["overview", "/studio"],
  ["concepts", "/studio/concepts"],
  ["content", "/studio/content"],
  ["outputs", "/studio/outputs"],
  ["plan", "/studio/calendar"],
  ["workflow", "/studio/engine"],
  ["activity", "/studio/activity"],
];

test.describe("root direction (AC-P1.1)", () => {
  for (const path of ["/studio", "/dev/gallery"]) {
    test(`document at ${path} is lang=fa-IR dir=rtl`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "fa-IR");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    });
  }
});

test.describe("no request leaves the app origin (AC-P1.5; 00 §4)", () => {
  for (const path of ["/studio", "/dev/gallery"]) {
    test(`${path} loads with zero external requests`, async ({ page, baseURL }) => {
      const external: string[] = [];
      page.on("request", (req) => {
        const url = req.url();
        if (!url.startsWith(baseURL!) && !url.startsWith("data:") && !url.startsWith("blob:")) {
          external.push(url);
        }
      });
      await page.goto(path, { waitUntil: "networkidle" });
      expect(external, `external requests: ${external.join(", ")}`).toHaveLength(0);
    });
  }

  test("Vazirmatn is served from the app's own /fonts path", async ({ page }) => {
    const fontRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("Vazirmatn")) fontRequests.push(req.url());
    });
    await page.goto("/dev/gallery", { waitUntil: "networkidle" });
    expect(fontRequests.length).toBeGreaterThan(0);
    for (const url of fontRequests) expect(url).toContain("/fonts/Vazirmatn");
  });
});

test.describe("/studio shell (AC-P1.9)", () => {
  test("renders exactly the six work-unit destinations (ADR-0020 D2)", async ({ page }) => {
    await page.goto("/studio");
    const nav = page.getByRole("navigation");
    for (const label of NAV_LABELS) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    // No stage of a process, and no project, is a destination any more.
    for (const gone of [
      "پروژه‌ها", "بررسی‌ها", "برنامه‌ها", "لنزهای هفته", "درخواست‌ها",
      "اجراها", "جریان‌های کاری", "رجیسترها", "تیم و دسترسی", "تقویم و برنامه",
    ]) {
      await expect(nav.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
    }
  });

  test("settings and history are reachable but are not destinations", async ({ page }) => {
    await page.goto("/studio");
    for (const label of SECONDARY_LABELS) {
      await expect(page.getByRole("navigation").getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }
    await page.getByTestId("secondary-menu-trigger").click();
    for (const label of SECONDARY_LABELS) {
      await expect(page.getByRole("menuitem", { name: label })).toBeVisible();
    }
  });

  test("every destination states the one question it answers (brief §5)", async ({ page }) => {
    await page.goto("/studio");
    // The sidebar's own justification for each entry, available to a screen
    // reader rather than only to the person who read the brief.
    for (const label of NAV_LABELS) {
      const link = page.getByRole("navigation").getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("title", /؟$/);
    }
  });

  test("every removed destination redirects instead of dead-ending (AC-P1R.2)", async ({ page }) => {
    for (const [from, to] of REDIRECTS) {
      await page.goto(from);
      await page.waitForURL(`**${to}`);
      // Real destinations render an EmptyState too while their surfaces are
      // unbuilt, so the empty state cannot tell a redirect from a dead end.
      // The catch-all's own marker can.
      await expect(page.getByTestId("studio-catch-all"), `${from} must not fall through to the catch-all`).toHaveCount(0);
    }
  });

  test("navigation is keyboard-operable with visible focus", async ({ page }) => {
    await page.goto("/studio");
    const link = page.getByRole("navigation").getByRole("link", { name: "کانسپت‌ها", exact: true });
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.outlineStyle}|${s.boxShadow}`;
    });
    expect(outline, "focused nav link must have a visible focus indicator").not.toBe("none|none");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/studio/concepts");
  });

  test("an unknown route resolves to the EmptyState primitive, never a 404", async ({ page }) => {
    // P4 filled the real destinations, so the surviving scaffold case is the
    // catch-all itself — which must still render rather than 404.
    await page.goto("/studio/not/built/yet");
    await expect(page.getByTestId("studio-catch-all")).toBeVisible();
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  test("a project link becomes a filter, not a place (ADR-0020 D2)", async ({ page }) => {
    await page.goto("/studio/projects/p1");
    await page.waitForURL("**/studio/concepts?project=p1");
    await expect(page.getByTestId("studio-catch-all")).toHaveCount(0);
    // The project is now carried by the selector on a work-unit page.
    await expect(page.getByTestId("project-selector")).toBeVisible();
  });

  test("each retired project tab folds into a work unit", async ({ page }) => {
    for (const [tab, to] of PROJECT_TAB_REDIRECTS) {
      await page.goto(`/studio/projects/p1/${tab}`);
      await page.waitForURL(`**${to}**`);
      await expect(
        page.getByTestId("studio-catch-all"),
        `${tab} must not fall through to the catch-all`,
      ).toHaveCount(0);
    }
  });

  for (const bp of BREAKPOINTS) {
    test(`shell holds and snapshots at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/studio");
      await expect(page.getByText("دراپ او اس — ماژول استودیو")).toBeVisible();
      // Wait for the surface's own content so the baseline is stable.
      await expect(page.getByTestId("project-card").first()).toBeVisible();
      await expect(page).toHaveScreenshot(`studio-shell-${bp.name}.png`, { fullPage: false });
    });
  }
});

test.describe("portal direction (AC-P1R.7; V2 02 §1)", () => {
  /**
   * Portals mount into document.body, outside the React tree that carries
   * `dir`. Radix's DirectionProvider crosses the portal via context, but the
   * DOM attribute did not exist on any overlay before P1-R — so this was never
   * actually verified, only assumed. Each case opens the overlay for real and
   * reads the attribute off the portalled node.
   */
  const OVERLAYS = [
    { name: "گفت‌وگو", slot: "dialog-content" },
    { name: "تأیید حذف", slot: "alert-dialog-content" },
    { name: "پنل کناری", slot: "sheet-content" },
    { name: "پاپ‌اور", slot: "popover-content" },
  ] as const;

  for (const overlay of OVERLAYS) {
    test(`${overlay.name} opens right-to-left inside its portal`, async ({ page }) => {
      await page.goto("/dev/gallery");
      await page.getByRole("button", { name: overlay.name }).click();
      const content = page.locator(`[data-slot="${overlay.slot}"]`);
      await expect(content).toBeVisible();
      await expect(content).toHaveAttribute("dir", "rtl");
      await page.keyboard.press("Escape");
    });
  }

  test("the dropdown menu carries direction on its root, where Radix reads it", async ({ page }) => {
    await page.goto("/dev/gallery");
    await page.getByRole("button", { name: "منوی عملیات" }).click();
    const menu = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(menu).toBeVisible();
    // Radix stamps the resolved direction on the portalled menu itself.
    await expect(menu).toHaveAttribute("dir", "rtl");
    await page.keyboard.press("Escape");
  });

  test("an opened overlay is still axe-clean (AC-P1R.7)", async ({ page }) => {
    await page.goto("/dev/gallery");
    await page.getByRole("button", { name: "پنل کناری" }).click();
    await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("gallery themes, snapshots and axe (AC-P1.10, AC-P1.11)", () => {
  for (const theme of ["light", "dark"] as const) {
    const query = theme === "dark" ? "?theme=dark" : "";

    test(`gallery ${theme}: state primitives present`, async ({ page }) => {
      await page.goto(`/dev/gallery${query}`);
      for (const id of [
        "loading-state", "empty-state", "error-state", "offline-state",
        "permission-denied-state", "degraded-mode-banner", "blocker-callout",
      ]) {
        await expect(page.getByTestId(id).first()).toBeVisible();
      }
    });

    test(`gallery ${theme}: axe WCAG 2.2 AA has no violations`, async ({ page }) => {
      await page.goto(`/dev/gallery${query}`);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.length} nodes`),
      ).toEqual([]);
    });

    for (const bp of BREAKPOINTS) {
      test(`gallery ${theme} snapshots at ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(`/dev/gallery${query}`);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`gallery-${theme}-${bp.name}.png`, { fullPage: true });
      });
    }
  }

  test("axe WCAG 2.2 AA on the /studio shell", async ({ page }) => {
    await page.goto("/studio");
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
  });

  test("shell dark: axe WCAG 2.2 AA has no violations (AC-P1.11)", async ({ page }) => {
    // the app-wide theme mechanism (next-themes, class attribute) reads localStorage
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/studio");
    await expect(page.locator("html")).toHaveClass(/dark/);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
  });

  test("shell dark snapshot at desktop (AC-P1.11)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/studio");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByTestId("project-card").first()).toBeVisible();
    await expect(page).toHaveScreenshot("studio-shell-dark-desktop.png");
  });

  test("reduced motion removes the loading spinner animation (09 §10)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/gallery");
    const spinner = page.getByTestId("loading-state").locator("svg").first();
    const animation = await spinner.evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");
  });
});
