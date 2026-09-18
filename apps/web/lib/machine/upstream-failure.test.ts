import { describe, expect, it } from "vitest";
import { classifyUpstreamFailure } from "./upstream-failure";

/**
 * The service's error body is the leakiest thing in the system, and this is
 * the one place that reads it. What comes out must be a classification and
 * nothing else — no URL, no key message, no line of the brief.
 */
const LEAKY = {
  detail:
    "401 Client Error: Unauthorized for url: https://openrouter.ai/api/v1/chat/completions " +
    'payload={"project_brief": "a secret brief about a client"} api key sk-or-abc was not found in the environment.',
};

describe("the provider's answer is reduced to a status", () => {
  it.each([
    ["401 Client Error: Unauthorized for url: x", 401],
    ["402 Client Error: Payment Required for url: x", 402],
    ["429 Client Error: Too Many Requests for url: x", 429],
    ["404 Client Error: Not Found for url: x", 404],
    ["502 Server Error: Bad Gateway for url: x", 502],
  ])("%s → PROVIDER %i", (text, status) => {
    expect(classifyUpstreamFailure({ detail: text })).toEqual({
      kind: "PROVIDER",
      providerStatus: status,
    });
  });

  it("tells a missing credential from a refused one", () => {
    expect(classifyUpstreamFailure({ detail: "the key was not found in the environment." })).toEqual({
      kind: "NO_KEY",
      providerStatus: null,
    });
  });

  it("tells an unusable model answer from a provider refusal", () => {
    // pydantic v2's wording, and the JSON decoder's. Both mean the model was
    // called and charged, and its answer could not be recorded.
    for (const text of [
      "1 validation error for ConceptBatch\nconcepts.0.concept_id\n  Field required",
      "Expecting value: line 1 column 1 (char 0)",
    ]) {
      expect(classifyUpstreamFailure({ detail: text }).kind).toBe("SHAPE");
    }
  });

  it("reads anything else as unknown rather than guessing", () => {
    expect(classifyUpstreamFailure({ detail: "Generate concepts first." }).kind).toBe("UNKNOWN");
    expect(classifyUpstreamFailure(null).kind).toBe("UNKNOWN");
    expect(classifyUpstreamFailure("<html>502</html>").kind).toBe("UNKNOWN");
  });
});

describe("no word of the body survives", () => {
  it("returns only enum members and a number, whatever it was fed", () => {
    const out = classifyUpstreamFailure(LEAKY);
    const serialised = JSON.stringify(out);
    for (const leak of ["openrouter.ai", "secret brief", "sk-or", "environment", "url"]) {
      expect(serialised).not.toContain(leak);
    }
    expect(Object.keys(out).sort()).toEqual(["kind", "providerStatus"]);
    expect(typeof out.kind).toBe("string");
    expect(out.providerStatus === null || typeof out.providerStatus === "number").toBe(true);
  });

  it("survives a body that cannot be serialised", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(classifyUpstreamFailure(cyclic).kind).toBe("UNKNOWN");
  });
});
