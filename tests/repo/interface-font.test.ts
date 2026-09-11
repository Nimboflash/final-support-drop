import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The interface font is Vazirmatn, and it is ours (00 §4; 09 §5; ADR-0016).
 *
 * "No mandatory Western PaaS, remote font, CDN, proxy or restriction-bypass
 * dependency is allowed" (`00:85`). So there is no hosted copy to fall back to:
 * `public/fonts/Vazirmatn-Variable.woff2` is the ONLY copy that exists, and if
 * it fails to reach the browser the panel silently stops being Persian-typeset
 * and becomes whatever the operating system picks.
 *
 * Two ways it was failing to reach the browser, both fixed and both pinned
 * here:
 *
 *   - It was never preloaded, so with `font-display: swap` every load painted
 *     the fallback first and reflowed.
 *   - `output: "standalone"` copies the server and nothing else — not `public/`,
 *     not `.next/static`. The bundle shipped with no font, no stylesheet and no
 *     client chunks at all.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const WEB = join(ROOT, "apps/web");
const FONT = "public/fonts/Vazirmatn-Variable.woff2";

describe("the interface font is bundled, declared and preloaded", () => {
  it("ships the file itself, and its licence", () => {
    const font = join(WEB, FONT);
    expect(existsSync(font), `${FONT} is missing`).toBe(true);
    // A truncated or LFS-pointer file would still "exist".
    expect(statSync(font).size).toBeGreaterThan(50_000);
    expect(existsSync(join(WEB, "public/fonts/Vazirmatn-OFL.txt"))).toBe(true);
  });

  it("declares it locally and reaches for no remote host", () => {
    const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
    expect(css).toContain("@font-face");
    expect(css).toContain('font-family: "Vazirmatn"');
    expect(css).toContain('url("/fonts/Vazirmatn-Variable.woff2")');
    // 00 §4: no remote font, no CDN. A Google Fonts import would satisfy every
    // other assertion in this file.
    expect(css).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com|@import\s+url\(\s*["']?https?:/);
    expect(css).toContain('--font-sans: "Vazirmatn"');
  });

  it("preloads it, so the first paint is not the fallback", () => {
    const layout = readFileSync(join(WEB, "app/layout.tsx"), "utf8");
    expect(layout).toContain('rel="preload"');
    expect(layout).toContain("/fonts/Vazirmatn-Variable.woff2");
    // Fonts are fetched in CORS mode even same-origin; a mismatched preload is
    // just a second download.
    expect(layout).toContain('crossOrigin="anonymous"');
  });

  it("copies the assets that `output: standalone` leaves behind", () => {
    /*
      Next's standalone bundle contains the server and its traced dependencies
      and nothing else. Its own documentation says to copy `public/` and
      `.next/static`; until this was added, nothing did.
    */
    const config = readFileSync(join(WEB, "next.config.ts"), "utf8");
    expect(config).toContain('output: "standalone"');

    const build = JSON.parse(readFileSync(join(WEB, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(build.scripts.build).toContain("copy-standalone-assets");

    const script = readFileSync(join(ROOT, "scripts/copy-standalone-assets.mjs"), "utf8");
    expect(script).toContain("public");
    expect(script).toContain(".next");
    // It must FAIL the build rather than warn: a silently fontless bundle is
    // exactly the failure this guards.
    expect(script).toContain("process.exit(1)");
  });
});
