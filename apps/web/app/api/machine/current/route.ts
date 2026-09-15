import { NextResponse } from "next/server";

/**
 * Which machine session the panel is looking at (ticket P10, slice 2).
 *
 * ADR-0021 D5 made REAL mode something entered by CONFIGURATION and nothing
 * else, and gave three concrete reasons a `?session=` query parameter was the
 * wrong answer: the sidebar's links carry no query, so the mode vanished on the
 * first click; `DemoProviders` is mounted in the studio LAYOUT, which does not
 * remount on a client navigation, so the URL and the world disagreed; and the
 * server pass has no `window`, so SSR built a different world than the client.
 *
 * All three are really one problem — the answer has to be readable ON THE
 * SERVER, during the layout's own render. A cookie is; `searchParams` in a
 * layout is not. So the session id moves into an httpOnly cookie that this
 * route sets, `DROP_MACHINE_SESSION_ID` stays as the default it overrides, and
 * the layout resolves both in one place and hands the answer down as a prop —
 * exactly the mechanism that already keeps SSR and hydration in agreement.
 *
 * Switching sessions is then a FULL navigation, which is also the honest
 * semantics: a different session is a different world, and reseeding it from
 * scratch is what should happen.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The machine's own id form, `uuid4().hex` truncated to twelve. */
const SESSION_ID = /^[a-f0-9]{12}$/;

export const MACHINE_SESSION_COOKIE = "drop_machine_session";

/** Off unless the machine is configured at all. */
function configured(): boolean {
  const raw = process.env.DROP_MACHINE_BASE_URL;
  return typeof raw === "string" && raw.trim() !== "";
}

/**
 * The same four checks the write proxy applies, and for the same reason.
 *
 * This route sets no model call in motion, so it spends nothing — but it
 * decides which session every subsequent write lands on, and a page that can
 * silently repoint the panel at a session of its choosing is a page that can
 * make the owner's next generate write somewhere they did not intend.
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

function cookieOptions(): {
  httpOnly: true;
  sameSite: "strict";
  path: string;
  maxAge: number;
} {
  return {
    // Unreadable from script: nothing in the panel needs to read it, and the
    // less a client bundle knows about the machine the better.
    httpOnly: true,
    // `strict` because there is no flow that should arrive here from elsewhere.
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!configured()) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!sameOriginWrite(request)) {
    return NextResponse.json({ error: "WRITE_REFUSED" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BODY_REJECTED" }, { status: 400 });
  }
  const sessionId =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).sessionId
      : undefined;
  // Validated here as well as everywhere else it travels. The service uses this
  // value as a filesystem path segment and checks nothing of its own.
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: "BODY_REJECTED" }, { status: 400 });
  }

  const response = NextResponse.json({ sessionId }, { status: 200 });
  response.cookies.set(MACHINE_SESSION_COOKIE, sessionId, cookieOptions());
  return response;
}

/** Forgets the current session; the panel falls back to the configured default. */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (!configured()) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!sameOriginWrite(request)) {
    return NextResponse.json({ error: "WRITE_REFUSED" }, { status: 403 });
  }
  const response = NextResponse.json({ sessionId: null }, { status: 200 });
  response.cookies.set(MACHINE_SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
