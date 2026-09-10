import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The machine boundary (ticket P10, AC-P10.1 and AC-P10.2).
 *
 * `services/concept-portfolio` has no CORS middleware and no authentication of
 * any kind. The proxy route is therefore a security boundary rather than
 * plumbing, and the properties that make it one are structural — they can be
 * read off the source, which means they can be kept.
 *
 * Each assertion below exists because of a specific way this could be got
 * wrong, and the comment says which.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const ROUTE = join(ROOT, "apps/web/app/api/machine/[...path]/route.ts");
const PORT = join(ROOT, "apps/web/lib/machine/browser-machine-port.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/** Strips comments and string literals, so prose about a rule is not the rule. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("the proxy exists and is the only way to the machine", () => {
  it("is a route handler, not a client component", () => {
    const source = read(ROUTE);
    expect(source).not.toContain('"use client"');
    // Baked-in config would be read at BUILD time, so turning the machine on or
    // off would need a rebuild — and a stale value would silently persist.
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });

  it("exports GET and no verb that could mutate or spend", () => {
    /*
      Five of the service's seven routes are POSTs that cost money, and
      `concepts/generate` takes NO request body — which makes it a CORS simple
      request that any open page could fire cross-origin with `mode: "no-cors"`.
      Slice 1 is read-only, and the way that is enforced is that no other verb
      is exported: Next answers 405 for a verb a route handler does not define.
    */
    const code = codeOnly(read(ROUTE));
    expect(code).toMatch(/export\s+async\s+function\s+GET\b/);
    for (const verb of ["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      expect(code, `${verb} must not be exported from the machine proxy`).not.toMatch(
        new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`),
      );
    }
  });

  it("validates the session id before it can reach a path", () => {
    /*
      The service interpolates the id straight into a filesystem path
      (`session_service.py:35`) and validates nothing. Both layers that can
      check it, do.
    */
    const pattern = /\^\[a-f0-9\]\{12\}\$/;
    expect(read(ROUTE)).toMatch(pattern);
    expect(read(join(ROOT, "packages/machine-gateway/src/real/machine-client.ts"))).toMatch(
      pattern,
    );
  });

  it("never builds the upstream URL out of the caller's path segments", () => {
    /*
      This is the SSRF. `new URL("//evil.example/x", base)` resolves to a
      different ORIGIN, and `new URL("../../admin", base)` climbs out of the
      prefix — so an allow-list checked against the raw path is not the same
      string as the URL that gets fetched, because Next percent-decodes the
      segments first. The route therefore maps segments onto a fixed set of
      literal paths and concatenates one of THOSE onto a validated origin.
    */
    const code = codeOnly(read(ROUTE));
    expect(code).toContain("fetch(origin + upstreamPath");
    // A joined catch-all is the shape this bug takes when it is written.
    expect(code).not.toMatch(/\bpath\s*\.\s*join\b|\bsegments\s*\.\s*join\b/);
    // Exactly one fetch, so there is no second path into the service.
    expect(code.match(/\bfetch\s*\(/g) ?? []).toHaveLength(1);
  });

  it("keeps the machine's address on the server", () => {
    /*
      AC-P10.1. A `"use client"` module naming the variable would compile it
      into the browser bundle, and `NEXT_PUBLIC_` would publish it outright.
    */
    const offenders: string[] = [];
    for (const file of [
      ...walk(join(ROOT, "apps/web/app")),
      ...walk(join(ROOT, "apps/web/lib")),
      ...walk(join(ROOT, "apps/web/components")),
    ]) {
      const source = read(file);
      if (!source.includes("DROP_MACHINE_BASE_URL")) continue;
      if (source.includes('"use client"')) offenders.push(file);
    }
    expect(offenders).toEqual([]);

    const everywhere = [
      ...walk(join(ROOT, "apps/web")),
      ...walk(join(ROOT, "packages/machine-gateway/src")),
    ];
    for (const file of everywhere) {
      expect(read(file), `${file} must not publish the machine address`).not.toContain(
        "NEXT_PUBLIC_DROP_MACHINE",
      );
    }
  });

  it("forwards no field the projection does not read, and never the server's path", () => {
    /*
      `run_dir` is an absolute server filesystem path present in EVERY response.
      The projection drops it, but the projection runs in the browser — a
      dropped field is still a field that arrived and is sitting in the network
      log. It is removed here instead, one layer earlier.
    */
    const source = read(ROUTE);
    expect(source).toContain("SESSION_FIELDS");
    const allowList = /const SESSION_FIELDS = \[([\s\S]*?)\] as const;/.exec(source);
    expect(allowList).not.toBeNull();
    expect(allowList![1]).not.toContain("run_dir");
  });

  it("returns the machine's status without its words", () => {
    /*
      Its handler is `detail=str(e)`, so upstream provider URLs, whole pydantic
      dumps and its own API-key message reach the caller verbatim. The status
      travels because the adapter maps on it; the body does not.
    */
    const code = codeOnly(read(ROUTE));
    expect(code).not.toContain("detail");
  });
});

describe("the browser only ever talks to its own origin", () => {
  it("uses a relative proxy path and names no host", () => {
    const source = read(PORT);
    expect(source).toContain('const PROXY = "/api/machine"');
    expect(codeOnly(source)).not.toMatch(/https?:\/\//);
  });
});

describe("the contract package still cannot reach a network", () => {
  it("names no transport global anywhere under src/real", () => {
    /*
      `packages/machine-gateway` has `lib: ["ES2023"]` and declares no `types`,
      so these do not exist in its type environment — a client written against
      them would not compile. This asserts the intent as well as the accident,
      so adding `"types": ["node"]` to that tsconfig turns a test red instead of
      quietly making `Blob` and `FormData` nameable in a contract package.
    */
    for (const file of walk(join(ROOT, "packages/machine-gateway/src/real"))) {
      const code = codeOnly(read(file));
      for (const global of ["fetch", "XMLHttpRequest", "Response", "Headers", "AbortController"]) {
        expect(code, `${file} must not name ${global}`).not.toMatch(
          new RegExp(`\\b${global}\\s*\\(`),
        );
      }
    }
  });
});
