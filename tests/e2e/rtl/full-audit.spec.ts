import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

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

/*
  768 is the floor, and it is a NARROW DESKTOP WINDOW rather than a tablet —
  half a screen, a split view, a laptop someone has dragged in. It stays
  because a person really does work at that width; 390 is gone because a phone
  is not a surface this panel is for (ADR-0027).

  768 is also exactly where `useIsMobile` flips. Keeping the floor there means
  every width under test is one where the sidebar is still a sidebar.
*/
const WIDTHS = [
  { name: "narrow", width: 768, height: 1024 },
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

  test("collapsing the sidebar to its rail leaves every destination reachable", async ({ page }) => {
    /*
      The rail, not a phone sheet. This used to run at 390px and prove the
      mobile drawer opened; the panel is a desktop tool (ADR-0027), so what is
      worth proving is the thing a person here actually does — press the
      trigger to win back horizontal space — and that the six destinations
      survive it.
    */
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/studio", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "نمایش یا پنهان‌کردن منو" }).click();
    const calendar = page
      .getByRole("navigation")
      .getByRole("link", { name: "تقویم", exact: true });
    await expect(calendar).toBeVisible();
    await calendar.click();
    await page.waitForURL("**/studio/calendar");
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
    // The action must CHANGE something. Asserting only that it is enabled is
    // how an inert button shipped: the button was visible, enabled, and had no
    // handler at all, and the assertion certified it.
    await page.getByTestId("add-source").click();
    await page.getByLabel("نشانی یا توضیح منبع").fill("https://example.invalid/ref");
    await page.getByTestId("save-source").click();
    await expect(page.getByTestId("needs-source")).toHaveCount(0);
    await expect(page.getByTestId("approve-content")).toBeEnabled();
  });

  test("the overview honours the same project filter (brief §8)", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "networkidle" });
    const all = await page.getByTestId("project-card").count();
    expect(all).toBeGreaterThan(1);

    await page.goto("/studio?project=p1", { waitUntil: "networkidle" });
    await expect(page.getByTestId("project-card")).toHaveCount(1);
    // A filter that vanishes on one destination out of six is a filter the
    // person stops trusting, so the selector is present here too.
    await expect(page.getByTestId("project-selector")).toBeVisible();
  });

  test("a retired project tab keeps its project as context", async ({ page }) => {
    await page.goto("/studio/projects/p1/overview", { waitUntil: "networkidle" });
    await page.waitForURL("**/studio?project=p1");
    await expect(page.getByTestId("project-card")).toHaveCount(1);
  });

  test("the project selector filters and lives in the URL", async ({ page }) => {
    await page.goto("/studio/concepts", { waitUntil: "networkidle" });
    const all = await page.getByTestId("concept-card").count();
    await page.goto("/studio/concepts?project=p1", { waitUntil: "networkidle" });
    const filtered = await page.getByTestId("concept-card").count();
    expect(filtered).toBeLessThanOrEqual(all);
    expect(filtered).toBeGreaterThan(0);
  });

  /*
    The settings picker was deleted, and this test moved with it rather than
    losing what it guarded.

    Brief §7 asks for the mock data and its states to be KEPT for testing
    scenarios, and doc 18 §7.2 requires the scenarios to exist. Neither asks for
    a chooser on a product surface — twenty-four English names and codes were a
    convenience this build added, on the one page an owner visits to do a real
    thing. The MECHANISM is what was recorded, so the mechanism is what is
    asserted: a scenario is selected by URL, and the panel says which one it is
    showing.
  */
  test("a scenario is selected by URL, and the panel says which one", async ({ page }) => {
    await page.goto("/studio/settings?scenario=S05", { waitUntil: "networkidle" });
    await expect(page.getByTestId("active-scenario")).toContainText("S05");

    await page.goto("/studio/settings", { waitUntil: "networkidle" });
    await expect(page.getByTestId("active-scenario")).toContainText("BASE");
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

    // The reload is the assertion. Without it this only proved that a tab
    // switch in the same page session shows the value already in memory —
    // which is true of state that was never persisted at all.
    await page.reload({ waitUntil: "networkidle" });
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
    for (const path of SURFACES) {
      await page.goto(path, { waitUntil: "networkidle" });
      // Reference text marked `lang="en"` is quoted from the specification —
      // the recorded scenario list names the ids it names, on purpose.
      const body = await page.evaluate(() => {
        const marked = [...document.querySelectorAll<HTMLElement>('[lang="en"]')];
        const prior = marked.map((el) => el.style.display);
        for (const el of marked) el.style.display = "none";
        const text = (document.querySelector("main") as HTMLElement).innerText;
        marked.forEach((el, i) => {
          el.style.display = prior[i] ?? "";
        });
        return text;
      });
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

  // `sr-only` text is in the accessibility tree and in innerText but never on
  // screen, so English shipped by an upstream component survives every visual
  // review. This product ships fa-IR only (00 §4).
  //
  // "React Flow" is the library's own attribution mark; removing it needs the
  // Pro licence, an open client gate (doc 15 §12), so it stays.
  // "API" is a loanword inside a Persian sentence, not untranslated copy.
  const ALLOWED_LATIN = /^(DROP OS|Engine|DROP|OS|React Flow|API)$/;

  for (const path of SURFACES) {
    test(`${path} shows no untranslated English`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      // Text explicitly marked `lang="en"` is quoted reference material — the
      // recorded scenario names — not a failure to localize. It is hidden and
      // restored rather than cloned away: `innerText` on a DETACHED node falls
      // back to raw text content, which drags in every inline script on the
      // page and drowns the signal.
      const latin = await page.evaluate(() => {
        const marked = [...document.querySelectorAll<HTMLElement>('[lang="en"]')];
        const priorDisplay = marked.map((el) => el.style.display);
        for (const el of marked) el.style.display = "none";
        const text = document.body.innerText;
        marked.forEach((el, i) => {
          el.style.display = priorDisplay[i] ?? "";
        });
        return text;
      });
      const found = [...new Set(latin.match(/[A-Za-z][A-Za-z ]{2,}/g) ?? [])]
        .map((s) => s.trim())
        .filter((s) => s !== "" && !ALLOWED_LATIN.test(s));
      expect(found, `${path} shows untranslated English: ${found.join(" | ")}`).toEqual([]);
    });
  }

  test("the graph's own controls speak Persian too", async ({ page }) => {
    // React Flow's control labels are `aria-label` and `title`, never visible
    // text, so the innerText sweep above cannot see them.
    await page.goto("/studio/engine", { waitUntil: "networkidle" });
    await expect(page.getByTestId("graph-canvas")).toBeVisible();
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-label], [title]")]
        .map((el) => `${el.getAttribute("aria-label") ?? ""}|${el.getAttribute("title") ?? ""}`)
        .filter((v) => /[A-Za-z]{3,}/.test(v)),
    );
    const offenders = labels.filter((v) => !/React Flow|DROP|Engine/.test(v));
    expect(offenders, `English accessible names: ${offenders.join(" ; ")}`).toEqual([]);
  });

  test("the one demo marker is present and honest", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "networkidle" });
    await expect(page.getByTestId("demo-marker")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("منتشر شد");
    expect(body).not.toContain("شبیه‌سازی شده است");
  });
});

test.describe("WCAG 2.2 AA on every destination and every overlay", () => {
  /**
   * The gate this replaces only ever visited /studio and /dev/gallery. Six new
   * destinations and five new overlays shipped without ever being scanned, and
   * two real violations went with them: a tab set whose `aria-controls` pointed
   * at panels that did not exist, and English close labels in the overlays.
   * A gate that skips the surfaces under construction is not a gate.
   */
  for (const path of SURFACES) {
    test(`${path} is axe-clean in both themes`, async ({ page }) => {
      for (const theme of ["light", "dark"] as const) {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await page.goto(path, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(
          results.violations.map((v) => `${theme} ${path} — ${v.id}: ${v.nodes.length} nodes`),
        ).toEqual([]);
      }
    });
  }

  const OVERLAYS = [
    { name: "concept detail", path: "/studio/concepts", open: "open-concept", slot: "concept-detail" },
    { name: "concept composer", path: "/studio/concepts", open: "start-concept", slot: "concept-composer" },
    { name: "content detail", path: "/studio/content", open: "open-content", slot: "content-detail" },
    { name: "output detail", path: "/studio/outputs", open: "open-output", slot: "output-detail" },
    { name: "calendar event", path: "/studio/calendar", open: "calendar-event", slot: "event-sheet" },
  ] as const;

  for (const overlay of OVERLAYS) {
    test(`the ${overlay.name} overlay is axe-clean`, async ({ page }) => {
      await page.goto(overlay.path, { waitUntil: "networkidle" });
      await page.getByTestId(overlay.open).first().click();
      await expect(page.getByTestId(overlay.slot)).toBeVisible();
      // Wait for the entrance animation to finish. `toBeVisible` resolves while
      // the overlay is still fading in, and axe measures contrast against a
      // partially transparent surface — a colour pair that passes when opaque
      // fails at 80%, so the gate would flake rather than report.
      await expect(page.getByTestId(overlay.slot)).toHaveCSS("opacity", "1");
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
    });

    test(`the ${overlay.name} overlay returns focus when it closes`, async ({ page }) => {
      // A controlled overlay with no Radix trigger drops focus on <body> when
      // it closes, stranding a keyboard user at the top of the document.
      await page.goto(overlay.path, { waitUntil: "networkidle" });
      await page.getByTestId(overlay.open).first().click();
      await expect(page.getByTestId(overlay.slot)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId(overlay.slot)).toBeHidden();

      // Polled, not sampled. These overlays are controlled by the id of the
      // open item, so closing unmounts the subtree before Radix reaches its
      // close-focus phase: focus lands on `<body>` first and is restored a
      // frame or two later. That is correct for a keyboard user and invisible
      // to a person — but a single sample the instant the overlay hides reads
      // the intermediate state, which is a flaky assertion about a working
      // feature. What must hold is that focus COMES BACK, and to the control
      // that opened it.
      await expect
        .poll(
          () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "BODY"),
          { message: `${overlay.name} never returned focus to its opener`, timeout: 3_000 },
        )
        .toBe(overlay.open);
    });
  }
});
