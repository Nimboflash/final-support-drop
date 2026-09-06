import { expect, test } from "@playwright/test";

/**
 * Ticket P5, Seam E — the workflow graph (AC-P5.1, AC-P5.10, AC-P5.11).
 *
 * The rules asserted here are the ones a canvas makes easy to break: that the
 * graph is never the only way to act, that nothing is editable, and that review
 * shortcuts are visible-but-disabled rather than quietly wired or quietly gone.
 */
const WORKFLOW = "/studio/projects/p1/workflow";

test.describe("execution inspection is the default (AC-P5.1)", () => {
  test("opens in execution mode with no edit affordance", async ({ page }) => {
    await page.goto(WORKFLOW);
    await expect(page.getByRole("tab", { name: "بازرسی اجرا" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Template authoring is deferred: nothing may add, delete or publish a node.
    for (const forbidden of ["افزودن گره", "انتشار", "حذف گره", "کتابخانهٔ گره"]) {
      await expect(page.getByText(forbidden)).toHaveCount(0);
    }
  });

  test("definition inspection is reachable as the secondary mode", async ({ page }) => {
    await page.goto(WORKFLOW);
    await page.getByRole("tab", { name: "بازرسی تعریف" }).click();
    await expect(page.getByText("ویرایش الگو در این نسخه انجام نمی‌شود")).toBeVisible();
  });
});

test.describe("the accessible stage list is equivalent (AC-P5.10)", () => {
  test("renders the same nodes as the canvas, from the same model", async ({ page }) => {
    await page.goto(WORKFLOW);
    await expect(page.getByTestId("graph-canvas")).toBeVisible();
    const canvasNodes = await page.getByTestId("graph-node").count();
    const listItems = await page.getByTestId("stage-list-item").count();
    // One derivation, two renderers — the counts cannot disagree.
    expect(listItems).toBe(canvasNodes);
    expect(listItems).toBeGreaterThan(0);
  });

  test("every stage carries a text status, never colour alone (AC-P5.8)", async ({ page }) => {
    await page.goto(WORKFLOW);
    const items = page.getByTestId("stage-list-item");
    for (let index = 0; index < (await items.count()); index += 1) {
      const text = await items.nth(index).innerText();
      expect(text).toMatch(/کامل|در حال اجرا|در انتظار بررسی|متوقف|ردشده|هنوز شروع نشده/);
    }
  });

  test("the whole tab is operable by keyboard alone", async ({ page }) => {
    await page.goto(WORKFLOW);
    const first = page.getByTestId("stage-list-item").first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    // Selecting from the list opens the inspector — no pointer, no canvas drag.
    await expect(page.getByTestId("node-inspector")).toBeVisible();
  });
});

test.describe("review shortcuts and machine identity", () => {
  test("review shortcuts call the same approval path as the card (AC-P5.11, P6)", async ({ page }) => {
    await page.goto(WORKFLOW);
    await page
      .getByTestId("stage-list-item")
      .filter({ hasText: "بررسی کانسپت" })
      .first()
      .click();
    const shortcut = page.getByTestId("graph-review-shortcut");
    await expect(shortcut).toBeVisible();
    // P5 rendered these disabled; P6 wired them to the SAME control the card and
    // the queue mount, which is what makes journey A14's "one audit event from
    // any door" hold by construction rather than by convention.
    await expect(shortcut.getByTestId("approve-action")).toBeEnabled();
    await expect(page.getByText("همان مسیر تأیید کارت و صف بررسی")).toBeVisible();
  });

  test("no machine row appears when the definition supplies no machine number (AC-P5.3)", async ({ page }) => {
    await page.goto(WORKFLOW);
    await page.getByTestId("stage-list-item").first().click();
    await expect(page.getByTestId("node-inspector")).toBeVisible();
    // Absent rather than guessed from position (ADR-0019 D18).
    await expect(page.getByTestId("machine-row")).toHaveCount(0);
  });

  test("a rejected branch ends visibly (AC-P5.5)", async ({ page }) => {
    await page.goto(WORKFLOW);
    await expect(
      page.getByTestId("stage-list-item").filter({ hasText: "پایان شاخه" }).first(),
    ).toBeVisible();
  });
});

test("the graph makes no outbound request", async ({ page, baseURL }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL!) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      external.push(url);
    }
  });
  await page.goto(WORKFLOW, { waitUntil: "networkidle" });
  // React Flow's stylesheet is bundled, never fetched (00 §4; ADR-0016).
  expect(external, `external requests: ${external.join(", ")}`).toHaveLength(0);
});
