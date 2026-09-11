#!/usr/bin/env node
/**
 * Copy the two directories `output: "standalone"` deliberately leaves behind.
 *
 * Next's standalone bundle contains the server and its traced dependencies and
 * NOTHING else — not `public/`, not `.next/static`. Its own documentation says
 * to copy both, and until this script nothing did, so the bundle shipped with
 * no font, no stylesheet and no client chunks. It would have started, served
 * HTML, and rendered unstyled in a system font.
 *
 * That matters here more than in most apps: `public/fonts/Vazirmatn-Variable.woff2`
 * is the ONLY copy of the interface font. 00 §4 forbids a remote font or a CDN,
 * so there is no fallback to a hosted one — a missing file means the panel
 * silently stops being Persian-typeset and starts being whatever the operating
 * system picks.
 *
 * Run from `apps/web` as part of its build, so `pnpm build` alone is enough and
 * no eighth check command is invented (`tests/repo/ci.test.ts` pins the set).
 */
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const appDir = process.cwd();
const standalone = join(appDir, ".next", "standalone", "apps", "web");

if (!existsSync(standalone)) {
  // Not a standalone build. Nothing to do, and not an error.
  process.exit(0);
}

const copies = [
  { from: join(appDir, "public"), to: join(standalone, "public") },
  { from: join(appDir, ".next", "static"), to: join(standalone, ".next", "static") },
];

for (const { from, to } of copies) {
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true });
  console.log(`copy-standalone-assets: ${from.slice(appDir.length + 1)} -> standalone`);
}

const font = join(standalone, "public", "fonts", "Vazirmatn-Variable.woff2");
if (!existsSync(font)) {
  console.error("copy-standalone-assets: the interface font is missing from the bundle");
  process.exit(1);
}
console.log("copy-standalone-assets: Vazirmatn is in the bundle");
