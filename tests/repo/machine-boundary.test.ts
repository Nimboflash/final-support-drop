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

  it("exports exactly GET and POST, and OPTIONS is not among them", () => {
    /*
      Five of the service's seven routes are POSTs that cost money, and
      `concepts/generate` takes NO request body — which makes it a CORS simple
      request that any open page could fire cross-origin with `mode: "no-cors"`.

      Slice 1 answered that by exporting no verb but GET. Slice 2 needs writes,
      so the answer moved into the route (a write has no bodyless shape; see its
      docblock) and this became an exact ALLOW-LIST rather than a ban on POST.

      The allow-list is the point. Deleting the POST case would also have
      stopped pinning OPTIONS — and an unexported OPTIONS is precisely what
      makes a cross-origin preflight fail, because Next answers it with `Allow`
      and no `Access-Control-Allow-Origin`, which is not an affirmative
      preflight, so the browser never sends the forged write. The two halves of
      the defence have to stay pinned together.
    */
    const code = codeOnly(read(ROUTE));
    const exported = [...code.matchAll(/export\s+async\s+function\s+([A-Z]+)\b/g)].map(
      (match) => match[1],
    );
    expect(exported.sort(), "the machine proxy's verb set is closed").toEqual(["GET", "POST"]);
    for (const verb of ["PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      expect(code, `${verb} must not be exported from the machine proxy`).not.toMatch(
        new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`),
      );
    }
  });

  it("no write can be a CORS simple request", () => {
    /*
      The structural half of rule 2. A simple request is one a browser sends
      cross-origin with no preflight; it cannot carry a custom header, and its
      content-type is limited to three values that do not include JSON. So a
      write that REQUIRES both cannot be forged from another origin — the
      browser asks permission first and is refused.

      Checked here rather than left to the docblock because the failure is
      silent: dropping either requirement leaves every test green and re-opens
      the exact attack the route was written against.
    */
    // Raw source, not `codeOnly`: these ARE string literals, and codeOnly
    // exists to blank string literals so prose cannot satisfy a rule. The
    // structural half below is what runs against stripped code.
    const source = read(ROUTE);
    expect(source, "a write must require the custom header").toContain("x-drop-machine-write");
    expect(source, "a write must require a JSON content-type").toContain("application/json");
    expect(source, "a write must check sec-fetch-site").toContain("sec-fetch-site");
    expect(source, "a write must check origin").toContain('headers.get("origin")');
    // Every one fails closed, so the checks are a conjunction with no early
    // success: the function returns false on each miss and true only at the end.
    expect(codeOnly(source)).toMatch(/function\s+sameOriginWrite/);
  });

  it("names no scheme-and-slashes literal, which would blind every other check", () => {
    /*
      Not style — self-defence, and it was earned. `codeOnly()` strips line
      comments BEFORE string literals, so a `//` inside a string reads as the
      start of a comment: it eats the rest of that line, leaves every quote
      after it unbalanced, and the string-literal pass then pairs the WRONG
      quotes and deletes whole functions. A same-origin check written as a
      concatenated scheme did exactly that here — `export async function POST`
      vanished from the guard's view while the file on disk was fine.

      A guard that silently stops seeing the thing it guards is worse than no
      guard. The route parses origins instead, and this keeps it that way.
    */
    expect(codeOnly(read(ROUTE))).not.toMatch(/https?:\/\//);
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
      travels because the adapter maps on it; the body's WORDS do not.

      The body is READ, once, through `classifyUpstreamFailure`, which reduces
      it to a closed-set kind and a provider status number and drops the rest
      (`apps/web/lib/machine/upstream-failure.test.ts` proves no substring
      survives). Without that, an expired provider key arrived as a bare 400
      and rendered as "the session moved — refresh the page".
    */
    const code = codeOnly(read(ROUTE));
    expect(code).not.toContain("detail");
    expect(code).toContain("classifyUpstreamFailure(");
    // The classifier's OUTPUT is what crosses, never the decoded body itself.
    expect(code).not.toMatch(/refused\([^)]*\bbody\b/);
  });
});

describe("a paid write's deadline is sized to what it takes, and the lock outlives it", () => {
  /*
    The first build deadline was set "just above the service's http_timeout"
    on the belief that the service could not outlast it. That timeout is a
    socket inactivity limit and the provider keeps the socket alive, so the
    owner's first two live builds (251s, 313s) finished on the service and
    504'd at the proxy. These numbers are read from source so the relation
    cannot drift apart silently again.
  */
  const number = (source: string, name: string): number => {
    const match = new RegExp(`const ${name} = ([0-9_]+);`).exec(source);
    expect(match, `${name} must be a literal`).not.toBeNull();
    return Number(match![1]!.replace(/_/g, ""));
  };
  const route = read(ROUTE);
  const lock = read(join(ROOT, "apps", "web", "lib", "machine", "session-write-lock.ts"));

  it("waits longer for a build than a build has ever taken", () => {
    // Longest observed live build: 313s. Below that the proxy gives up on a
    // write that is about to land, every time.
    expect(number(route, "BUILD_TIMEOUT_MS")).toBeGreaterThanOrEqual(480_000);
    expect(number(route, "MODEL_TIMEOUT_MS")).toBeGreaterThanOrEqual(120_000);
  });

  it("the build is the write that gets the long deadline", () => {
    expect(route).toMatch(/kind: "build"[^}]*deadlineMs: BUILD_TIMEOUT_MS/);
    expect(route).toMatch(/kind: "generate"[^}]*deadlineMs: MODEL_TIMEOUT_MS/);
  });

  it("the lock outlives the longest deadline by a clear margin", () => {
    // A timed-out write is not released: it may still be spending. If the lock
    // expired first, a second paid call could start over the top of it.
    expect(number(lock, "LOCK_EXPIRY_MS")).toBeGreaterThanOrEqual(
      number(route, "BUILD_TIMEOUT_MS") + 60_000,
    );
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
