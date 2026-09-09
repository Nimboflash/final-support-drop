import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SECONDARY_NAV, STUDIO_NAV } from "../../apps/web/app/studio/_shell/studio-nav";

/**
 * Ticket P9, Seam F — every destination has the states V2 02 §10 and the
 * brief's §11 require.
 *
 * This guard exists because the restructure deleted seven `loading.tsx`
 * boundaries along with the routes that held them and added none back. Nothing
 * noticed: a missing loading boundary is not a type error, not a lint error,
 * and invisible in a test that waits for the page to settle before asserting.
 * It shows up only for the person on a slow connection, who sees nothing at all
 * where a skeleton belonged.
 *
 * The error boundary is deliberately ONE at the segment root rather than one
 * per destination — Next.js catches everything rendered beneath it, and eight
 * copies would only be eight places to forget.
 */
const ROOT = join(__dirname, "..", "..");
const STUDIO = join(ROOT, "apps", "web", "app", "studio");

/** Every destination a person can reach from the shell. */
const DESTINATIONS = [...STUDIO_NAV.map((i) => i.href), ...SECONDARY_NAV.map((i) => i.href)];

function segmentDir(href: string): string {
  return href === "/studio" ? STUDIO : join(STUDIO, href.replace("/studio/", ""));
}

describe("every destination can show that it is loading (V2 02 §10)", () => {
  it.each(DESTINATIONS)("%s has a loading boundary", (href) => {
    const dir = segmentDir(href);
    expect(statSync(dir).isDirectory()).toBe(true);
    expect(
      readdirSync(dir),
      `${href} has no loading.tsx — a slow connection shows nothing at all`,
    ).toContain("loading.tsx");
  });
});

describe("a failure is explained, never dumped (brief §11)", () => {
  const errorBoundary = join(STUDIO, "error.tsx");

  it("the studio segment has one error boundary", () => {
    expect(statSync(errorBoundary).isFile()).toBe(true);
  });

  it("it offers a way out rather than only a message", () => {
    const source = readFileSync(errorBoundary, "utf8");
    expect(source, "the boundary must offer retry").toMatch(/\breset\b/);
  });

  it("it never renders the raw error", () => {
    // `error.message` can carry a gateway phrase, a schema path or an internal
    // identifier. The brief forbids a raw API error or stack trace on screen,
    // and rendering `message` is precisely how that happens.
    const source = readFileSync(errorBoundary, "utf8");
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ");
    expect(
      /\berror\.message\b|\berror\.stack\b|\{\s*error\s*\}\s*</.test(withoutComments),
      "the error boundary renders the raw error to the user",
    ).toBe(false);
  });
});
