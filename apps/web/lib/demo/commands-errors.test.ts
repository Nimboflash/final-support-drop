import { describe, expect, it } from "vitest";
import { GatewayError, NEXT_ACTIONS } from "@drop/machine-gateway";
import { commandErrorFa, commandErrorTone } from "./commands";

/**
 * Every failure has its own true sentence, and its own tone.
 *
 * The proxy draws a dozen distinctions and the interface used to collapse them
 * into three sentences, one of which — «ثبت این فرمان ممکن نشد» — rendered for
 * a write the proxy KNEW was still running and still spending. A wait is not a
 * failure and must not look like one: the tone is what keeps a "give it a
 * moment" from being painted red, which is what makes a person press again.
 */
function error(reason: ConstructorParameters<typeof GatewayError>[0], next?: string): GatewayError {
  return new GatewayError(reason, `${reason}: test`, {
    retryable: false,
    nextPermittedActions: next === undefined ? [] : [next],
  });
}

describe("one sentence per next action", () => {
  const cases: readonly [string, RegExp][] = [
    [NEXT_ACTIONS.WAIT_THEN_RETRY, /چیزی خرج نشد/],
    [NEXT_ACTIONS.COOL_DOWN, /مکث/],
    [NEXT_ACTIONS.WAIT_FOR_RESULT, /دوباره نفرستید/],
    [NEXT_ACTIONS.START_NEW_SESSION, /جلسهٔ تازه/],
    [NEXT_ACTIONS.REPLACE_EXISTING, /جایگزین/],
    [NEXT_ACTIONS.ENABLE_WRITES, /خاموش/],
    [NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE, /ماشین چنین کاری ندارد/],
    [NEXT_ACTIONS.ADD_A_REASON, /بدون دلیل/],
    // The provider's own refusals: each names the cause, says whether money
    // left the account, and points at where the fix lives.
    [NEXT_ACTIONS.REPLACE_PROVIDER_KEY, /کلید ماشین را نپذیرفت[\s\S]*چیزی خرج نشد[\s\S]*تنظیمات/],
    [NEXT_ACTIONS.TOP_UP_PROVIDER, /اعتبار[\s\S]*چیزی خرج نشد/],
    [NEXT_ACTIONS.PROVIDER_REJECTED, /درخواست ماشین را نپذیرفت[\s\S]*چیزی خرج نشد/],
    [NEXT_ACTIONS.PROVIDER_UNAVAILABLE, /پاسخ نمی‌دهد[\s\S]*چیزی خرج نشد/],
    [NEXT_ACTIONS.MODEL_ANSWER_UNUSABLE, /هزینه داشت/],
  ];
  it.each(cases)("%s", (next, expected) => {
    expect(commandErrorFa(error("INVALID_STATE_TRANSITION", next))).toMatch(expected);
  });

  it("no two next actions share a sentence", () => {
    const sentences = cases.map(([next]) => commandErrorFa(error("INVALID_STATE_TRANSITION", next)));
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("never blames the person's role for a limit of the machine's", () => {
    expect(commandErrorFa(error("UNAUTHORIZED", NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE))).not.toMatch(/نقش/);
  });

  it("has a sentence for every recorded reason, with no generic fallback reachable", () => {
    for (const reason of [
      "UNKNOWN_ID",
      "MACHINE_SYSTEM_DISCONNECTED",
      "UNAUTHORIZED",
      "TIMEOUT",
      "STALE_DATA",
      "INVALID_STATE_TRANSITION",
      "SCHEMA_VALIDATION_FAILED",
      "REVISION_CONFLICT",
    ] as const) {
      expect(commandErrorFa(error(reason)), reason).not.toMatch(/ناشناخته|ممکن نشد\.$/);
    }
  });
});

describe("a wait is not painted as a failure", () => {
  it("classifies the three waits as wait", () => {
    for (const next of [NEXT_ACTIONS.WAIT_THEN_RETRY, NEXT_ACTIONS.COOL_DOWN, NEXT_ACTIONS.WAIT_FOR_RESULT]) {
      expect(commandErrorTone(error("TIMEOUT", next))).toBe("wait");
    }
  });
  it("a provider outage is a wait, and a refused key is a refusal, never a stale page", () => {
    expect(commandErrorTone(error("MACHINE_SYSTEM_DISCONNECTED", NEXT_ACTIONS.PROVIDER_UNAVAILABLE))).toBe("wait");
    expect(commandErrorTone(error("UNAUTHORIZED", NEXT_ACTIONS.REPLACE_PROVIDER_KEY))).toBe("refused");
    // The sentence an expired key used to render told the person to refresh.
    expect(commandErrorFa(error("UNAUTHORIZED", NEXT_ACTIONS.REPLACE_PROVIDER_KEY))).not.toMatch(/تازه کنید|نقش/);
  });

  it("classifies a conflict, a refusal and a failure apart", () => {
    expect(commandErrorTone(error("REVISION_CONFLICT", NEXT_ACTIONS.REFRESH_AND_RESUBMIT))).toBe("conflict");
    expect(commandErrorTone(error("UNAUTHORIZED", NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE))).toBe("refused");
    expect(commandErrorTone(error("MACHINE_SYSTEM_DISCONNECTED"))).toBe("failed");
    expect(commandErrorTone(new Error("boom"))).toBe("failed");
  });
});
