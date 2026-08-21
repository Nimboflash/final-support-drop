import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Root Vitest config — repository check seam (16 §7) plus the P1 component seam.
// Two projects: node for repo/package tests, jsdom for React component tests.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "tests/**/*.test.ts",
            "packages/*/src/**/*.test.ts",
            "apps/worker/src/**/*.test.ts",
          ],
          exclude: ["packages/ui/**"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true, // Testing Library auto-cleanup hooks into afterEach
          setupFiles: ["packages/ui/test/setup.ts"],
          include: [
            "packages/ui/src/**/*.test.{ts,tsx}",
            "apps/web/**/*.test.{ts,tsx}",
          ],
        },
      },
    ],
  },
});
