import { expect, test } from "@playwright/test";

/**
 * A full interaction and responsive audit across every surface.
 *
 * Written after a report that "click is not working and it is not responsive".
 * The existing specs each check one surface deeply; this one checks EVERY
 * surface shallowly but exhaustively, which is where a whole-app regression
 * hides — a spec that never visits `/studio/settings` cannot notice that it
 * overflows.
 */
const SURFACES = [
  "/studio",
  "/studio/projects",
  "/studio/reviews",
  "/studio/outputs",
  "/studio/calendar",
  "/studio/settings",
  "/studio/projects/p1/overview",
  "/studio/projects/p1/concepts",
  "/studio/projects/p1/content",
  "/studio/projects/p1/outputs",
  "/studio/projects/p1/plan",
  "/studio/projects/p1/workflow",
  "/studio/projects/p1/activity",
] as const;

const WIDTHS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "compact", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

test.describe("no surface scrolls sideways at any breakpoint", () => {
  for (const bp of WIDTHS) {
    for (const path of SURFACES) {
      test(`${path} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(path, { waitUntil: "networkidle" });

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          // Report the widest offending element, not just the fact of overflow:
          // "something overflows" is not actionable, "this node is 104px past
          // the edge" is.
          const limit = doc.clientWidth + 1;
          let worst: { tag: string; cls: string; right: number } | null = null;
          for (const el of document.querySelectorAll("*")) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0) continue;
            // An intentional scroll container is allowed to be wider than its
            // box; what is forbidden is the DOCUMENT scrolling.
            const style = getComputedStyle(el);
            if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
            if (rect.right > limit && (worst === null || rect.right > worst.right)) {
              worst = {
                tag: el.tagName,
                cls: String(el.className).slice(0, 60),
                right: Math.round(rect.right),
              };
            }
          }
          return {
            scrolls: doc.scrollWidth > doc.clientWidth + 1,
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            worst,
          };
        });

        expect(
          overflow.scrolls,
          `${path} @ ${bp.name}: document scrolls sideways ` +
            `(${String(overflow.scrollWidth)} > ${String(overflow.clientWidth)}); ` +
            `widest offender: ${JSON.stringify(overflow.worst)}`,
        ).toBe(false);
      });
    }
  }
});

test.describe("every surface is interactive after load", () => {
  for (const path of SURFACES) {
    test(`${path} hydrates and has live controls`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      const audit = await page.evaluate(() => {
        const controls = [
          ...document.querySelectorAll<HTMLElement>("a, button, [role=button], input, textarea"),
        ];
        const dead = controls.filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false; // not rendered, not dead
          const style = getComputedStyle(el);
          // A control that is visible but cannot receive a pointer is the exact
          // "click does nothing" symptom.
          return style.pointerEvents === "none" && !(el as HTMLButtonElement).disabled;
        });
        return {
          total: controls.length,
          dead: dead.map((el) => ({
            tag: el.tagName,
            text: (el.textContent ?? "").trim().slice(0, 30),
          })),
        };
      });

      expect(audit.total, `${path} rendered no controls at all`).toBeGreaterThan(0);
      expect(
        audit.dead,
        `${path}: controls are visible but cannot be clicked`,
      ).toEqual([]);
    });
  }
});

test.describe("the sidebar navigates from every surface", () => {
  for (const path of ["/studio", "/studio/calendar", "/studio/projects/p1/workflow"]) {
    test(`nav works from ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: "خروجی‌ها" }).click();
      await page.waitForURL("**/studio/outputs");
      await expect(page.getByRole("heading", { name: "خروجی‌ها" })).toBeVisible();
    });
  }

  test("the sidebar is reachable on mobile through its trigger", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "networkidle" });
    // On mobile the sidebar collapses; if the trigger does not open it, every
    // destination becomes unreachable — which reads as "nothing is clickable".
    await page.getByRole("button", { name: "باز و بسته کردن منو" }).click();
    await expect(page.getByRole("link", { name: "تقویم و برنامه" })).toBeVisible();
  });
});

test.describe("primary actions actually change state", () => {
  test("approving a card moves its badge and the batch counter", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts", { waitUntil: "networkidle" });
    const inReview = page.locator('[data-testid="concept-card"][data-status="IN_REVIEW"]').first();
    await expect(inReview).toBeVisible();

    await inReview.getByTestId("approve-action").click();

    // The card and the derived counter must move together (journey A14).
    await expect(
      page.locator('[data-testid="concept-card"][data-status="APPROVED"]'),
    ).toHaveCount(2);
    await expect(page.getByTestId("continue-with-approved")).toContainText("۲");
  });

  test("the review sheet opens and closes", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "زیبایی ناتمام" }).click();
    await expect(page.getByTestId("review-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("review-sheet")).toBeHidden();
  });

  test("filters change what the grid shows", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts", { waitUntil: "networkidle" });
    const all = await page.getByTestId("concept-card").count();
    await page.getByRole("button", { name: "ردشده", exact: true }).click();
    const rejected = await page.getByTestId("concept-card").count();
    expect(rejected).toBeLessThan(all);
    expect(rejected).toBeGreaterThan(0);
  });

  test("project tabs navigate", async ({ page }) => {
    await page.goto("/studio/projects/p1/overview", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "محتوا و تحقیق", exact: true }).click();
    await page.waitForURL("**/studio/projects/p1/content");
    await expect(page.getByTestId("content-card").first()).toBeVisible();
  });

  test("a scenario can actually be selected from settings", async ({ page }) => {
    await page.goto("/studio/settings", { waitUntil: "networkidle" });
    // The bug this replaces: the list rendered 24 rows with zero clickable
    // elements and a note promising the feature "in ticket P6" — which had
    // already shipped. A list you cannot act on reads as a broken click.
    const options = page.getByTestId("scenario-option");
    expect(await options.count()).toBeGreaterThan(20);

    await page.getByTestId("scenario-option").filter({ hasText: "S05" }).first().click();
    await page.waitForURL("**/studio/settings?scenario=S05");
    await expect(page.getByTestId("active-scenario")).toContainText("S05");
  });

  test("the selected scenario actually changes the world", async ({ page }) => {
    // S01 clears every project-owned record, so the overview must be empty.
    await page.goto("/studio?scenario=S01", { waitUntil: "networkidle" });
    await expect(page.getByText("هنوز مسیری شروع نشده")).toBeVisible();

    // ...and the base world is not empty, so the difference is real.
    await page.goto("/studio", { waitUntil: "networkidle" });
    await expect(page.getByTestId("project-card").first()).toBeVisible();
  });

  test("the calendar view tabs switch", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "فهرست" }).click();
    await expect(page.getByTestId("agenda-list")).toBeVisible();
  });
});
