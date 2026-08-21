import { defineConfig } from "@playwright/test";

/**
 * Seam E — Playwright on the gallery and /studio shell (ticket P1).
 * Serves the production build (deterministic snapshots; the dev overlay would
 * pollute them). `pnpm test:e2e` builds first, then runs this config.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  timeout: 45_000,
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: "http://127.0.0.1:3105",
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
  },
  webServer: {
    // DROP_DEMO=1 is the demo configuration (18 §7.3): the gallery route exists
    // only in dev/demo, and e2e runs against the production build.
    command: "pnpm --filter @drop/web exec next start -p 3105",
    env: { DROP_DEMO: "1" },
    url: "http://127.0.0.1:3105/studio",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
