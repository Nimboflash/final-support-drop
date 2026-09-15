import type {
  MachineApproveInput,
  MachineBuildInput,
  MachineHttpPort,
  MachineHttpResult,
  MachineRespondInput,
  MachineWritePrecondition,
} from "@drop/machine-gateway";

/**
 * The browser half of the machine transport (ticket P10; writes are slice 2).
 *
 * `packages/machine-gateway` cannot name `fetch` — its `lib` is exactly
 * `["ES2023"]` and it declares no `types`, so the DOM and Node globals do not
 * exist in its type environment at all. That is the point: the adapter says
 * what it needs and this module supplies it, the same split
 * `apps/web/lib/demo/browser-ports.ts` already uses for storage.
 *
 * Every URL here is a RELATIVE, same-origin path. The machine's real address
 * lives in `DROP_MACHINE_BASE_URL`, is read only by the route handler, and
 * therefore never reaches a client bundle (AC-P10.1).
 */

/** The same-origin proxy. Not configurable, because a configurable one is an SSRF. */
const PROXY = "/api/machine";

/**
 * The header that makes a write impossible to forge from another origin.
 *
 * A CORS *simple request* — the kind a browser sends cross-origin with no
 * preflight — cannot carry a custom header. Sending one means the browser must
 * ask permission first, and the proxy answers no preflight affirmatively, so a
 * write fired from a page the user happens to have open never leaves it.
 *
 * It is not a secret and is not treated as one: an attacker who is not a
 * browser sets it freely. It closes the browser-forgery shape, and the route's
 * docblock says plainly what remains open.
 */
const WRITE_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-drop-machine-write": "1",
} as const;

async function send(
  path: string,
  init: { readonly method: string; readonly body?: string },
): Promise<MachineHttpResult> {
  let response: Response;
  try {
    response = await fetch(PROXY + path, {
      method: init.method,
      headers: init.body === undefined ? { accept: "application/json" } : WRITE_HEADERS,
      body: init.body,
      cache: "no-store",
      // Same-origin only. A redirect off this origin is not something a write
      // to the owner's machine should ever follow.
      redirect: "error",
    });
  } catch {
    // Offline, aborted, or the dev server went away. Status 0 is the adapter's
    // agreed signal for "no answer at all", which it turns into
    // MACHINE_SYSTEM_DISCONNECTED rather than letting a raw TypeError escape.
    return { status: 0, body: null };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/** The id is percent-encoded so a value that reached here cannot leave its segment. */
const at = (sessionId: string): string => "/sessions/" + encodeURIComponent(sessionId);

export function createBrowserMachinePort(): MachineHttpPort {
  return {
    // The id is validated by the client before it arrives here and again by the
    // route handler. `encodeURIComponent` is belt to those braces: a value that
    // somehow reached this point could not break out of the path segment.
    getSession: (sessionId: string) => send(at(sessionId), { method: "GET" }),

    createSession: (brief: string) =>
      send("/sessions", { method: "POST", body: JSON.stringify({ brief }) }),

    generateConcepts: (sessionId: string, input: MachineWritePrecondition) =>
      send(at(sessionId) + "/concepts/generate", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    respondToConcepts: (sessionId: string, input: MachineRespondInput) =>
      send(at(sessionId) + "/concepts/respond", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    // No concept id in the path: the body carries an INDEX, and the proxy turns
    // it into the service's own id. See `MachineHttpPort.approveConcept`.
    approveConcept: (sessionId: string, input: MachineApproveInput) =>
      send(at(sessionId) + "/concepts/approve", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    buildPortfolio: (sessionId: string, input: MachineBuildInput) =>
      send(at(sessionId) + "/portfolio/build", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}
