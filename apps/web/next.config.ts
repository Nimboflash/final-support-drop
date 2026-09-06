import type { NextConfig } from "next";

// 05 §2: standalone Docker output. 05 §4: workspace packages are consumed as
// source and transpiled here. No remote fonts, no CDN (00 §4; ADR-0016).
const nextConfig: NextConfig = {
  output: "standalone",
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
