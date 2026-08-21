import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Ticket P1, Seam E: root direction (AC-P1.1), shell navigation (AC-P1.9),
 * local-fonts/no-external-requests (AC-P1.5), state primitives on scaffolds
 * (AC-P1.10), themes + axe WCAG 2.2 AA + reduced motion (AC-P1.11), and the
 * committed visual baselines at the three 09 §14 breakpoints.
 */

const BREAKPOINTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// 04 §2 — the eleven Persian navigation entries.
const NAV_LABELS = [
  "نمای کلی", "پروژه‌ها", "برنامه‌ها", "لنزهای هفته", "درخواست‌ها", "تقویم",
  "اجراها", "جریان‌های کاری", "رجیسترها", "تیم و دسترسی", "تنظیمات",
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
  test("renders all eleven 04 §2 navigation entries", async ({ page }) => {
    await page.goto("/studio");
    for (const label of NAV_LABELS) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("navigation is keyboard-operable with visible focus", async ({ page }) => {
    await page.goto("/studio");
    const link = page.getByRole("link", { name: "برنامه‌ها" });
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.outlineStyle}|${s.boxShadow}`;
    });
    expect(outline, "focused nav link must have a visible focus indicator").not.toBe("none|none");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/studio/programs");
  });

  test("route scaffolds and unknown routes resolve to the EmptyState primitive, never a 404", async ({ page }) => {
    await page.goto("/studio/registries");
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await page.goto("/studio/not/built/yet");
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  for (const bp of BREAKPOINTS) {
    test(`shell holds and snapshots at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/studio");
      await expect(page.getByText("دراپ او اس — ماژول استودیو")).toBeVisible();
      await expect(page).toHaveScreenshot(`studio-shell-${bp.name}.png`, { fullPage: false });
    });
  }
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
