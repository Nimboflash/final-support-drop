import { NextResponse } from "next/server";
import { machineSessionSchema } from "@drop/panel-domain";
import {
  acquireWriteLock,
  releaseWriteLock,
  roundBudget,
  withinRoundBudget,
} from "../../../../lib/machine/session-write-lock";
import { classifyUpstreamFailure, type UpstreamFailure } from "../../../../lib/machine/upstream-failure";

/**
 * The same-origin boundary in front of the concept-portfolio service
 * (ticket P10, AC-P10.1; writes are slice 2).
 *
 * This is not a convenience. The service ships **no CORS middleware and no
 * authentication of any kind** — `api.py` constructs a bare `FastAPI()` with no
 * `add_middleware`, no `Depends`, and `/docs` and `/openapi.json` live and
 * public. A browser cannot call it cross-origin, and nothing but this route
 * stands between whoever can reach the panel and a service that spends the
 * owner's model budget per request.
 *
 * Four rules, each answering a specific way this could be got wrong:
 *
 * 1. **A closed verb set, and a closed path set.** `GET` reads; `POST` writes.
 *    No other verb is exported, and `OPTIONS` staying unexported is what makes
 *    a cross-origin preflight fail — see rule 2. Every reachable upstream path
 *    is a literal template below; there is no fifth.
 *
 * 2. **No write can be a CORS *simple request*.** This was the live danger:
 *    the service's `concepts/generate` takes NO request body, and a bodyless
 *    POST is a shape any page the user has open can fire with `mode: "no-cors"`,
 *    burning credits and never seeing the response. The fix is structural
 *    rather than a filter — the proxy has no bodyless write. Every write needs
 *    `content-type: application/json`, a non-empty JSON body, and the custom
 *    header `x-drop-machine-write`. Each of those forces a preflight
 *    cross-origin, and this route answers none affirmatively, so the browser
 *    never sends the real request. Two further checks, `origin` and
 *    `sec-fetch-site`, both fail-closed, catch anything that arrives anyway.
 *
 * 3. **The upstream URL is never built from user input.** There are literal
 *    templates below and no concatenation of caller segments. This is not
 *    paranoia about a hypothetical: `new URL("//evil.example/x", base)` resolves
 *    to `http://evil.example/x`, and `new URL("../../admin", base)` climbs out
 *    of the prefix. Note especially that the write paths carry NO concept
 *    segment: `concept_id` is minted by the MODEL (`prompts.py` declares it as
 *    a bare `{"type": "string"}` — no pattern, no uniqueness), so it is not a
 *    value any layer could validate. The caller sends an integer index and the
 *    proxy resolves it against the session it reads itself, so the id that
 *    reaches the upstream URL is one the SERVICE produced.
 *
 * 4. **Nothing from the service's internals is forwarded.** Its error handler
 *    is `detail=str(e)`, so upstream provider URLs, whole pydantic validation
 *    dumps and its own API-key configuration message reach the caller verbatim;
 *    and every success carries `run_dir`, an absolute server filesystem path.
 *    Responses are re-serialised from a field allow-list and failures carry
 *    their status and nothing else.
 *
 * What this route does NOT do, stated plainly: it is not an authorization
 * boundary and not a spend control. The panel has no authentication, so anyone
 * who can reach the panel can reach these routes, and a non-browser caller
 * (curl, a script) sets every header the checks look at. It is a transport
 * boundary and a disclosure boundary. Keep the dev server on loopback, and put
 * authentication in front of `/api/machine` before writes are ever enabled
 * anywhere else.
 */

// Request-time rendering, so the gates below read the runtime environment
// rather than values baked in at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The machine's own id form, `uuid4().hex` truncated to twelve. */
const SESSION_ID = /^[a-f0-9]{12}$/;

/** Reads, and the one write that only touches the filesystem. */
const UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * Writes that reach a model — sized to what each one is OBSERVED to take.
 *
 * Not to the service's `http_timeout`. That value (default 180s) is what
 * `backends/openrouter.py` hands `requests` as `timeout=`, and it is a per-
 * socket connect/read INACTIVITY limit, not a wall clock: the provider keeps
 * the connection alive while it works, so a five-minute call never trips it.
 * The first deadline here was set "just above 180s" on the belief that the
 * service could not outlast it, and the owner's first two live builds — 251s
 * and 313s — both finished on the service and both 504'd at the proxy. The
 * person was told the write might still be running; it was, and it landed
 * seconds later, and they had no way to know that except to wait.
 *
 * A shorter deadline saves nothing — the service has no cancellation, so the
 * spend and the file write continue regardless — so each is the observed
 * latency with room: a concept round runs ~40s, a portfolio build ~5 minutes.
 * `session-write-lock.ts` must outlive the longest of these; the guard in
 * `tests/repo/machine-boundary.test.ts` holds the two together.
 */
const MODEL_TIMEOUT_MS = 195_000;
const BUILD_TIMEOUT_MS = 540_000;

/** The largest write body the proxy will read, before it reads it. */
const MAX_BODY_BYTES = 8 * 1024;

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

/**
 * Writes are off unless switched on, mirroring the provider-key route's gate.
 *
 * Default-off because the dangerous step should be deliberate: this is the
 * surface that spends money, and the panel has no authentication to put in
 * front of it.
 */
function writesEnabled(): boolean {
  if (process.env.DROP_MACHINE_WRITES === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** Absent config is indistinguishable from a route that does not exist. */
function off(): NextResponse {
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

function refused(reason: string, status: number, upstream?: UpstreamFailure): NextResponse {
  return NextResponse.json(
    upstream === undefined ? { error: reason } : { error: reason, upstream },
    { status },
  );
}

/**
 * Resolves the allow-listed segments to a READ path.
 *
 * Returns null for everything else — including a path that merely LOOKS right,
 * such as a session id of the wrong shape. The service interpolates that id
 * into a filesystem path and validates nothing, so this is the only place it
 * is checked before it gets there.
 */
function resolveUpstreamPath(segments: readonly string[]): string | null {
  // Exactly one reachable path. `/health` used to be here; it does not exist,
  // because the vendored service is the owner's VERBATIM (ADR-0021 D2) and
  // adding a route to it was a modification that has since been reverted.
  if (segments.length === 2 && segments[0] === "sessions") {
    const id = segments[1];
    if (typeof id === "string" && SESSION_ID.test(id)) return "/sessions/" + id;
  }
  return null;
}

type WriteKind = "create" | "generate" | "respond" | "approve" | "build";

interface WriteTarget {
  readonly kind: WriteKind;
  /** Null only for `create`, which has no session yet. */
  readonly sessionId: string | null;
  /** Whether this call reaches a model and therefore costs money. */
  readonly spends: boolean;
  /** How long the proxy waits for it. See the deadlines above. */
  readonly deadlineMs: number;
}

/**
 * Resolves the allow-listed segments to a WRITE target.
 *
 * Four shapes and no more. Note what is absent: no concept segment, so no
 * model-authored string can ever reach a URL through this door.
 */
function resolveWriteTarget(segments: readonly string[]): WriteTarget | null {
  if (segments.length === 1 && segments[0] === "sessions") {
    return { kind: "create", sessionId: null, spends: false, deadlineMs: UPSTREAM_TIMEOUT_MS };
  }
  if (segments.length !== 4 || segments[0] !== "sessions") return null;
  const id = segments[1];
  if (typeof id !== "string" || !SESSION_ID.test(id)) return null;

  if (segments[2] === "concepts") {
    if (segments[3] === "generate") return { kind: "generate", sessionId: id, spends: true, deadlineMs: MODEL_TIMEOUT_MS };
    if (segments[3] === "respond") return { kind: "respond", sessionId: id, spends: true, deadlineMs: MODEL_TIMEOUT_MS };
    // Free: `approve_concept` only rewrites the session file.
    if (segments[3] === "approve") return { kind: "approve", sessionId: id, spends: false, deadlineMs: UPSTREAM_TIMEOUT_MS };
    return null;
  }
  if (segments[2] === "portfolio" && segments[3] === "build") {
    return { kind: "build", sessionId: id, spends: true, deadlineMs: BUILD_TIMEOUT_MS };
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

function pick(body: unknown, fields: readonly string[]): Record<string, unknown> {
  if (typeof body !== "object" || body === null) return {};
  const source = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.hasOwn(source, field)) out[field] = source[field];
  }
  return out;
}

function sessionResponse(body: unknown): NextResponse {
  return NextResponse.json(pick(body, SESSION_FIELDS), {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}

/**
 * The ONE place this module calls the service. Both verbs come through here.
 *
 * Keeping a single call site is what lets `tests/repo/machine-boundary.test.ts`
 * assert "exactly one fetch" and have that mean "there is no second path into
 * the service", rather than meaning "there was one when the test was written".
 */
async function callUpstream(
  origin: string,
  upstreamPath: string,
  init: { readonly method: string; readonly body?: string; readonly timeoutMs: number },
): Promise<Response | null> {
  try {
    return await fetch(origin + upstreamPath, {
      method: init.method,
      // No client headers are forwarded. Nothing the caller sends reaches the
      // service, so nothing the caller sends can influence it.
      headers:
        init.body === undefined
          ? { accept: "application/json" }
          : { accept: "application/json", "content-type": "application/json" },
      body: init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs),
    });
  } catch {
    return null;
  }
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

  const response = await callUpstream(origin, upstreamPath, {
    method: "GET",
    timeoutMs: UPSTREAM_TIMEOUT_MS,
  });
  if (response === null) {
    // Unreachable, refused, or over the deadline. The adapter turns 503 into
    // MACHINE_SYSTEM_DISCONNECTED, which the panel renders as a degraded
    // banner over the last good content rather than an empty page.
    return refused("UPSTREAM_UNREACHABLE", 503);
  }

  if (!response.ok) {
    // The status travels; the body does not.
    return refused("UPSTREAM_ERROR", response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return refused("UPSTREAM_NOT_JSON", 502);
  }

  return sessionResponse(body);
}

/**
 * The four forgery checks, all of which must pass.
 *
 * They fail differently on purpose. The custom header and the JSON content-type
 * defend by PREFLIGHT — cross-origin the browser asks first, is not given an
 * affirmative answer, and never sends the real request. `origin` and
 * `sec-fetch-site` defend ON ARRIVAL, so a browser-side CORS regression, a
 * framework change, or a future middleware that starts answering OPTIONS does
 * not take the whole defence down at once.
 *
 * Every one fails closed when its header is absent. For a surface that spends
 * the owner's budget that is the right side to fail on.
 */
function sameOriginWrite(request: Request): boolean {
  if (request.headers.get("x-drop-machine-write") !== "1") return false;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const site = request.headers.get("sec-fetch-site");
  if (site !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const expected = process.env.DROP_PANEL_ORIGIN;
  if (typeof expected === "string" && expected.trim() !== "") {
    return origin === expected.trim();
  }
  // Parsed rather than string-built. Comparing against a concatenated scheme
  // would put a literal scheme-and-slashes in this file, and `codeOnly()` in
  // `tests/repo/machine-boundary.test.ts` strips line comments BEFORE string
  // literals — so those two slashes inside a string read as the start of a
  // comment, ate the rest of the line, unbalanced every quote after it and
  // deleted this whole handler from what the guard could see. The guard went
  // green while asserting over a file it had silently truncated.
  const host = request.headers.get("host");
  if (host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads at most `MAX_BODY_BYTES`, and refuses rather than truncating. */
async function readCappedJson(request: Request): Promise<Record<string, unknown> | null> {
  const raw = await request.text();
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asIndex(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 0 && value < max ? value : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const origin = machineOrigin();
  if (origin === null || !writesEnabled()) return off();
  if (!sameOriginWrite(request)) return refused("WRITE_REFUSED", 403);

  const { path } = await context.params;
  const target = resolveWriteTarget(path ?? []);
  if (target === null) return off();

  const body = await readCappedJson(request);
  if (body === null) return refused("BODY_REJECTED", 400);

  // `create` is the one write with no session to lock and nothing to spend.
  if (target.kind === "create") {
    const brief = typeof body.brief === "string" ? body.brief.slice(0, 4_000) : "";
    const created = await callUpstream(origin, "/sessions", {
      method: "POST",
      body: JSON.stringify({ project_brief: brief }),
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    });
    if (created === null) return refused("UPSTREAM_UNREACHABLE", 503);
    if (!created.ok) return refused("UPSTREAM_ERROR", created.status);
    let createdBody: unknown;
    try {
      createdBody = await created.json();
    } catch {
      return refused("UPSTREAM_NOT_JSON", 502);
    }
    return sessionResponse(createdBody);
  }

  const sessionId = target.sessionId;
  if (sessionId === null) return off();

  const now = Date.now();
  const lock = acquireWriteLock(sessionId, { spends: target.spends, now });
  if (!lock.ok) return refused(lock.reason, 409);

  let outcome: "settled" | "unknown" = "settled";
  try {
    // Read the session the write is about to change, under the lock. This is
    // what makes check-then-act atomic for this process, and it is also where
    // an integer index becomes the service's own concept id.
    const current = await callUpstream(origin, "/sessions/" + sessionId, {
      method: "GET",
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    });
    if (current === null) return refused("UPSTREAM_UNREACHABLE", 503);
    if (!current.ok) return refused("UPSTREAM_ERROR", current.status);

    let currentBody: unknown;
    try {
      currentBody = await current.json();
    } catch {
      return refused("UPSTREAM_NOT_JSON", 502);
    }
    const parsed = machineSessionSchema.safeParse(currentBody);
    if (!parsed.success) return refused("UPSTREAM_NOT_JSON", 502);
    const session = parsed.data;

    // The caller's belief about the session, checked against the session. Both
    // fields are needed: `build` changes `status` and `portfolio` WITHOUT
    // appending a round, so a rounds-only check lets a second build through and
    // pays for a second portfolio over the top of the first.
    const rounds = session.concept_rounds.length;
    if (body.expectedRounds !== rounds || body.expectedStatus !== session.status) {
      return refused("SESSION_MOVED", 409);
    }

    // The durable spend ceiling. Only the paid calls are capped; `approve`
    // stays reachable so a session that has spent its budget can be finished.
    if (target.spends && !withinRoundBudget(rounds)) {
      return NextResponse.json(
        { error: "PAID_CALL_BUDGET", limit: roundBudget() },
        { status: 409 },
      );
    }

    let upstreamPath: string;
    let upstreamBody: string | undefined;

    if (target.kind === "generate") {
      upstreamPath = "/sessions/" + sessionId + "/concepts/generate";
    } else if (target.kind === "respond") {
      const latest = session.concept_rounds[rounds - 1];
      const cards = latest?.concepts ?? [];
      const rawLiked: unknown = body.likedConceptIndexes;
      if (!Array.isArray(rawLiked)) return refused("BODY_REJECTED", 400);
      const liked: string[] = [];
      for (const value of rawLiked) {
        const index = asIndex(value, cards.length);
        if (index === null) return refused("BODY_REJECTED", 400);
        liked.push(cards[index]!.concept_id);
      }
      const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 2_000) : "";
      upstreamPath = "/sessions/" + sessionId + "/concepts/respond";
      upstreamBody = JSON.stringify({
        action: "refine",
        liked_concept_ids: liked,
        feedback,
      });
    } else if (target.kind === "approve") {
      const latest = session.concept_rounds[rounds - 1];
      const cards = latest?.concepts ?? [];
      const index = asIndex(body.conceptIndex, cards.length);
      if (index === null) return refused("BODY_REJECTED", 400);
      // The service's own string, from the session this proxy just read.
      const conceptId = encodeURIComponent(cards[index]!.concept_id);
      upstreamPath = "/sessions/" + sessionId + "/concepts/" + conceptId + "/approve";
    } else {
      if (session.portfolio !== null && body.replaceExistingPortfolio !== true) {
        return refused("PORTFOLIO_EXISTS", 409);
      }
      upstreamPath = "/sessions/" + sessionId + "/portfolio/build";
    }

    const response = await callUpstream(origin, upstreamPath, {
      method: "POST",
      body: upstreamBody,
      timeoutMs: target.deadlineMs,
    });

    if (response === null) {
      if (target.spends) {
        // The deadline passed, and nothing upstream was cancelled: FastAPI ran
        // the endpoint in a threadpool and a disconnect does not kill it, so
        // the model call finishes and the file is written minutes from now.
        // The lock is NOT given back — see `releaseWriteLock`.
        outcome = "unknown";
        return refused("WRITE_MAY_STILL_BE_RUNNING", 504);
      }
      return refused("UPSTREAM_UNREACHABLE", 503);
    }
    if (!response.ok) {
      /*
        The status travels; the body's WORDS do not (machine-boundary). But
        the body is read, once, and reduced to a closed-set classification —
        because without it an expired provider key arrived here as a bare 400,
        the adapter read that as "the session moved", and the person was told
        to refresh the page. Kind and a status number cross; nothing else.

        The operator's terminal gets those same two values. Not the text: the
        service's text can carry the whole brief.
      */
      const failure = classifyUpstreamFailure(await response.json().catch(() => null));
      console.warn(
        "[machine] " +
          upstreamPath +
          " answered " +
          String(response.status) +
          " (" +
          failure.kind +
          (failure.providerStatus === null ? "" : " " + String(failure.providerStatus)) +
          ")",
      );
      return refused("UPSTREAM_ERROR", response.status, failure);
    }

    let written: unknown;
    try {
      written = await response.json();
    } catch {
      return refused("UPSTREAM_NOT_JSON", 502);
    }
    return sessionResponse(written);
  } finally {
    releaseWriteLock(sessionId, outcome);
  }
}
