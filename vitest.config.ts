import { defineConfig } from "vitest/config";

// Root Vitest config — the repository check seam (ticket 0.1, 16 §7).
// One `pnpm test` sweeps root repo tests plus every workspace scaffold test.
export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
    ],
  },
});
