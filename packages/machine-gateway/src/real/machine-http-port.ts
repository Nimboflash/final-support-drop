/**
 * The transport seam for the concept-portfolio service (ADR-0021 D4).
 *
 * This package cannot name a transport, and that is enforced twice over.
 * `tsconfig.base.json` pins `lib: ["ES2023"]` and this package sets no `types`,
 * so `fetch`, `Response`, `Headers`, `URL`, `AbortSignal` and `setTimeout` do
 * not EXIST in its type environment — a client written against them would not
 * compile. `tests/repo/panel-contract-invariants.test.ts` then bans the DOM
 * globals by name, and `tests/repo/determinism.test.ts` bans every timer.
 *
 * So the adapter declares what it NEEDS and `apps/web` supplies it, exactly as
 * `packages/mock-data/src/ports.ts` already does for browser storage. The port
 * mentions nothing but `Promise`, `string`, `number` and `unknown`.
 *
 * Deliberately NOT a general "request" method taking a path. A port that
 * accepts a caller-supplied path is an SSRF waiting to be written: the
 * implementation would have to build a URL out of it, and `new URL()` resolves
 * a value beginning `//host` or `/\host` to a DIFFERENT ORIGIN. One named
 * method per reachable endpoint means the set of reachable URLs is closed at
 * compile time rather than validated at runtime.
 */
export interface MachineHttpResult {
  /** The HTTP status. Transport failures are reported as 0. */
  readonly status: number;
  /** The decoded JSON body, or null when there was none. */
  readonly body: unknown;
}

export interface MachineHttpPort {
  /** `GET /health` — answers without creating a session or spending a token. */
  getHealth(): Promise<MachineHttpResult>;
  /**
   * `GET /sessions/{id}`.
   *
   * The id is validated by the caller BEFORE it reaches here, and again by the
   * proxy that implements this port. The service interpolates it into a
   * filesystem path with no validation of its own (`session_service.py:35`), so
   * every layer that can check it, does.
   */
  getSession(sessionId: string): Promise<MachineHttpResult>;
}
