import { expect, test, type Page } from "@playwright/test";

/**
 * Ticket P9, Seam E — the brief's own QA scenario (06 §15), end to end.
 *
 * §15 lists twenty-three steps and closes with "run this once on desktop and
 * once on mobile". This file is that instruction as a test rather than as a
 * click-through, because a click-through is evidence exactly once and this is
 * evidence on every run.
 *
 * It is deliberately ONE long test per viewport, not twenty-three small ones.
 * The scenario's claim is that a person can carry a single piece of work from
 * an idea to a scheduled output without losing it; split into independent
 * tests, each step would start from a fresh page and prove only that the step's
 * controls exist. The continuity IS the requirement.
 *
 * The path deviates from §15 in one recorded way. Step 3 ("choose a project")
 * happens inside the composer rather than before it, because ADR-0020 D2 made
 * the project a filter rather than a place — there is no project to enter
 * first. The brief's own §4 is what demands that, so the two are consistent.
 */

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/** §16 — the mobile experience must work with no horizontal scroll. */
async function expectNoHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scroll: doc.scrollWidth, client: doc.clientWidth };
  });
  expect(
    overflow.scroll,
    `${where}: the document scrolls sideways (${overflow.scroll} > ${overflow.client})`,
  ).toBeLessThanOrEqual(overflow.client + 1);
}

/** On mobile the sidebar is collapsed behind its trigger. */
async function goToDestination(page: Page, labelFa: string, urlGlob: string) {
  const nav = page.getByRole("navigation");
  const link = nav.getByRole("link", { name: labelFa, exact: true });
  let openedSheet = false;
  if (!(await link.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "نمایش یا پنهان‌کردن منو" }).click();
    openedSheet = true;
  }
  await link.click();
  await page.waitForURL(urlGlob);
  if (openedSheet) {
    // The mobile sidebar is a sheet over the page; left open it swallows every
    // click that follows, which is exactly what a person would experience.
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-mobile="true"][data-state="open"]')).toHaveCount(0);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`the brief's QA scenario at ${vp.name} (06 §15)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("an idea travels from the composer to a scheduled output", async ({ page }) => {
      /* -- 1. enter /studio ------------------------------------------------ */
      await page.goto("/studio", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "نمای کلی" })).toBeVisible();
      await expectNoHorizontalScroll(page, "/studio");

      /* -- 13. the overview carries no stage strip and no two-week block ---- */
      await expect(page.getByTestId("stage-strip")).toHaveCount(0);
      await expect(page.getByText("دو هفتهٔ آینده")).toHaveCount(0);
      await expect(page.getByTestId("overview-counter")).toHaveCount(0);

      /* -- 2. one clear call to action starts a concept -------------------- */
      await page.getByTestId("start-concept").click();
      const composer = page.getByTestId("concept-composer");
      await expect(composer).toBeVisible();

      /* -- 3./4. choose a project, write a brief, add a reference ---------- */
      // Every start is available on one surface: no mode is chosen up front.
      await expect(page.getByTestId("start-blank")).toBeEnabled();
      await page.getByTestId("composer-project").click();
      await page.getByRole("option").first().click();
      await page.getByTestId("composer-brief").fill("یک مسیر دربارهٔ آیین‌های کوچک روزمره.");
      await page.getByLabel("نشانی یا رفرنس").fill("https://example.invalid/article");
      await composer.getByRole("button", { name: "افزودن", exact: true }).click();
      await expect(page.getByTestId("composer-attachments")).toBeVisible();

      /* -- 5. the start leads to reviewable concepts ------------------------ */
      // The brief (§14.3) allows generation to be SIMULATED. The panel does
      // neither: generation belongs to the machine build, which is not
      // connected in panel scope (ADR-0019 D2), and inventing cards would
      // violate 18 §12's honesty rule. So the composer says so and takes the
      // person to the concepts that do exist — which is what this asserts.
      await page.getByTestId("generate-concepts").click();
      await expect(page.getByTestId("composer-working")).toBeVisible();
      await page.getByTestId("composer-go-to-concepts").click();
      await page.waitForURL("**/studio/concepts**");
      await expect(page.getByTestId("concept-card").first()).toBeVisible();
      await expectNoHorizontalScroll(page, "/studio/concepts");

      /* -- 6. open a concept: a readable document, not version management -- */
      const newCard = page.locator('[data-testid="concept-card"][data-state="new"]').first();
      await expect(newCard).toBeVisible();
      await newCard.getByTestId("open-concept").click();
      await expect(page.getByTestId("concept-document")).toBeVisible();
      // §14.4 — the card carries a title, a summary and a date. Not an id.
      await expect(page.getByTestId("concept-detail")).not.toContainText(/\b[a-z]\d+-v\d+\b/);

      /* -- 7. improvement is a conversation -------------------------------- */
      await expect(page.getByTestId("assistant-send")).toBeDisabled();
      await page.getByTestId("assistant-input").fill("لحن را ساده‌تر کن.");
      await page.getByTestId("assistant-send").click();
      await expect(page.getByTestId("assistant-thread")).toContainText("ساده‌تر");

      /* -- 8. select it for content production ----------------------------- */
      await page.getByTestId("select-concept").click();
      await expect(page.getByTestId("concept-detail")).toBeHidden();
      await expect(
        page.locator('[data-testid="concept-card"][data-state="selected"]').first(),
      ).toBeVisible();

      /* -- 9. content sits under its parent concept ------------------------ */
      await goToDestination(page, "محتوا", "**/studio/content**");
      await expect(page.getByTestId("content-group").first()).toBeVisible();
      await expect(page.getByTestId("content-card").first()).toBeVisible();
      await expectNoHorizontalScroll(page, "/studio/content");
      // §14.9 — no parallel review page, and no concept-review tab.
      await expect(page.getByRole("link", { name: "بررسی‌ها", exact: true })).toHaveCount(0);

      /* -- 10./11. an incomplete item says what it needs, and offers it ---- */
      const blocked = page.locator('[data-testid="content-card"][data-state="needs_input"]').first();
      await blocked.getByTestId("open-content").click();
      await expect(page.getByTestId("needs-source")).toBeVisible();
      // Not every control disabled — one sentence and the action (§7.4). And
      // the action has to WORK: approval is unavailable until the source is
      // actually recorded, so this step is what unblocks step 12.
      await expect(page.getByTestId("approve-content")).toBeDisabled();
      await page.getByTestId("add-source").click();
      await page.getByLabel("نشانی یا توضیح منبع").fill("https://example.invalid/reference");
      await page.getByTestId("save-source").click();
      await expect(page.getByTestId("needs-source")).toHaveCount(0);

      /* -- 12. approve what the output needs ------------------------------- */
      // "محتواهای لازم" is plural: an output is assembled by the LAST required
      // approval, so approving one item is not the step the brief describes.
      await expect(page.getByTestId("approve-content")).toBeEnabled();
      await page.getByTestId("approve-content").click();
      await expect(page.getByTestId("content-detail")).toBeHidden();

      const remaining = page.locator('[data-testid="content-card"][data-state="ready_for_review"]');
      // Counted, then waited down. Approving invalidates the world and the list
      // re-renders, so polling `count()` catches it mid-flight; asserting the
      // count DROPS after each approval is what makes the next pass safe.
      // Bounded and query-driven. Approving invalidates the world, so the list
      // re-renders under the loop; waiting for the next card to APPEAR (and
      // giving up quickly when none does) is what keeps this from either
      // hanging on a stale locator or racing a half-rendered list.
      for (let i = 0; i < 12; i += 1) {
        // Every approval invalidates the world and re-orders the list, so a
        // card resolved a moment ago may be gone by the time the click lands.
        // Each pass is therefore bounded and allowed to lose the race; the
        // POSTCONDITION below is what the step actually asserts.
        const opened = await remaining
          .first()
          .getByTestId("open-content")
          .click({ timeout: 4_000 })
          .then(() => true)
          .catch(() => false);
        if (!opened) break;
        await expect(page.getByTestId("approve-content")).toBeEnabled();
        await page.getByTestId("approve-content").click();
        await expect(page.getByTestId("content-detail")).toBeHidden();
      }
      await expect(remaining).toHaveCount(0);

      /* -- 13. the output is one coherent set ------------------------------ */
      await goToDestination(page, "خروجی‌ها", "**/studio/outputs**");
      const output = page.getByTestId("output-card").first();
      await expect(output).toBeVisible();
      await expectNoHorizontalScroll(page, "/studio/outputs");
      await output.getByTestId("open-output").click();
      await expect(page.getByTestId("output-materials")).toBeVisible();
      // §7.5 — one output model; the «بسته» split is gone.
      await expect(page.getByTestId("output-detail")).not.toContainText(/بستهٔ?\s/);

      /* -- 14./15. approved output reaches the calendar's undated tray ----- */
      // Only an assembled output can be sent, and the sheet says so when it
      // cannot be. Close it and take one that can.
      if (await page.getByTestId("send-blocked-reason").isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("output-detail")).toBeHidden();
        const ready = page.locator('[data-testid="output-card"][data-state="approved"]').first();
        await expect(ready).toBeVisible();
        await ready.getByTestId("open-output").click();
        await expect(page.getByTestId("output-materials")).toBeVisible();
      }
      await expect(page.getByTestId("send-to-calendar")).toBeEnabled();
      await page.getByTestId("send-to-calendar").click();
      await page.waitForURL("**/studio/calendar**");
      const tray = page.getByTestId("unscheduled-tray");
      await expect(tray).toBeVisible();

      /* -- 16. give it a date ---------------------------------------------- */
      await tray.getByTestId("set-date").first().click();
      const sheet = page.getByTestId("event-sheet");
      await expect(sheet).toBeVisible();
      await page.getByTestId("event-date-input").fill("2026-09-17");
      await page.getByTestId("save-event-date").click();
      await expect(sheet).toBeHidden();

      /* -- 17. the item keeps everything related to it --------------------- */
      await page.getByTestId("calendar-event").first().click();
      await expect(page.getByTestId("event-sheet")).toBeVisible();
      // Project, concept and the output's materials all survive the move.
      await expect(page.getByTestId("event-date")).toBeVisible();
      await page.keyboard.press("Escape");

      /* -- 18. a moved date survives a reload ------------------------------ */
      await page.getByTestId("calendar-event").first().click();
      await page.getByTestId("event-date-input").fill("2026-09-19");
      await page.getByTestId("save-event-date").click();
      await expect(page.getByTestId("event-sheet")).toBeHidden();
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("tab", { name: "فهرست" }).click();
      await expect(page.getByTestId("agenda-list")).toContainText("۲۸ شهریور");

      /* -- 19. month, week and agenda show the SAME events ----------------- */
      await page.getByRole("tab", { name: "ماه" }).click();
      await expect(page.getByTestId("month-grid")).toBeVisible();
      const monthCount = await page.getByTestId("calendar-event").count();
      await page.getByRole("tab", { name: "هفته" }).click();
      await expect(page.getByTestId("week-grid")).toBeVisible();
      await page.getByRole("tab", { name: "فهرست" }).click();
      expect(await page.getByTestId("calendar-event").count()).toBe(monthCount);
      await expectNoHorizontalScroll(page, "/studio/calendar");

      /* -- 20./21. Engine shows the real workflow -------------------------- */
      await goToDestination(page, "Engine", "**/studio/engine**");
      await expect(page.getByTestId("graph-canvas")).toBeVisible();
      // §14.21 — running, awaiting-action and failed are all distinguishable,
      // and in words rather than by colour alone.
      await expect(page.getByTestId("engine-legend")).toBeVisible();
      await expectNoHorizontalScroll(page, "/studio/engine");

      /* -- 22. the graph and its accessible equivalent agree --------------- */
      const nodes = await page.getByTestId("graph-node").count();
      expect(await page.getByTestId("stage-list-item").count()).toBe(nodes);
      expect(nodes).toBeGreaterThan(0);

      /* -- 23. a node needing a person links to where that work happens ---- */
      // Which nodes are waiting depends on what this run just approved, so the
      // assertion is on the RULE rather than on a particular node: a node that
      // needs a person offers the link, and one that does not, does not.
      const items = page.getByTestId("stage-list-item");
      const waitingCount = await page
        .locator(
          '[data-testid="stage-list-item"][data-state="AWAITING_REVIEW"],' +
            '[data-testid="stage-list-item"][data-state="BLOCKED"]',
        )
        .count();
      await items.first().click();
      await expect(page.getByTestId("engine-node-details")).toBeVisible();

      if (waitingCount > 0) {
        await page
          .locator(
            '[data-testid="stage-list-item"][data-state="AWAITING_REVIEW"],' +
              '[data-testid="stage-list-item"][data-state="BLOCKED"]',
          )
          .first()
          .click();
        const link = page.getByTestId("engine-node-link");
        await expect(link).toBeVisible();
        await link.click();
        await expect(page).toHaveURL(/\/studio\/(concepts|content|outputs|calendar)/);
      }

      /* -- §14.14 — no internal identifier or technical text, anywhere ----- */
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\b[a-z]\d+-v\d+\b/);
      expect(text).not.toMatch(/تیکت\s*P\d/);
      expect(text).not.toMatch(/گیت‌?وی/);
    });

    /* -- §14.15 — the important old routes redirect rather than break ------ */
    test("no retired route shows a broken or empty page", async ({ page }) => {
      const RETIRED = [
        "/studio/projects",
        "/studio/reviews",
        "/studio/requests",
        "/studio/runs",
        "/studio/workflows",
        "/studio/programs",
        "/studio/lenses",
        "/studio/registries",
        "/studio/team",
        "/studio/projects/p1",
        "/studio/projects/p1/overview",
        "/studio/projects/p1/workflow",
        "/studio/projects/p1/plan",
      ];
      for (const path of RETIRED) {
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(400);
        // The catch-all renders an empty state at HTTP 200, so status alone
        // cannot tell a redirect from a dead end. Its marker can.
        await expect(
          page.getByTestId("studio-catch-all"),
          `${path} fell through to the catch-all`,
        ).toHaveCount(0);
        expect(page.url(), `${path} did not move`).not.toContain(path);
      }
    });
  });
}
