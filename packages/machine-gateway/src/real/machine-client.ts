import { machineSessionSchema, type MachineSession } from "@drop/panel-domain";
import { GatewayError, NEXT_ACTIONS } from "../errors";
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
 * The proxy's own word for why it refused, when it gave one.
 *
 * Every refusal the write proxy authors is `{ error: "<CODE>" }`, and the codes
 * are what distinguish "wait thirty seconds" from "this session is spent" from
 * "someone else moved it". The status alone cannot: five of them are 409.
 */
function proxyCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as Record<string, unknown>).error;
  return typeof code === "string" ? code : null;
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
 * Second, the BODY is read, not only the status. The proxy answers 409 for
 * five different refusals — a lock held, too many in flight, a cooldown, the
 * paid-call budget, a portfolio that already exists — and 400 for both "the
 * session moved underneath you" and "the panel sent a body I do not accept".
 * Mapped by status alone every one of them became `REVISION_CONFLICT` and
 * rendered as "refresh and resubmit", which for a spent budget is advice that
 * can never work. The reason stays inside the closed set (ADR-0021 D6); what
 * carries the distinction is `nextPermittedActions`, the field 10 §2 gave
 * exactly this job.
 */
export function machineWriteError(status: number, body: unknown, what: string): GatewayError {
  const code = proxyCode(body);
  const never = { retryable: false } as const;

  if (status === 0) {
    return new GatewayError(
      "MACHINE_SYSTEM_DISCONNECTED",
      `MACHINE_SYSTEM_DISCONNECTED: no answer while trying to ${what}`,
      never,
    );
  }

  // The proxy answered on its own behalf. These are the refusals a person can
  // actually do something about, and each says what.
  switch (code) {
    case "IN_FLIGHT":
    case "TOO_MANY_IN_FLIGHT":
      return new GatewayError(
        "INVALID_STATE_TRANSITION",
        `INVALID_STATE_TRANSITION: the machine is still busy with an earlier request (${code}) while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.WAIT_THEN_RETRY] },
      );
    case "COOLING_DOWN":
      return new GatewayError(
        "INVALID_STATE_TRANSITION",
        `INVALID_STATE_TRANSITION: a paid call just ran; the proxy is holding this one back while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.COOL_DOWN] },
      );
    case "PAID_CALL_BUDGET": {
      const limit = (body as Record<string, unknown>).limit;
      const suffix = typeof limit === "number" ? ` (limit ${String(limit)})` : "";
      return new GatewayError(
        "INVALID_STATE_TRANSITION",
        `INVALID_STATE_TRANSITION: this session's paid-call budget is spent${suffix} while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.START_NEW_SESSION] },
      );
    }
    case "PORTFOLIO_EXISTS":
      return new GatewayError(
        "INVALID_STATE_TRANSITION",
        `INVALID_STATE_TRANSITION: research already exists for this session while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.REPLACE_EXISTING] },
      );
    case "SESSION_MOVED":
      return new GatewayError(
        "REVISION_CONFLICT",
        `REVISION_CONFLICT: the session moved while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.REFRESH_AND_RESUBMIT] },
      );
    case "WRITE_MAY_STILL_BE_RUNNING":
      return new GatewayError(
        "TIMEOUT",
        `TIMEOUT: ${what} passed its deadline and may still be running`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.WAIT_FOR_RESULT] },
      );
    case "BODY_REJECTED":
      // The panel built a request the proxy would not accept. That is a panel
      // defect, not something the person did — and not a conflict, which is
      // what a bare 400 used to read as.
      return new GatewayError(
        "SCHEMA_VALIDATION_FAILED",
        `SCHEMA_VALIDATION_FAILED: the proxy rejected the request body while trying to ${what}`,
        never,
      );
    case "WRITE_REFUSED":
      return new GatewayError(
        "UNAUTHORIZED",
        `UNAUTHORIZED: the proxy refused a write it could not verify as same-origin while trying to ${what}`,
        never,
      );
    case "NOT_FOUND":
      // Not a missing session: the whole write surface is off in this
      // deployment (`DROP_MACHINE_WRITES`). A missing session comes back as
      // UPSTREAM_ERROR 404, below.
      return new GatewayError(
        "UNAUTHORIZED",
        `UNAUTHORIZED: writes to the machine are switched off while trying to ${what}`,
        { ...never, nextPermittedActions: [NEXT_ACTIONS.ENABLE_WRITES] },
      );
    case "UPSTREAM_UNREACHABLE":
      return new GatewayError(
        "MACHINE_SYSTEM_DISCONNECTED",
        `MACHINE_SYSTEM_DISCONNECTED: the proxy could not reach the machine while trying to ${what}`,
        never,
      );
    default:
      break;
  }

  // Either the proxy relayed the service's own status (`UPSTREAM_ERROR`), or
  // something other than the proxy answered. The service's codes are read
  // from its source: a precondition failure is 400 on every POST, a missing
  // session 404 only on GET.
  if (status === 504) {
    return new GatewayError(
      "TIMEOUT",
      `TIMEOUT: ${what} passed its deadline and may still be running`,
      { ...never, nextPermittedActions: [NEXT_ACTIONS.WAIT_FOR_RESULT] },
    );
  }
  if (status === 409 || status === 400) {
    return new GatewayError(
      "REVISION_CONFLICT",
      `REVISION_CONFLICT: the session moved while trying to ${what}`,
      { ...never, nextPermittedActions: [NEXT_ACTIONS.REFRESH_AND_RESUBMIT] },
    );
  }
  if (status === 403) {
    return new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: refused while trying to ${what}`, never);
  }
  if (status === 404) {
    return new GatewayError("UNKNOWN_ID", `UNKNOWN_ID: no session to ${what}`, never);
  }
  return new GatewayError(
    "MACHINE_SYSTEM_DISCONNECTED",
    `MACHINE_SYSTEM_DISCONNECTED: the machine answered ${String(status)} while trying to ${what}`,
    never,
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
  if (result.status < 200 || result.status >= 300) {
    throw machineWriteError(result.status, result.body, what);
  }
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
