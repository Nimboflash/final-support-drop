import { NextResponse } from "next/server";

/**
 * The same-origin boundary in front of the concept-portfolio service
 * (ticket P10, AC-P10.1).
 *
 * This is not a convenience. The service ships **no CORS middleware and no
 * authentication of any kind** — `api.py` constructs a bare `FastAPI()` with no
 * `add_middleware`, no `Depends`, and `/docs` and `/openapi.json` live and
 * public. A browser cannot call it cross-origin, and nothing but this route
 * stands between whoever can reach the panel and a service that spends the
 * owner's model budget per request.
 *
 * Three rules, each answering a specific way this could be got wrong:
 *
 * 1. **`GET` only.** Five of the service's seven routes are POSTs that mutate
 *    and cost money, and `concepts/generate` takes NO request body — which
 *    makes it a CORS *simple request* that any page the user has open could
 *    fire with `mode: "no-cors"`, burn credits, and never see the response.
 *    Slice 1 reads; writes arrive in slice 2 behind a queue and an explicit
 *    decision. Every other verb 405s because it is simply not exported.
 *
 * 2. **The upstream URL is never built from user input.** There are two
 *    literal templates below and no third. This is not paranoia about a
 *    hypothetical: `new URL("//evil.example/x", base)` resolves to
 *    `http://evil.example/x`, and `new URL("../../admin", base)` climbs out of
 *    the prefix. A catch-all segment interpolated into a URL is an SSRF, and
 *    an allow-list checked against the raw path is not the same string as the
 *    URL that gets fetched, because Next percent-decodes segments first.
 *
 * 3. **Nothing from the service's internals is forwarded.** Its error handler
 *    is `detail=str(e)`, so upstream provider URLs, whole pydantic validation
 *    dumps and its own API-key configuration message reach the caller verbatim;
 *    and every success carries `run_dir`, an absolute server filesystem path.
 *    Responses are re-serialised from a field allow-list and failures carry
 *    their status and nothing else.
 *
 * What this route does NOT do, stated plainly: it is not an authorization
 * boundary and not a spend control. The panel has no authentication, so
 * anyone who can reach the panel can reach these two reads. It is a
 * transport boundary and a disclosure boundary. Keep the dev server on
 * loopback.
 */

// Request-time rendering, so the gate below reads the runtime environment
// rather than a value baked in at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The machine's own id form, `uuid4().hex` truncated to twelve. */
const SESSION_ID = /^[a-f0-9]{12}$/;

/** The service blocks for as long as its own upstream call allows. */
const UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * The configured origin, or null when the feature is off.
 *
 * `DROP_MACHINE_BASE_URL` is read here and nowhere else, and this module is a
 * server route handler, so it never reaches a client bundle. Only the ORIGIN is
 * kept: any path, query or fragment an operator leaves on the value is
 * discarded rather than concatenated into the request.
 */
function machineOrigin(): string | null {
  const raw = process.env.DROP_MACHINE_BASE_URL;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** Absent config is indistinguishable from a route that does not exist. */
function off(): NextResponse {
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

/**
 * Resolves the allow-listed segments to one of exactly two upstream paths.
 *
 * Returns null for everything else — including a path that merely LOOKS right,
 * such as a session id of the wrong shape. The service interpolates that id
 * into a filesystem path and validates nothing, so this is the only place it
 * is checked before it gets there.
 */
function resolveUpstreamPath(segments: readonly string[]): string | null {
  if (segments.length === 1 && segments[0] === "health") return "/health";
  if (segments.length === 2 && segments[0] === "sessions") {
    const id = segments[1];
    if (typeof id === "string" && SESSION_ID.test(id)) return "/sessions/" + id;
  }
  return null;
}

/** The fields of the machine's `SessionState` the projection actually reads. */
const SESSION_FIELDS = [
  "session_id",
  "status",
  "input",
  "concept_rounds",
  "approved_concept_id",
  "approved_concept",
  "portfolio",
] as const;

const HEALTH_FIELDS = ["status", "backend"] as const;

function pick(body: unknown, fields: readonly string[]): Record<string, unknown> {
  if (typeof body !== "object" || body === null) return {};
  const source = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.hasOwn(source, field)) out[field] = source[field];
  }
  return out;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const origin = machineOrigin();
  if (origin === null) return off();

  const { path } = await context.params;
  const upstreamPath = resolveUpstreamPath(path ?? []);
  if (upstreamPath === null) return off();

  let response: Response;
  try {
    response = await fetch(origin + upstreamPath, {
      method: "GET",
      // No client headers are forwarded. Nothing the caller sends reaches the
      // service, so nothing the caller sends can influence it.
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Unreachable, refused, or over the deadline. The adapter turns 503 into
    // MACHINE_SYSTEM_DISCONNECTED, which the panel renders as a degraded
    // banner over the last good content rather than an empty page.
    return NextResponse.json({ error: "UPSTREAM_UNREACHABLE" }, { status: 503 });
  }

  if (!response.ok) {
    // The status travels; the body does not.
    return NextResponse.json({ error: "UPSTREAM_ERROR" }, { status: response.status });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return NextResponse.json({ error: "UPSTREAM_NOT_JSON" }, { status: 502 });
  }

  const fields = upstreamPath === "/health" ? HEALTH_FIELDS : SESSION_FIELDS;
  return NextResponse.json(pick(body, fields), {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
