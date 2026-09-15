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
    //
    // The two machine variables are pinned EMPTY on purpose. Next loads
    // `apps/web/.env.local` in production too, and a developer who has pointed
    // their own panel at a live machine has those set there — which would put
    // this entire suite into REAL mode, reading someone's actual session
    // instead of the deterministic demo world. Every assertion about seeded
    // content would then fail for a reason that has nothing to do with the
    // change under test. An explicitly empty value outranks the file.
    command: "pnpm --filter @drop/web exec next start -p 3105",
    // DROP_PROVIDER_KEY_ADMIN is pinned off for the same reason and a sharper
    // one: it exposes the credential card, which is a DEV-only surface by
    // design (ADR-0024) and must not be part of what a production build serves.
    // With it leaking in from `.env.local`, the audit above started reading the
    // card's «OpenRouter» and reporting the panel as untranslated.
    env: {
      DROP_DEMO: "1",
      DROP_MACHINE_BASE_URL: "",
      DROP_MACHINE_SESSION_ID: "",
      DROP_PROVIDER_KEY_ADMIN: "",
    },
    url: "http://127.0.0.1:3105/studio",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
