import type { MachineHttpPort, MachineHttpResult } from "@drop/machine-gateway";

/**
 * The browser half of the machine transport (ticket P10, slice 1).
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

async function read(path: string): Promise<MachineHttpResult> {
  let response: Response;
  try {
    response = await fetch(PROXY + path, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
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

export function createBrowserMachinePort(): MachineHttpPort {
  return {
    // The id is validated by the client before it arrives here and again by the
    // route handler. `encodeURIComponent` is belt to those braces: a value that
    // somehow reached this point could not break out of the path segment.
    getSession: (sessionId: string) => read("/sessions/" + encodeURIComponent(sessionId)),
  };
}
