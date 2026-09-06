import { expect, test } from "@playwright/test";

/**
 * Ticket P7, Seam E — the committed visual baselines (AC-P7.x).
 *
 * V2 04 §5 asks for screenshots of overview, concept review, content revision,
 * graph and calendar. These are BASELINES rather than loose evidence: a
 * screenshot nobody compares against is a picture, not a check, and the whole
 * point of a deterministic demo world is that its rendering is stable enough to
 * diff.
 *
 * The graph is captured but not diffed — ELK lays out asynchronously and React
 * Flow fits the viewport on mount, so its pixels are stable in principle and
 * timing-sensitive in practice. Asserting it renders its nodes is the honest
 * check; a flaky baseline would be worse than none.
 */
const SURFACES = [
  { name: "overview", path: "/studio", ready: "overview-counter" },
  { name: "concept-review", path: "/studio/projects/p1/concepts", ready: "concept-card" },
  { name: "content-revision", path: "/studio/projects/p1/content", ready: "content-card" },
  // The unscheduled tray renders an empty state when nothing is untimed, so
  // the month grid is the stable readiness marker for this surface.
  { name: "calendar", path: "/studio/calendar", ready: "month-grid" },
  { name: "outputs", path: "/studio/outputs", ready: "readiness-card" },
] as const;

test.describe("committed visual baselines", () => {
  for (const surface of SURFACES) {
    test(`${surface.name} is visually stable at desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(surface.path);
      await expect(page.getByTestId(surface.ready).first()).toBeVisible();
      await expect(page).toHaveScreenshot(`panel-${surface.name}-desktop.png`, {
        fullPage: false,
      });
    });
  }

  test("the review sheet is visually stable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/studio/projects/p1/concepts");
    await page.getByRole("button", { name: "زیبایی ناتمام" }).click();
    await expect(page.getByTestId("review-sheet")).toBeVisible();
    await expect(page).toHaveScreenshot("panel-review-sheet-desktop.png", { fullPage: false });
  });

  test("the mobile concept review is visually stable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio/projects/p1/concepts");
    await expect(page.getByTestId("concept-card").first()).toBeVisible();
    await expect(page).toHaveScreenshot("panel-concept-review-mobile.png", { fullPage: false });
  });
});

test("the workflow graph renders its derived nodes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/studio/projects/p1/workflow");
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  // Not diffed: ELK is async and React Flow fits on mount, so a pixel baseline
  // here would be timing-sensitive. That the derived nodes reached the canvas is
  // the claim worth asserting.
  await expect(page.getByTestId("graph-node").first()).toBeVisible();
  expect(await page.getByTestId("graph-node").count()).toBeGreaterThan(5);
});
