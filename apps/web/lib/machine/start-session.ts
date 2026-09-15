"use client";

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

async function post(path: string, body: unknown, method = "POST"): Promise<unknown> {
  const response = await fetch("/api/machine" + path, {
    method,
    headers: WRITE_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) {
    let code = String(response.status);
    try {
      const parsed: unknown = await response.json();
      if (typeof parsed === "object" && parsed !== null) {
        const named = (parsed as Record<string, unknown>).error;
        if (typeof named === "string") code = named;
      }
    } catch {
      // The proxy answers JSON for every refusal it authors; a body that is not
      // JSON came from somewhere else, and the status is all there is to say.
    }
    throw new Error(code);
  }
  return response.json();
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
  const created = await post("/sessions", { brief });
  const sessionId =
    typeof created === "object" && created !== null
      ? (created as Record<string, unknown>).session_id
      : undefined;
  if (typeof sessionId !== "string") throw new Error("UPSTREAM_NOT_JSON");

  await post("/current", { sessionId }, "PUT");
  await post(`/sessions/${sessionId}/concepts/generate`, {
    expectedRounds: 0,
    expectedStatus: "DRAFT",
  });
  return { sessionId };
}
