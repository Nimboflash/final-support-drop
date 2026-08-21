import type { NextConfig } from "next";

// 05 §2: standalone Docker output. 05 §4: workspace packages are consumed as
// source and transpiled here. No remote fonts, no CDN (00 §4; ADR-0016).
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@drop/ui", "@drop/workflow-ui", "@drop/pipeline", "@drop/contracts"],
};

export default nextConfig;
