"use client";

import { machineWriteError } from "@drop/machine-gateway";

/**
 * Starting a new machine session from the panel (ticket P10, slice 2).
 *
 * This is what «شروع کانسپت جدید» means once writes exist, and it is three
 * calls rather than one because the machine's own shape makes it three.
 *
 * It also fixes something the first cut of the write path got wrong. Generation
 * takes its brief from the SESSION, not from the request:
 * `generate_concepts(session_id)` reads `state.input` and the endpoint carries
 * no body at all. So generating into an already-created session ignores
 * whatever the person just typed — they would write a brief, press the button,
 * and get concepts for the empty string. The brief only reaches the machine
 * through `create_session`, which is why a new brief must mean a new session.
 *
 * The final step is a FULL navigation, deliberately. `DemoProviders` is mounted
 * in the studio LAYOUT, and a layout does not remount on a client-side
 * navigation — so a `router.push` would leave the panel rendering the previous
 * session under the new session's cookie. Reloading the document is also the
 * honest semantics: a different session is a different world.
 */

/** Sent on every write so a cross-origin page cannot forge one. See the proxy. */
const WRITE_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-drop-machine-write": "1",
} as const;

export interface StartedSession {
  readonly sessionId: string;
}

async function post(path: string, body: unknown, what: string, method = "POST"): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("/api/machine" + path, {
      method,
      headers: WRITE_HEADERS,
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    // Offline, aborted, or the dev server went away. The same status-0 signal
    // the browser port uses, so it renders as «ارتباط برقرار نیست» rather than
    // as an unknown error.
    throw machineWriteError(0, null, what);
  }
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // The proxy answers JSON for every refusal it authors; a body that is not
    // JSON came from somewhere else, and the status is all there is to say.
    parsed = null;
  }
  /*
    A GatewayError, through the SAME mapping every other machine write uses.

    This used to throw `new Error(code)` with the proxy's reason string as the
    message, and `commandErrorFa` — which keys on `GatewayError.reason` and can
    read nothing else — rendered every one of them as «خطای ناشناخته‌ای رخ داد».
    So the one path into the product in REAL mode reported a spent budget, a
    lock held by an earlier request, and a write still running upstream all as
    the same unknown failure. The proxy drew every one of those distinctions;
    they were thrown away one call later.
  */
  if (!response.ok) throw machineWriteError(response.status, parsed, what);
  return parsed;
}

/**
 * Creates a session from the brief, makes it the one the panel shows, and asks
 * for concepts. Returns only once the machine has answered.
 *
 * The order matters. The cookie is set BEFORE generation, so a generate that
 * runs long — or times out at the proxy while the model keeps going — still
 * leaves the panel pointed at the session that work is landing in. The
 * ten-second poll then shows it arriving. Setting the cookie afterwards would
 * lose the session on exactly the calls most worth not losing.
 */
export async function startMachineSession(brief: string): Promise<StartedSession> {
  const created = await post("/sessions", { brief }, "create a session");
  const sessionId =
    typeof created === "object" && created !== null
      ? (created as Record<string, unknown>).session_id
      : undefined;
  if (typeof sessionId !== "string") {
    throw machineWriteError(502, { error: "UPSTREAM_NOT_JSON" }, "create a session");
  }

  await post("/current", { sessionId }, "switch to the new session", "PUT");
  await post(
    `/sessions/${sessionId}/concepts/generate`,
    { expectedRounds: 0, expectedStatus: "DRAFT" },
    "generate concepts",
  );
  return { sessionId };
}

/**
 * Points the panel at a session that already exists, then reloads.
 *
 * The way BACK. Starting a session repoints the cookie and the previous one
 * left the panel with no control anywhere that could return to it — the only
 * caller of `/current` was the start above. Settings lists the sessions this
 * browser has started (see `session-history.ts`) and each row calls this.
 */
export async function switchMachineSession(sessionId: string): Promise<void> {
  await post("/current", { sessionId }, "switch session", "PUT");
}

/**
 * Forgets the chosen session. The panel falls back to the configured default,
 * or to the demo world when there is none.
 */
export async function forgetMachineSession(): Promise<void> {
  await post("/current", {}, "forget the chosen session", "DELETE");
}
