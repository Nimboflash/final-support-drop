import { machineSessionSchema, type MachineSession } from "@drop/panel-domain";
import { GatewayError } from "../errors";
import type {
  MachineApproveInput,
  MachineBuildInput,
  MachineHttpPort,
  MachineHttpResult,
  MachineRespondInput,
  MachineWritePrecondition,
} from "./machine-http-port";

/**
 * Typed reads of the concept-portfolio service (ADR-0021 D6).
 *
 * Everything the service returns is untrusted input, and everything it can go
 * wrong with becomes a `GatewayError` carrying one of the eight RECORDED
 * reasons. That last part is not tidiness — `apps/web/components/panel/
 * states.tsx` reaches the degraded-mode branch (content stays on screen under a
 * banner) only for a `GatewayError`. A raw `TypeError: fetch failed` or a
 * `ZodError` escaping this module falls through to the generic error state and
 * WIPES the panel. So every failure is translated here, at the boundary, and
 * none is allowed past it untranslated.
 */

/**
 * The machine's own id form: `uuid4().hex[:12]`.
 *
 * Checked before the id is used for anything, because the service uses it as a
 * filesystem path segment and validates nothing (`session_service.py:35`).
 */
export const MACHINE_SESSION_ID = /^[a-f0-9]{12}$/;

export function isMachineSessionId(value: string): boolean {
  return MACHINE_SESSION_ID.test(value);
}

/**
 * Maps a transport result onto the closed reason set.
 *
 * The service's status codes are not the ones you would guess, so this is
 * written from its source rather than from convention: a missing session is
 * **400** on every POST and **404** only on `GET /sessions/{id}` (`api.py:44`
 * vs `:81`), and `POST /sessions` has no try/except at all, so a configuration
 * failure surfaces as an unhandled 500.
 */
function statusError(status: number, what: string): GatewayError {
  if (status === 0) {
    return new GatewayError(
      "MACHINE_SYSTEM_DISCONNECTED",
      `MACHINE_SYSTEM_DISCONNECTED: could not reach the machine while reading ${what}`,
    );
  }
  if (status === 404 || status === 400) {
    return new GatewayError("UNKNOWN_ID", `UNKNOWN_ID: no ${what}`, { retryable: false });
  }
  if (status === 408 || status === 504) {
    return new GatewayError("TIMEOUT", `TIMEOUT: the machine did not answer for ${what}`);
  }
  if (status === 401 || status === 403) {
    return new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: refused while reading ${what}`, {
      retryable: false,
    });
  }
  /*
    Everything else — 422, 500, 502, an unexpected 2xx-adjacent code. The
    service leaks raw exception text in `detail` (`api.py:44` is
    `detail=str(e)`, so upstream URLs, pydantic dumps and its API-key message
    all reach the caller verbatim). The proxy strips it and this message names
    only the status, so nothing from the service's internals is rendered.
  */
  return new GatewayError(
    "MACHINE_SYSTEM_DISCONNECTED",
    `MACHINE_SYSTEM_DISCONNECTED: the machine answered ${String(status)} for ${what}`,
  );
}

function requireOk(result: MachineHttpResult, what: string): unknown {
  if (result.status < 200 || result.status >= 300) throw statusError(result.status, what);
  return result.body;
}

/**
 * How a WRITE's status becomes a reason — which is not how a read's does.
 *
 * Two differences, both of which cost money to get wrong.
 *
 * First, a write is never retryable. `TIMEOUT` and `MACHINE_SYSTEM_DISCONNECTED`
 * default to `retryable: true` because for a read they are transient by nature;
 * for a write they mean "we do not know whether that already happened", and the
 * service has no cancellation — FastAPI ran the endpoint in a threadpool and a
 * disconnect does not kill it, so a generate that timed out is still running
 * and still spending. Presenting that as «تلاش دوباره» invites the user to pay
 * twice for one round. Every write reason below is constructed with
 * `retryable: false` explicitly rather than relying on the mutation layer's
 * `retry: false` default, because that default lives in another file and one
 * line there would re-open automatic paid replays.
 *
 * Second, `400` means something else. On a READ the service 404s a missing
 * session; on a WRITE every precondition failure is a 400 (`api.py` wraps each
 * write in `except Exception` and raises 400). But the proxy checks those same
 * preconditions itself, against the session it reads under its lock, so by the
 * time a 400 comes back the only remaining explanation is that the session
 * moved underneath the caller. That is `REVISION_CONFLICT`, whose recorded
 * resolution is refresh-then-resubmit — not `UNKNOWN_ID`, which would tell the
 * person their session does not exist.
 */
function writeStatusError(status: number, what: string): GatewayError {
  if (status === 0) {
    return new GatewayError(
      "MACHINE_SYSTEM_DISCONNECTED",
      `MACHINE_SYSTEM_DISCONNECTED: no answer while trying to ${what}`,
      { retryable: false },
    );
  }
  if (status === 504) {
    return new GatewayError(
      "TIMEOUT",
      `TIMEOUT: ${what} passed its deadline and may still be running`,
      { retryable: false },
    );
  }
  if (status === 409 || status === 400) {
    return new GatewayError(
      "REVISION_CONFLICT",
      `REVISION_CONFLICT: the session moved while trying to ${what}`,
      { retryable: false },
    );
  }
  if (status === 403) {
    return new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: refused while trying to ${what}`, {
      retryable: false,
    });
  }
  if (status === 404) {
    return new GatewayError("UNKNOWN_ID", `UNKNOWN_ID: no session to ${what}`, {
      retryable: false,
    });
  }
  return new GatewayError(
    "MACHINE_SYSTEM_DISCONNECTED",
    `MACHINE_SYSTEM_DISCONNECTED: the machine answered ${String(status)} while trying to ${what}`,
    { retryable: false },
  );
}

export interface MachineClient {
  session(sessionId: string): Promise<MachineSession>;
  /** `POST /sessions`. Free — no model is called. */
  createSession(brief: string): Promise<MachineSession>;
  /** SPENDS. */
  generateConcepts(sessionId: string, input: MachineWritePrecondition): Promise<MachineSession>;
  /** SPENDS. */
  respondToConcepts(sessionId: string, input: MachineRespondInput): Promise<MachineSession>;
  /** Free — the service only rewrites the session file. */
  approveConcept(sessionId: string, input: MachineApproveInput): Promise<MachineSession>;
  /** SPENDS. */
  buildPortfolio(sessionId: string, input: MachineBuildInput): Promise<MachineSession>;
}

/** Refuses before a bad id can reach a path, exactly as the read path does. */
function guarded(
  sessionId: string,
  call: () => Promise<MachineHttpResult>,
): Promise<MachineHttpResult> {
  if (!isMachineSessionId(sessionId)) {
    return Promise.reject(
      new GatewayError(
        "SCHEMA_VALIDATION_FAILED",
        "SCHEMA_VALIDATION_FAILED: MACHINE_SESSION_ID_MUST_BE_12_HEX",
        { retryable: false },
      ),
    );
  }
  return call();
}

/** Every write returns the whole `SessionState`, so they all decode the same. */
async function write(call: Promise<MachineHttpResult>, what: string): Promise<MachineSession> {
  const result = await call;
  if (result.status < 200 || result.status >= 300) throw writeStatusError(result.status, what);
  const parsed = machineSessionSchema.safeParse(result.body);
  if (!parsed.success) {
    throw new GatewayError(
      "SCHEMA_VALIDATION_FAILED",
      "SCHEMA_VALIDATION_FAILED: the machine's session did not match the recorded wire shape",
      { retryable: false, cause: parsed.error },
    );
  }
  return parsed.data;
}

export function createMachineClient(port: MachineHttpPort): MachineClient {
  return {
    async session(sessionId: string): Promise<MachineSession> {
      if (!isMachineSessionId(sessionId)) {
        // Refused before it can reach a path. The panel is the only layer that
        // checks this at all.
        throw new GatewayError(
          "SCHEMA_VALIDATION_FAILED",
          "SCHEMA_VALIDATION_FAILED: MACHINE_SESSION_ID_MUST_BE_12_HEX",
          { retryable: false },
        );
      }

      const body = requireOk(await port.getSession(sessionId), `session "${sessionId}"`);
      const parsed = machineSessionSchema.safeParse(body);
      if (!parsed.success) {
        /*
          A shape the panel does not recognise. Reported as a schema failure
          rather than re-thrown: a ZodError reaching the query layer is not a
          `GatewayError`, and would wipe the surface instead of degrading it.
        */
        throw new GatewayError(
          "SCHEMA_VALIDATION_FAILED",
          `SCHEMA_VALIDATION_FAILED: the machine's session did not match the recorded wire shape`,
          { retryable: false, cause: parsed.error },
        );
      }
      return parsed.data;
    },

    createSession: (brief: string) => write(port.createSession(brief), "create a session"),

    generateConcepts: (sessionId: string, input: MachineWritePrecondition) =>
      write(guarded(sessionId, () => port.generateConcepts(sessionId, input)), "generate concepts"),

    respondToConcepts: (sessionId: string, input: MachineRespondInput) =>
      write(guarded(sessionId, () => port.respondToConcepts(sessionId, input)), "refine concepts"),

    approveConcept: (sessionId: string, input: MachineApproveInput) =>
      write(guarded(sessionId, () => port.approveConcept(sessionId, input)), "select a concept"),

    buildPortfolio: (sessionId: string, input: MachineBuildInput) =>
      write(guarded(sessionId, () => port.buildPortfolio(sessionId, input)), "build the portfolio"),
  };
}
