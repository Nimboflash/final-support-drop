import type { NextConfig } from "next";

// 05 §2: standalone Docker output. 05 §4: workspace packages are consumed as
// source and transpiled here. No remote fonts, no CDN (00 §4; ADR-0016).
const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16 generates apps/web/AGENTS.md and apps/web/CLAUDE.md on dev start.
  // In THIS repository CLAUDE.md is the governance document (16 §2) whose
  // contents are asserted by tests/repo/claude-md.test.ts, so a second file of
  // that name inside the app — pointing at framework boilerplate — is a trap:
  // an agent that opens the nearest CLAUDE.md gets Next.js advice instead of
  // the authority order. Disabled rather than gitignored, so it is never
  // written at all.
  agentRules: false,
  // Every workspace package here exports raw TypeScript from ./src/index.ts, so
  // Next must transpile them; omitting one fails the production build only, not
  // typecheck or tests (AC-P4.1).
  transpilePackages: [
    "@drop/ui",
    "@drop/workflow-ui",
    "@drop/pipeline",
    "@drop/contracts",
    "@drop/panel-domain",
    "@drop/machine-gateway",
    "@drop/mock-data",
  ],
};

export default nextConfig;
