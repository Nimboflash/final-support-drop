import tseslint from "typescript-eslint";

/**
 * ESLint — carries the 05 §4 package dependency rule (ticket 0.1 AC-4).
 * Three zones; each bad fixture in tests/repo/boundary-fixtures-bad mirrors one
 * zone so the rule is proven to fire (dependency-direction.test.ts).
 */
const DOMAIN_PACKAGES =
  "packages/{core,studio,contracts,db,pipeline,retrieval,storage,config,observability,testing}/**/*.{ts,tsx}";

// Subpath imports are the realistic violation path (next/headers,
// drizzle-orm/pg-core), so every restriction is a pattern group, not an
// exact-name path (review F2).
const frameworkPatterns = [
  { group: ["next", "next/*"], message: "05 §4: domain code must not import Next.js." },
  { group: ["react", "react-dom", "react-dom/*"], message: "05 §4: domain code must not import React." },
  { group: ["@xyflow/*"], message: "05 §4 / ADR 0010: React Flow types must never leak into domain packages." },
];
const providerPatterns = [
  { group: ["openai", "openai/*", "@anthropic-ai/*"], message: "05 §4: domain code must not import provider SDK types (ai-gateway owns providers)." },
];
const domainRestrictions = [...frameworkPatterns, ...providerPatterns];


/**
 * P1 (09 §1; AC-P1.3): logical CSS properties only — physical direction
 * utilities are a lint failure in UI code. Escape hatch: an eslint-disable
 * with a documented reason (enforced by tests/repo/logical-properties.test.ts).
 */
const PHYSICAL_CLASS = /(?:^|[\s"'`:])(?:-?(?:ml|mr|pl|pr)-(?:\d|\[|px\b|\()|text-left\b|text-right\b|-?(?:left|right)-(?:\d|\[|full\b|px\b)|rounded-(?:l|r|tl|tr|bl|br)(?:-|\b)|border-[lr](?:-\d)?\b|[mp][lr]-auto\b|float-(?:left|right)\b|clear-(?:left|right)\b)/;

const dropLogicalPlugin = {
  rules: {
    "no-physical-direction-classes": {
      meta: {
        type: "problem",
        docs: { description: "09 §1: use logical properties/utilities (ms-, me-, ps-, pe-, start-, end-, text-start, text-end) instead of physical ones" },
        schema: [],
      },
      create(context) {
        function check(node, value) {
          if (typeof value === "string" && PHYSICAL_CLASS.test(value)) {
            context.report({ node, message: "Physical direction utility in \"{{v}}\" — use the logical equivalent (09 §1), or document a physical reason via eslint-disable.", data: { v: value.slice(0, 60) } });
          }
        }
        return {
          Literal(node) { check(node, node.value); },
          TemplateElement(node) { check(node, node.value.raw); },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "docs/**",
      "executive-multi-agent-model/**",
      ".claude/**",
      // The bad fixtures are linted individually with --no-ignore by
      // tests/repo/dependency-direction.test.ts and MUST fail there; the
      // repo-wide sweep skips them so `pnpm lint` stays green.
      "tests/repo/boundary-fixtures-bad/**",
      "tests/repo/lint-fixtures-bad/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: [
      "packages/ui/**/*.{ts,tsx}",
      "packages/workflow-ui/**/*.{ts,tsx}",
      "apps/web/**/*.{ts,tsx}",
      "tests/repo/lint-fixtures-bad/*.tsx",
    ],
    plugins: { drop: dropLogicalPlugin },
    rules: { "drop/no-physical-direction-classes": "error" },
  },
  {
    files: [DOMAIN_PACKAGES, "tests/repo/boundary-fixtures-bad/domain-*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: domainRestrictions }] },
  },
  {
    // ai-gateway owns providers but is still domain code for everything else
    // (review F1): frameworks stay forbidden, provider SDKs are its business.
    files: ["packages/ai-gateway/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: frameworkPatterns }] },
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}", "tests/repo/boundary-fixtures-bad/ui-*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@drop/core", "@drop/core/*", "@drop/studio", "@drop/studio/*", "@drop/pipeline", "@drop/pipeline/*", "@drop/db", "@drop/db/*"], message: "05 §4: packages/ui must not import feature/domain services." },
          { group: ["drizzle-orm", "drizzle-orm/*"], message: "05 §4: components must not touch Drizzle." },
        ],
      }],
    },
  },
  {
    files: [
      "packages/ui/**/*.{ts,tsx}",
      "packages/workflow-ui/**/*.{ts,tsx}",
      "apps/web/app/**/*.{ts,tsx}",
      "apps/web/components/**/*.{ts,tsx}",
      "tests/repo/boundary-fixtures-bad/component-*.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["drizzle-orm", "drizzle-orm/*"], message: "05 §4: React components must not write directly to Drizzle." }],
      }],
    },
  },

  // ---- ticket P2 zones (AC-P2.10) — appended blocks ----
  //
  // IMPORTANT (proven by tests/repo/eslint-zone-terminality.test.ts): ESLint flat
  // config REPLACES the options of a repeated rule rather than merging them, so
  // the LAST config matching a file is the only `no-restricted-imports` that
  // applies to it. These zones therefore restate every restriction the earlier
  // 0.1 zones placed on the files they match — dropping one would silently
  // un-enforce it, and ADDING one would silently invent a boundary 05 §4 never
  // drew. The two zones below mirror the 0.1 split exactly:
  //
  //   * the 05 §4 domain-service ban (core/studio/pipeline/db) is a
  //     `packages/ui` rule and ONLY a `packages/ui` rule. `pipeline <- web` is
  //     an ALLOWED edge (05 §4; apps/web/lib/boundary-proof.ts is its positive
  //     fixture), so apps/web must not inherit that ban.
  //   * the Drizzle ban covers every component tree.
  //
  // The `ui-*` and `component-*` fixture globs are included so the committed bad
  // fixtures are judged by these terminal zones, not by an earlier one they
  // would otherwise still trip.
  {
    files: ["packages/ui/**/*.{ts,tsx}", "tests/repo/boundary-fixtures-bad/ui-*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          // ticket P2 (18 §6-§7): both routes to a fixture are closed.
          { group: ["@drop/mock-data", "@drop/mock-data/*"], message: "18 §6-§7: components must never import fixtures directly \u2014 depend on the gateway interfaces." },
          { group: ["@drop/panel-domain/fixtures", "@drop/panel-domain/fixtures/*"], message: "18 §7: fixture shapes are for adapters, mocks and contract tests \u2014 not for components." },
          // Restated from the ticket-0.1 packages/ui zone (05 §4).
          { group: ["@drop/core", "@drop/core/*", "@drop/studio", "@drop/studio/*", "@drop/pipeline", "@drop/pipeline/*", "@drop/db", "@drop/db/*"], message: "05 §4: packages/ui must not import feature/domain services." },
          { group: ["drizzle-orm", "drizzle-orm/*"], message: "05 §4: components must not touch Drizzle." },
        ],
      }],
    },
  },
  {
    files: [
      "packages/workflow-ui/**/*.{ts,tsx}",
      "apps/web/app/**/*.{ts,tsx}",
      "apps/web/components/**/*.{ts,tsx}",
      "apps/web/lib/**/*.{ts,tsx}",
      "tests/repo/boundary-fixtures-bad/component-*.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@drop/mock-data", "@drop/mock-data/*"], message: "18 §6-§7: components must never import fixtures directly \u2014 depend on the gateway interfaces." },
          { group: ["@drop/panel-domain/fixtures", "@drop/panel-domain/fixtures/*"], message: "18 §7: fixture shapes are for adapters, mocks and contract tests \u2014 not for components." },
          // Restated from the ticket-0.1 component zone (05 §4).
          { group: ["drizzle-orm", "drizzle-orm/*"], message: "05 §4: React components must not write directly to Drizzle." },
        ],
      }],
    },
  },
  {
    // 18 §6 / ADR-0017 D5: the panel contract packages are pure TypeScript plus
    // Zod \u2014 no framework, no transport, no canvas types.
    files: [
      "packages/panel-domain/**/*.{ts,tsx}",
      "packages/machine-gateway/**/*.{ts,tsx}",
      "tests/repo/boundary-fixtures-bad/panel-domain-*.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["react", "react-dom", "react-dom/*"], message: "18 §6: panel-domain/machine-gateway must not import React." },
          { group: ["next", "next/*"], message: "18 §6: panel-domain/machine-gateway must not import Next.js." },
          { group: ["@xyflow/*"], message: "18 §6: React Flow objects must never become the integration contract." },
          { group: ["@drop/ui", "@drop/ui/*", "@drop/workflow-ui", "@drop/workflow-ui/*"], message: "18 §6: the contract packages must not depend on presentation packages." },
        ],
      }],
    },
  },
);
