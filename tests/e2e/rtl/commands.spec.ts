import { expect, test } from "@playwright/test";

/**
 * Ticket P6, Seam E — commands through the UI (AC-P6.1, AC-P6.3, AC-P6.9).
 *
 * The point of running these in a browser rather than only at the adapter is
 * that the acceptance journeys are about what the REVIEWER experiences: that a
 * reason is genuinely required, that a rejection offers a route, and that a
 * download produces a file.
 */
test.describe("review commands reach the single write path", () => {
  test("approving a concept updates every view of it at once", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    const card = page.getByTestId("concept-card").filter({ hasText: "رد دست" });
    await expect(card).toBeVisible();

    await card.getByTestId("approve-action").click();
    // V2 01 §8 — a successful command updates every view of the same entity.
    await expect(card.getByTestId("review-status-badge")).toContainText("تأییدشده");
    // The batch CTA's count is derived from the same world, so it moves too.
    await expect(page.getByTestId("continue-with-approved")).toContainText("۲");
  });

  test("request changes requires a reason before it can be submitted", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    const card = page.getByTestId("concept-card").filter({ hasText: "رد دست" });
    await card.getByTestId("request-changes-action").click();

    const dialog = page.getByTestId("request-changes-dialog");
    await expect(dialog).toBeVisible();
    // V2 01 §4 — "Reason plus actionable feedback".
    await expect(page.getByTestId("submit-feedback")).toBeDisabled();

    await page.getByTestId("review-reason").fill("زاویهٔ روایی را مشخص‌تر کن.");
    await expect(page.getByTestId("submit-feedback")).toBeEnabled();
    await page.getByTestId("submit-feedback").click();
    await expect(dialog).toBeHidden();
  });

  test("rejecting offers reject-only, revise and replace", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    const card = page.getByTestId("concept-card").filter({ hasText: "رد دست" });
    await card.getByTestId("reject-action").click();

    await expect(page.getByTestId("reject-dialog")).toBeVisible();
    // Rejection never silently deletes; the user picks what happens next.
    await expect(page.getByTestId("reject-route")).toBeVisible();
    await expect(page.getByLabel("فقط رد شود")).toBeVisible();
    await expect(page.getByLabel(/بازنگری همین ایده/)).toBeVisible();
    await expect(page.getByLabel(/ساخت جایگزین/)).toBeVisible();
  });

  test("a rejected card keeps its reason and offers revise or replace", async ({ page }) => {
    await page.goto("/studio/projects/p1/concepts");
    const rejected = page.getByTestId("concept-card").filter({ hasText: "ردشده" }).first();
    await expect(rejected.getByTestId("rejection-reason")).toBeVisible();
    await expect(rejected.getByTestId("revise-idea")).toBeEnabled();
    await expect(rejected.getByTestId("generate-replacement")).toBeEnabled();
  });

  test("a blocked content item refuses approval WITH its reason", async ({ page }) => {
    await page.goto("/studio/projects/p1/content");
    const blocked = page
      .getByTestId("content-card")
      .filter({ has: page.getByTestId("content-blocked-reason") })
      .first();
    await expect(blocked).toBeVisible();
    // Explained, not removed — and its siblings stay actionable (journey A08).
    await expect(blocked.getByTestId("approve-action")).toBeDisabled();
    await expect(blocked.getByTestId("review-disabled-reason")).toBeVisible();
  });
});

test.describe("the package download is real (AC-P6.9)", () => {
  test("an explicit click produces a non-empty zip", async ({ page }) => {
    await page.goto("/studio/outputs");
    // Packages live on the second view; Contents is the default (V2 02 §8).
    await page.getByRole("tab", { name: "نسخه‌های بسته" }).click();
    const button = page.getByTestId("download-package").first();
    await expect(button).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await button.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/[.]zip$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(0);
    // A real ZIP local file header, not an empty placeholder (V2 01 §6).
    expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  });
});
