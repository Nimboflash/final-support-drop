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
);
