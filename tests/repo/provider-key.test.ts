import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The provider credential cannot leak (ADR-0024).
 *
 * The panel has no authentication. A route that writes a paid credential to
 * disk is therefore exactly as exposed as the panel is, and the only reason it
 * is acceptable at all is that it is off unless switched on and can write to
 * precisely one place.
 *
 * Each assertion here is a way the key could escape, closed.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const ROUTE = join(ROOT, "apps/web/app/api/provider-key/route.ts");
const CARD = join(ROOT, "apps/web/components/panel/provider-key-card.tsx");

/**
 * Strips comments, because prose ABOUT a rule is not a breach of it.
 *
 * The first version of this guard failed on its own subject: the card's doc
 * comment says the key is never put in `localStorage`, and the scan read that
 * sentence as the thing it forbids.
 */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    // Tests carry leak FIXTURES — a string asserted not to escape is not an escape.
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("the provider key is written, never read back", () => {
  it("is off in production unless deliberately switched on", () => {
    const route = readFileSync(ROUTE, "utf8");
    expect(route).toContain("DROP_PROVIDER_KEY_ADMIN");
    // A deployed panel has no authentication; a dev server on loopback is the
    // machine this was built for. The gate is about the first, not the second.
    expect(route).toContain('process.env.NODE_ENV !== "production"');
    // Absent config is a 404, not a 403: a 403 confirms the route exists.
    expect(route).toContain('{ error: "NOT_FOUND" }, { status: 404 }');
  });

  it("can write to exactly one path, and that path is gitignored", () => {
    /*
      `.gitignore` covers `services/concept-portfolio/.env` and NOT the
      repository root's `.env`. A configurable destination is how a credential
      ends up in a commit, so the destination is a constant.
    */
    const route = readFileSync(ROUTE, "utf8");
    expect(route).toContain('"services", "concept-portfolio", ".env"');
    expect(route).not.toMatch(/ENV_PATH\s*=\s*[^;]*process\.env/);

    const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8");
    expect(ignored).toMatch(/^services\/concept-portfolio\/\.env$/m);
  });

  it("never returns the value — only whether one is set, and four characters", () => {
    const route = readFileSync(ROUTE, "utf8");
    // Everything that leaves this route goes through NextResponse.json.
    const replies = route.match(/NextResponse\.json\(([\s\S]*?)\)/g) ?? [];
    expect(replies.length).toBeGreaterThan(3);
    for (const reply of replies) {
      expect(reply, "a reply must not carry the key").not.toMatch(/\bkey\b\s*[,:}]/);
      expect(reply).not.toContain("openrouter_api_key");
    }
    expect(route).toContain("slice(-4)");
  });

  it("never logs it", () => {
    const route = readFileSync(ROUTE, "utf8");
    expect(route).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });

  it("is never stored in the browser, and never shown", () => {
    const card = readFileSync(CARD, "utf8");
    const code = codeOnly(card);
    expect(card).toContain('type="password"');
    expect(card).toContain('autoComplete="off"');
    // Cleared on submit, accepted or not.
    expect(card).toContain('setDraft("")');
    for (const store of ["localStorage", "sessionStorage", "document.cookie"]) {
      expect(code, `the key must not reach ${store}`).not.toContain(store);
    }
  });

  it("no other surface reads the credential", () => {
    /*
      The vendored service reads OPENROUTER_API_KEY from its own environment
      and is byte-frozen (ADR-0021 D2). Nothing in the panel may.
    */
    const offenders: string[] = [];
    for (const dir of ["apps/web/app", "apps/web/lib", "apps/web/components", "packages"]) {
      for (const file of walk(join(ROOT, dir))) {
        if (file === ROUTE) continue;
        if (codeOnly(readFileSync(file, "utf8")).includes("OPENROUTER_API_KEY")) {
          offenders.push(file.slice(ROOT.length + 1));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
