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

/**
 * What every write carries, and why a write cannot be bodyless (slice 2).
 *
 * `expectedRounds` is the caller's belief about how many concept rounds the
 * session has. The proxy re-reads the session under its lock and refuses when
 * the two disagree, which is what makes check-then-act atomic across two tabs.
 *
 * `expectedStatus` exists because `expectedRounds` alone is blind to the one
 * write that does not append a round: `build_portfolio` sets `portfolio` and
 * `status` and nothing else, so a second build passes a rounds check cleanly
 * and pays for a second portfolio over the top of the first.
 *
 * Both fields are also what stops the write being a CORS *simple request*. The
 * service's own generate and build take no body at all; a bodyless POST is a
 * shape any page the user has open can fire cross-origin without a preflight.
 * Requiring a JSON body removes that shape from the proxy's surface entirely,
 * rather than filtering it after it has already arrived.
 */
export interface MachineWritePrecondition {
  /** `concept_rounds.length` as the caller last saw it. */
  readonly expectedRounds: number;
  /** `status` as the caller last saw it. */
  readonly expectedStatus: string;
}

/** Refining the current round. `regenerate` is deliberately unreachable. */
export interface MachineRespondInput extends MachineWritePrecondition {
  readonly feedback: string;
  /**
   * Positions in the LATEST round, never machine concept ids.
   *
   * `concept_id` is minted by the MODEL — `prompts.py` declares it as a bare
   * `{"type": "string"}` with no pattern and no uniqueness — so it is not a
   * value any layer can validate. An index is an integer, and the proxy turns
   * it into a concept id by reading the session itself. See `approveConcept`.
   */
  readonly likedConceptIndexes: readonly number[];
}

export interface MachineApproveInput extends MachineWritePrecondition {
  /** A position in the latest round. Resolved to a concept id upstream-side. */
  readonly conceptIndex: number;
}

export interface MachineBuildInput extends MachineWritePrecondition {
  /**
   * Rebuilding over an existing portfolio is a second purchase, so it has to
   * be said out loud. Absent or false, the proxy refuses when `portfolio` is
   * already set.
   */
  readonly replaceExistingPortfolio?: boolean;
}

export interface MachineHttpPort {
  /**
   * `GET /sessions/{id}`.
   *
   * The id is validated by the caller BEFORE it reaches here, and again by the
   * proxy that implements this port. The service interpolates it into a
   * filesystem path with no validation of its own (`session_service.py:35`), so
   * every layer that can check it, does.
   */
  getSession(sessionId: string): Promise<MachineHttpResult>;

  /**
   * `POST /sessions` — creates an empty session. The only write that costs
   * nothing: `create_session` writes state and never calls a model.
   */
  createSession(brief: string): Promise<MachineHttpResult>;

  /** `POST /sessions/{id}/concepts/generate`. SPENDS. */
  generateConcepts(
    sessionId: string,
    input: MachineWritePrecondition,
  ): Promise<MachineHttpResult>;

  /** `POST /sessions/{id}/concepts/respond` with action `refine`. SPENDS. */
  respondToConcepts(sessionId: string, input: MachineRespondInput): Promise<MachineHttpResult>;

  /**
   * `POST /sessions/{id}/concepts/{concept_id}/approve`. Free — filesystem only.
   *
   * Note the shape: no concept id crosses this seam. The proxy's accepted path
   * set has no concept segment in it at all, so the id that lands in the
   * upstream URL is one the SERVICE produced, never one a caller sent.
   */
  approveConcept(sessionId: string, input: MachineApproveInput): Promise<MachineHttpResult>;

  /** `POST /sessions/{id}/portfolio/build`. SPENDS. */
  buildPortfolio(sessionId: string, input: MachineBuildInput): Promise<MachineHttpResult>;
}
