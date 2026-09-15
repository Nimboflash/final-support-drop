import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * What the PANEL knows about a machine session (ticket P10, slice 2).
 *
 * The machine records no per-item approval and no publication date — its five
 * calls have no notion of either — so the panel keeps them. They lived in
 * `localStorage` first, which made them per-browser and per-device: approve
 * your content on one machine and none of it exists on the next. The setup
 * guide could only warn about it.
 *
 * They live beside the SESSION now, in its own run directory, which is where a
 * decision about a session belongs. It travels with the session, survives a
 * cleared browser, and is readable by anything else looking at that run.
 *
 * The vendored service is untouched (ADR-0021 D2). This writes a SIBLING file
 * that the service never reads and never writes — `session_state.json` remains
 * entirely the machine's, and `panel-notes.json` entirely the panel's. Nothing
 * here can corrupt a session, because nothing here opens one.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The machine's own id form.
 *
 * This value becomes a PATH SEGMENT, so the pattern is the whole of the
 * traversal defence: twelve hex characters cannot contain a dot, a slash, a
 * backslash or a percent-encoded anything. Nothing that fails it is touched.
 */
const SESSION_ID = /^[a-f0-9]{12}$/;

/** Notes are small by nature — decisions and dates, never content. */
const MAX_BYTES = 256 * 1024;

const NOTES_FILE = "panel-notes.json";

/** Off unless the machine is configured at all, so this route simply is not there. */
function configured(): boolean {
  const raw = process.env.DROP_MACHINE_BASE_URL;
  return typeof raw === "string" && raw.trim() !== "";
}

/**
 * Where the machine keeps its runs.
 *
 * `process.cwd()` is `apps/web` under both `next dev` and `next start`, which is
 * the same assumption `app/api/provider-key/route.ts` already makes. The
 * resolved path is checked to be INSIDE the runs root — belt to the braces of
 * the id pattern above, so a future change to that pattern cannot silently turn
 * this into an arbitrary-write.
 */
function notesPathFor(sessionId: string): string | null {
  const configuredDir = process.env.DROP_RUNS_DIR;
  const root = resolve(
    typeof configuredDir === "string" && configuredDir.trim() !== ""
      ? configuredDir.trim()
      : join(process.cwd(), "..", "..", "drop_runs"),
  );
  const path = resolve(join(root, sessionId, NOTES_FILE));
  return path.startsWith(root + "/") ? path : null;
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

/**
 * The same four forgery checks the write proxy applies.
 *
 * This spends nothing, but it decides what the panel believes a person
 * approved. A page that could write here could mark a person's content
 * approved without them, and an output assembles from approvals.
 */
function sameOriginWrite(request: Request): boolean {
  if (request.headers.get("x-drop-machine-write") !== "1") return false;
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;
  if (request.headers.get("sec-fetch-site") !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const expected = process.env.DROP_PANEL_ORIGIN;
  if (typeof expected === "string" && expected.trim() !== "") {
    return origin === expected.trim();
  }
  const host = request.headers.get("host");
  if (host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  if (!configured()) return notFound();
  const { sessionId } = await context.params;
  if (!SESSION_ID.test(sessionId)) return notFound();

  const path = notesPathFor(sessionId);
  if (path === null || !existsSync(path)) {
    // Absent is not an error: a session nobody has reviewed yet has no notes,
    // and the caller reads that as "no decisions", which is correct.
    return NextResponse.json({ notes: null }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const raw = readFileSync(path, "utf8");
    if (raw.length > MAX_BYTES) return NextResponse.json({ notes: null });
    return NextResponse.json({ notes: raw }, { headers: { "cache-control": "no-store" } });
  } catch {
    // A file that cannot be read must not take the surface down with it. The
    // caller degrades to "no decisions", which loses the overlay and keeps the
    // session readable — the same trade the browser store already made.
    return NextResponse.json({ notes: null }, { headers: { "cache-control": "no-store" } });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  if (!configured()) return notFound();
  if (!sameOriginWrite(request)) {
    return NextResponse.json({ error: "WRITE_REFUSED" }, { status: 403 });
  }

  const { sessionId } = await context.params;
  if (!SESSION_ID.test(sessionId)) return notFound();

  const raw = await request.text();
  if (raw.length === 0 || raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "BODY_REJECTED" }, { status: 400 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "BODY_REJECTED" }, { status: 400 });
  }
  const notes =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>).notes
      : undefined;
  // Stored as the caller's own string. This route does not interpret the
  // notes — their shape belongs to `review-store.ts`, which re-validates
  // everything on the way back in because stored state is untrusted input.
  if (typeof notes !== "string" || notes.length > MAX_BYTES) {
    return NextResponse.json({ error: "BODY_REJECTED" }, { status: 400 });
  }

  const path = notesPathFor(sessionId);
  if (path === null) return notFound();

  try {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, notes, { encoding: "utf8", mode: 0o600 });
  } catch {
    return NextResponse.json({ error: "WRITE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
