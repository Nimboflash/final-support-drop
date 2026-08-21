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
    ],
  },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { parser: tseslint.parser },
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
