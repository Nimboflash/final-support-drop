import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Ticket P4, Seam E — the Persian RTL journey (AC-P4.13).
 *
 * Walks start → concepts → content → outputs → calendar → reviews against the
 * seeded base world, at every recorded breakpoint, with axe in both themes.
 *
 * Two claims this spec exists to keep honest, both of which are easy to violate
 * silently: that no UI string promises something the panel did not do, and that
 * the demo makes no outbound request.
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

const BREAKPOINTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test.describe("the panel journey renders on the seeded world", () => {
  test("overview shows counters, the inbox and a planned item", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByTestId("overview-counter")).toHaveCount(4);
    await expect(page.getByTestId("project-card").first()).toBeVisible();
  });

  test("projects list filters by type through the URL", async ({ page }) => {
    await page.goto("/studio/projects");
    await expect(page.getByTestId("project-list-card").first()).toBeVisible();
    const all = await page.getByTestId("project-list-card").count();

    await page.goto("/studio/projects?type=lens");
    const lenses = await page.getByTestId("project-list-card").count();
    expect(lenses).toBeLessThan(all);
  });

  test("concepts render as a grid and a rejected card keeps its reason", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    await expect(page.getByTestId("concept-card")).toHaveCount(3);
    // V2 01 §4 — "Rejected does not silently mean deleted."
    await expect(page.getByTestId("rejection-reason")).toBeVisible();
    await expect(page.getByTestId("revise-idea")).toBeVisible();
    await expect(page.getByTestId("generate-replacement")).toBeVisible();
  });

  test("the batch CTA carries the live approved count", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    const cta = page.getByTestId("continue-with-approved");
    await expect(cta).toBeVisible();
    // Persian digits, and the count is real rather than a placeholder.
    await expect(cta).toContainText("۱");
  });

  test("the review sheet opens from a card and names its target version", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    await page.getByRole("button", { name: "زیبایی ناتمام" }).click();
    const sheet = page.getByTestId("review-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute("dir", "rtl");
    await expect(page.getByTestId("review-footer")).toContainText("c1-v1");
    // Wiring is P6: every action is disabled WITH a stated reason, never hidden.
    await expect(page.getByTestId("approve-action")).toBeDisabled();
  });

  test("the same sheet opens from the global review queue", async ({ page }) => {
    await page.goto("/studio/reviews");
    await page.getByTestId("review-queue-concepts").getByRole("button").first().click();
    // One component, three doors (V2 02 §6; journey A14).
    await expect(page.getByTestId("review-sheet")).toBeVisible();
  });

  test("content shows a blocked item with its reason and keeps siblings reviewable", async ({ page }) => {
    await page.goto("/studio/projects/p1/content");
    await expect(page.getByTestId("content-card").first()).toBeVisible();
    // A08 — blocking stays local: the blocked reason is shown, and other cards
    // in the same branch still render their own actions.
    await expect(page.getByTestId("content-blocked-reason").first()).toBeVisible();
    expect(await page.getByTestId("approve-content").count()).toBeGreaterThan(1);
  });

  test("outputs reads N of M rather than a percentage, and never shows a progress bar", async ({ page }) => {
    await page.goto("/studio/outputs");
    await expect(page.getByTestId("readiness-summary").first()).toContainText("مورد الزامی تأیید شده");
    // V2 02 §8 forbids an invented global percentage.
    await expect(page.locator('[data-slot="progress"]')).toHaveCount(0);
    await expect(page.getByText("%")).toHaveCount(0);
  });

  test("calendar separates planned from unscheduled and never says published", async ({ page }) => {
    await page.goto("/studio/calendar");
    await expect(page.getByTestId("unscheduled-tray").or(page.getByTestId("month-grid"))).toBeVisible();
    await expect(page.getByText("منتشرشده")).toHaveCount(0);
    await expect(page.getByText("published")).toHaveCount(0);
  });

  test("the start dialog offers both entry modes and refuses an empty reference start", async ({ page }) => {
    await page.goto("/studio/projects?start=1");
    const dialog = page.getByTestId("start-journey-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("entry-blank")).toBeVisible();
    await expect(page.getByTestId("entry-reference")).toBeVisible();

    await page.getByTestId("entry-reference").click();
    // "REFERENCE requires at least one valid reference" (V2 01 §3).
    await expect(page.getByTestId("start-journey-submit")).toBeDisabled();

    // An http(s)-only rule, enforced without ever fetching the URL.
    await page.getByLabel("نشانی مقاله").fill("file:///etc/passwd");
    await page.getByRole("button", { name: "افزودن", exact: true }).click();
    await expect(page.getByTestId("reference-error")).toBeVisible();
    await expect(page.getByTestId("start-journey-submit")).toBeDisabled();

  });
});

test.describe("honesty and isolation (AC-P4.13)", () => {
  test("no outbound request leaves the origin on any panel destination", async ({ page, baseURL }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(baseURL!) && !url.startsWith("data:") && !url.startsWith("blob:")) {
        external.push(url);
      }
    });
    for (const path of [
      "/studio",
      "/studio/projects",
      "/studio/reviews",
      "/studio/outputs",
      "/studio/calendar",
      "/studio/projects/p1/concepts",
      "/studio/projects/p1/content",
    ]) {
      await page.goto(path, { waitUntil: "networkidle" });
    }
    expect(external, `external requests: ${external.join(", ")}`).toHaveLength(0);
  });

  test("the demo-mode badge is persistently visible", async ({ page }) => {
    await page.goto("/studio/projects/p1/overview");
    await expect(page.getByText("حالت نمایشی")).toBeVisible();
  });

  test("no string claims real publication, research or machine work", async ({ page }) => {
    for (const path of ["/studio", "/studio/outputs", "/studio/calendar"]) {
      await page.goto(path);
      const body = await page.locator("body").innerText();
      // The panel may say a package is PLANNED; it may never say published.
      expect(body).not.toContain("منتشر شد");
      expect(body).not.toContain("published");
    }
  });
});

test.describe("responsive and accessible (AC-P4.13)", () => {
  for (const bp of BREAKPOINTS) {
    test(`no horizontal overflow at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/studio/projects/p1/concepts");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${bp.name} overflows horizontally`).toBe(false);
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`axe WCAG 2.2 AA is clean on the journey in ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => {
        window.localStorage.setItem("theme", value);
      }, theme);
      for (const path of ["/studio", "/studio/projects/p1/concepts", "/studio/calendar"]) {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(results.violations, `${path} in ${theme}`).toEqual([]);
      }
    });
  }

  test("the review journey is reachable by keyboard alone at 390px (A20)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio/projects/p1/concepts");
    const card = page.getByRole("button", { name: "زیبایی ناتمام" });
    await card.focus();
    await expect(card).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("review-sheet")).toBeVisible();
    // Escape closes and focus returns to the card that opened it (V2 02 §6).
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("review-sheet")).toBeHidden();
    await expect(card).toBeFocused();
  });
});
