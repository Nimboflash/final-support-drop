import { machineSessionSchema, type MachineSession } from "@drop/panel-domain";
import { GatewayError } from "../errors";
import type { MachineHttpPort, MachineHttpResult } from "./machine-http-port";

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

export interface MachineHealth {
  readonly status: string;
  /** Which backend answered. A mock run must never be mistaken for a real one. */
  readonly backend: string;
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

export interface MachineClient {
  health(): Promise<MachineHealth>;
  session(sessionId: string): Promise<MachineSession>;
}

export function createMachineClient(port: MachineHttpPort): MachineClient {
  return {
    async health(): Promise<MachineHealth> {
      const body = requireOk(await port.getHealth(), "the machine's health");
      const record = body as { status?: unknown; backend?: unknown };
      return {
        status: typeof record.status === "string" ? record.status : "unknown",
        backend: typeof record.backend === "string" ? record.backend : "unknown",
      };
    },

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
  };
}
