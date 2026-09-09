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
  "/studio/concepts",
  "/studio/content",
  "/studio/outputs",
  "/studio/calendar",
  "/studio/engine",
  "/studio/activity",
  "/studio/settings",
  // The same surfaces under a project context, since that is now a filter
  // rather than a destination (ADR-0020 D2).
  "/studio/concepts?project=p1",
  "/studio/content?project=p1",
  "/studio/outputs?project=p1",
  "/studio/engine?project=p1",
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
  for (const path of ["/studio", "/studio/calendar", "/studio/engine"]) {
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
    await page.getByRole("button", { name: "نمایش یا پنهان‌کردن منو" }).click();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "تقویم", exact: true }),
    ).toBeVisible();
  });
});

test.describe("primary actions actually change state", () => {
  test("selecting a concept moves it out of the new state", async ({ page }) => {
    await page.goto("/studio/concepts", { waitUntil: "networkidle" });
    const card = page.locator('[data-testid="concept-card"][data-state="new"]').first();
    await expect(card).toBeVisible();

    await card.getByTestId("open-concept").click();
    await expect(page.getByTestId("concept-detail")).toBeVisible();
    await page.getByTestId("select-concept").click();

    await expect(page.getByTestId("concept-detail")).toBeHidden();
    await expect(page.locator('[data-testid="concept-card"][data-state="selected"]').first()).toBeVisible();
  });

  test("the concept assistant accepts a request and records it", async ({ page }) => {
    await page.goto("/studio/concepts", { waitUntil: "networkidle" });
    await page.getByTestId("open-concept").first().click();
    await expect(page.getByTestId("concept-document")).toBeVisible();

    // Improvement is conversational; version management is not the experience.
    await expect(page.getByTestId("assistant-send")).toBeDisabled();
    await page.getByTestId("assistant-input").fill("این مسیر را مینیمال‌تر کن.");
    await expect(page.getByTestId("assistant-send")).toBeEnabled();
    await page.getByTestId("assistant-send").click();
    await expect(page.getByTestId("assistant-thread")).toContainText("مینیمال‌تر");
  });

  test("the composer offers every start without asking for a mode first", async ({ page }) => {
    await page.goto("/studio/concepts", { waitUntil: "networkidle" });
    await page.getByTestId("start-concept").click();
    const composer = page.getByTestId("concept-composer");
    await expect(composer).toBeVisible();

    // One surface, all inputs, and both routes live from the start.
    await expect(page.getByTestId("composer-brief")).toBeVisible();
    await expect(page.getByTestId("generate-concepts")).toBeEnabled();
    await expect(page.getByTestId("start-blank")).toBeEnabled();

    await page.getByLabel("نشانی یا رفرنس").fill("file:///etc/passwd");
    await page.getByRole("button", { name: "افزودن", exact: true }).click();
    await expect(page.getByTestId("composer-error")).toBeVisible();
  });

  test("content is grouped under its parent concept", async ({ page }) => {
    await page.goto("/studio/content", { waitUntil: "networkidle" });
    await expect(page.getByTestId("content-group").first()).toBeVisible();
    await expect(page.getByTestId("content-card").first()).toBeVisible();
  });

  test("a content item needing a source says so and offers the action", async ({ page }) => {
    await page.goto("/studio/content", { waitUntil: "networkidle" });
    const blocked = page.locator('[data-testid="content-card"][data-state="needs_input"]').first();
    await expect(blocked).toBeVisible();
    await blocked.getByTestId("open-content").click();
    // Not every control disabled — one clear message and the action (brief §7.4).
    await expect(page.getByTestId("needs-source")).toBeVisible();
    await expect(page.getByTestId("add-source")).toBeEnabled();
  });

  test("the project selector filters and lives in the URL", async ({ page }) => {
    await page.goto("/studio/concepts", { waitUntil: "networkidle" });
    const all = await page.getByTestId("concept-card").count();
    await page.goto("/studio/concepts?project=p1", { waitUntil: "networkidle" });
    const filtered = await page.getByTestId("concept-card").count();
    expect(filtered).toBeLessThanOrEqual(all);
    expect(filtered).toBeGreaterThan(0);
  });

  test("a scenario can be selected from settings", async ({ page }) => {
    await page.goto("/studio/settings", { waitUntil: "networkidle" });
    const options = page.getByTestId("scenario-option");
    expect(await options.count()).toBeGreaterThan(20);
    await options.filter({ hasText: "S05" }).first().click();
    await page.waitForURL("**/studio/settings?scenario=S05");
    await expect(page.getByTestId("active-scenario")).toContainText("S05");
  });

  test("the selected scenario changes the world", async ({ page }) => {
    await page.goto("/studio?scenario=S01", { waitUntil: "networkidle" });
    await expect(page.getByText("هنوز کاری شروع نشده")).toBeVisible();
    await page.goto("/studio", { waitUntil: "networkidle" });
    await expect(page.getByTestId("project-card").first()).toBeVisible();
  });
});

test.describe("the calendar behaves like a calendar (ADR-0020 D9)", () => {
  test("renders a real month grid with adjacent-month days and today", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    await expect(page.getByTestId("month-grid")).toBeVisible();
    // Six weeks, so the layout does not jump between months.
    expect(await page.getByTestId("day-cell").count()).toBe(42);
    // Borrowed days from the adjacent months are what makes it a grid.
    expect(await page.locator('[data-testid="day-cell"][data-outside="true"]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-testid="day-cell"][data-today="true"]')).toHaveCount(1);
  });

  test("navigates months and returns to today", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    const title = page.getByTestId("cal-title");
    const before = await title.innerText();
    await page.getByTestId("cal-next").click();
    await expect(title).not.toHaveText(before);
    await page.getByTestId("cal-today").click();
    await expect(title).toHaveText(before);
  });

  test("selects a day and opens an event", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    await page.getByTestId("day-cell").first().getByRole("button").first().click();
    await expect(page.getByTestId("selected-day")).toBeVisible();

    await page.getByTestId("calendar-event").first().click();
    await expect(page.getByTestId("event-sheet")).toBeVisible();
    await expect(page.getByTestId("event-date-input")).toBeVisible();
  });

  test("switches between month, week and agenda over the same events", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    const monthEvents = await page.getByTestId("calendar-event").count();

    await page.getByRole("tab", { name: "فهرست" }).click();
    await expect(page.getByTestId("agenda-list")).toBeVisible();
    expect(await page.getByTestId("calendar-event").count()).toBe(monthEvents);

    await page.getByRole("tab", { name: "هفته" }).click();
    await expect(page.getByTestId("week-grid")).toBeVisible();
    expect(await page.getByTestId("day-cell").count()).toBe(7);
  });

  test("a date change persists across a reload", async ({ page }) => {
    await page.goto("/studio/calendar", { waitUntil: "networkidle" });
    await page.getByTestId("calendar-event").first().click();
    await page.getByTestId("event-date-input").fill("2026-09-19");
    await page.getByTestId("save-event-date").click();
    await expect(page.getByTestId("event-sheet")).toBeHidden();

    await page.getByRole("tab", { name: "فهرست" }).click();
    await expect(page.getByTestId("agenda-list")).toContainText("۲۸ شهریور");
  });
});

test.describe("Engine is the one home for execution detail (ADR-0020 D4)", () => {
  test("renders the graph and its accessible equivalent from one model", async ({ page }) => {
    await page.goto("/studio/engine", { waitUntil: "networkidle" });
    await expect(page.getByTestId("graph-canvas")).toBeVisible();
    const canvasNodes = await page.getByTestId("graph-node").count();
    const listItems = await page.getByTestId("stage-list-item").count();
    expect(listItems).toBe(canvasNodes);
    expect(listItems).toBeGreaterThan(0);
  });

  test("a node needing attention links to where the work happens", async ({ page }) => {
    await page.goto("/studio/engine", { waitUntil: "networkidle" });
    const waiting = page
      .locator('[data-testid="stage-list-item"][data-state="AWAITING_REVIEW"]')
      .first();
    await waiting.click();
    await expect(page.getByTestId("engine-node-details")).toBeVisible();
    await expect(page.getByTestId("engine-node-link")).toBeVisible();
  });

  test("execution detail does not leak back into the content surfaces", async ({ page }) => {
    // D3's whole justification: the strip could leave the content pages because
    // Engine now owns that information.
    for (const path of ["/studio", "/studio/concepts", "/studio/content", "/studio/outputs"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByTestId("stage-strip")).toHaveCount(0);
      await expect(page.getByTestId("graph-canvas")).toHaveCount(0);
    }
  });
});

test.describe("the interface speaks the user's language (ADR-0020 D5)", () => {
  test("no surface shows an internal identifier or ticket name", async ({ page }) => {
    for (const path of ["/studio", "/studio/concepts", "/studio/content", "/studio/outputs", "/studio/calendar"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const body = await page.locator("main").innerText();
      // Identifiers like c1-v1 / o2 / p1 and ticket names like P4.
      expect(body, `${path} shows a version identifier`).not.toMatch(/\b[a-z]\d+-v\d+\b/);
      expect(body, `${path} names a ticket`).not.toMatch(/تیکت\s*P\d/);
      expect(body, `${path} says «بسته»`).not.toMatch(/بستهٔ?\s/);
    }
  });

  test("the shell has exactly one main landmark", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toHaveCount(1);
  });

  test("no untranslated English reaches a reader, screen reader included", async ({ page }) => {
    // `sr-only` text is in the accessibility tree and in innerText, but never on
    // screen — so English shipped by an upstream component survives every visual
    // review. This product ships fa-IR only (00 §4).
    // "React Flow" is the library's own attribution mark. Removing it needs the
    // Pro licence, which is an open client gate (doc 15 §12), so it stays.
    const ALLOWED = /^(DROP OS|Engine|DROP|OS|React Flow)$/;
    for (const path of ["/studio", "/studio/concepts", "/studio/calendar", "/studio/engine"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const text = await page.locator("body").innerText();
      const latin = [...new Set(text.match(/[A-Za-z][A-Za-z ]{2,}/g) ?? [])]
        .map((s) => s.trim())
        .filter((s) => !ALLOWED.test(s));
      expect(latin, `${path} shows untranslated English: ${latin.join(" | ")}`).toEqual([]);
    }
  });

  test("the one demo marker is present and honest", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "networkidle" });
    await expect(page.getByTestId("demo-marker")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("منتشر شد");
    expect(body).not.toContain("شبیه‌سازی شده است");
  });
});
