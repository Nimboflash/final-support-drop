/**
 * What the machine's failure says, reduced to what may travel.
 *
 * The service wraps every failure in `HTTPException(400, str(e))`, so its
 * body carries the raw exception text: a provider URL, a whole pydantic dump
 * with the brief in it, or its own configuration message. None of that may
 * reach a browser (`tests/repo/machine-boundary.test.ts`), and until now none
 * of it reached the OPERATOR either — an expired key surfaced as "the session
 * moved, refresh the page", and the person went looking in the wrong place.
 *
 * So the text is read here, once, and reduced to two values from a closed
 * set: which KIND of failure it was, and — when the provider answered — the
 * provider's own status. Enum members and a number only; no substring of the
 * text survives the call. The unit test feeds a leaky body through and checks
 * exactly that.
 */
export type UpstreamFailureKind =
  /** The provider answered with an HTTP error; `providerStatus` says which. */
  | "PROVIDER"
  /** The service has no credential configured at all. */
  | "NO_KEY"
  /** The model answered, but the answer did not fit the recorded shape. That call was charged. */
  | "SHAPE"
  | "UNKNOWN";

export interface UpstreamFailure {
  readonly kind: UpstreamFailureKind;
  readonly providerStatus: number | null;
}

/** `requests.HTTPError`'s wording: "401 Client Error: Unauthorized for url: …". */
const PROVIDER_STATUS = /\b([45]\d\d) (?:Client|Server) Error\b/;
/**
 * `Settings.from_env()`'s RuntimeError, matched on its sentence rather than on
 * the variable it names: `tests/repo/provider-key.test.ts` forbids any panel
 * surface from naming the credential, and this one only recognises the
 * service saying it has none.
 */
const NO_KEY = /was not found in the environment/;
/** pydantic v2 ("1 validation error for ConceptBatch") and a non-JSON answer. */
const SHAPE = /validation error|JSONDecodeError|Expecting value|KeyError/;

export function classifyUpstreamFailure(body: unknown): UpstreamFailure {
  let text = "";
  try {
    text = typeof body === "string" ? body : (JSON.stringify(body) ?? "");
  } catch {
    text = "";
  }
  const provider = PROVIDER_STATUS.exec(text);
  if (provider !== null) return { kind: "PROVIDER", providerStatus: Number(provider[1]) };
  if (NO_KEY.test(text)) return { kind: "NO_KEY", providerStatus: null };
  if (SHAPE.test(text)) return { kind: "SHAPE", providerStatus: null };
  return { kind: "UNKNOWN", providerStatus: null };
}
