import { describe, expect, it } from "vitest";
import { NEXT_ACTIONS } from "../errors";
import { machineWriteError } from "./machine-client";

/**
 * How a WRITE refusal becomes a reason AND a next action.
 *
 * The proxy answers 409 for five different refusals and 400 for two. Mapped by
 * status alone every one of them became `REVISION_CONFLICT` and rendered as
 * "refresh and resubmit" — advice that for a spent budget can never work, and
 * for a write still running upstream invites the second press that costs
 * twice. The body's `error` code is what tells them apart, and this is the
 * table of what each one means.
 */
describe("a write refusal keeps the proxy's distinction", () => {
  it.each([
    ["IN_FLIGHT", 409, "INVALID_STATE_TRANSITION", NEXT_ACTIONS.WAIT_THEN_RETRY],
    ["TOO_MANY_IN_FLIGHT", 409, "INVALID_STATE_TRANSITION", NEXT_ACTIONS.WAIT_THEN_RETRY],
    ["COOLING_DOWN", 409, "INVALID_STATE_TRANSITION", NEXT_ACTIONS.COOL_DOWN],
    ["PAID_CALL_BUDGET", 409, "INVALID_STATE_TRANSITION", NEXT_ACTIONS.START_NEW_SESSION],
    ["PORTFOLIO_EXISTS", 409, "INVALID_STATE_TRANSITION", NEXT_ACTIONS.REPLACE_EXISTING],
    ["SESSION_MOVED", 409, "REVISION_CONFLICT", NEXT_ACTIONS.REFRESH_AND_RESUBMIT],
    ["WRITE_MAY_STILL_BE_RUNNING", 504, "TIMEOUT", NEXT_ACTIONS.WAIT_FOR_RESULT],
    ["NOT_FOUND", 404, "UNAUTHORIZED", NEXT_ACTIONS.ENABLE_WRITES],
  ] as const)("%s → %s + %s", (code, status, reason, next) => {
    const error = machineWriteError(status, { error: code }, "generate concepts");
    expect(error.reason).toBe(reason);
    expect(error.nextPermittedActions).toEqual([next]);
  });

  it("never invites an automatic replay of a paid write", () => {
    // Every write reason is constructed non-retryable, including the ones the
    // read path would default to retryable. See the docblock on the mapping.
    for (const code of [
      "IN_FLIGHT",
      "COOLING_DOWN",
      "PAID_CALL_BUDGET",
      "SESSION_MOVED",
      "WRITE_MAY_STILL_BE_RUNNING",
      "UPSTREAM_UNREACHABLE",
      "UPSTREAM_NOT_JSON",
    ]) {
      expect(machineWriteError(409, { error: code }, "x").retryable, code).toBe(false);
    }
    expect(machineWriteError(0, null, "x").retryable).toBe(false);
  });

  it("tells a rejected body apart from a moved session", () => {
    // Both are 400 at the proxy. One is a panel defect; the other is the
    // recorded conflict whose resolution is refresh-then-resubmit.
    expect(machineWriteError(400, { error: "BODY_REJECTED" }, "x").reason).toBe(
      "SCHEMA_VALIDATION_FAILED",
    );
    expect(machineWriteError(400, { error: "UPSTREAM_ERROR" }, "x").reason).toBe(
      "REVISION_CONFLICT",
    );
  });

  it("tells writes-switched-off apart from a missing session", () => {
    // Both arrive as 404. `NOT_FOUND` is the proxy's own answer when the write
    // surface is off; a missing session is relayed as UPSTREAM_ERROR.
    expect(machineWriteError(404, { error: "NOT_FOUND" }, "x").reason).toBe("UNAUTHORIZED");
    expect(machineWriteError(404, { error: "UPSTREAM_ERROR" }, "x").reason).toBe("UNKNOWN_ID");
  });

  it("carries the budget's limit into the message, never into the reason set", () => {
    const error = machineWriteError(409, { error: "PAID_CALL_BUDGET", limit: 6 }, "x");
    expect(error.message).toContain("limit 6");
    expect(error.reason).toBe("INVALID_STATE_TRANSITION");
  });

  it("falls back to the status when the body says nothing", () => {
    expect(machineWriteError(409, null, "x").reason).toBe("REVISION_CONFLICT");
    expect(machineWriteError(504, "not json", "x").reason).toBe("TIMEOUT");
    expect(machineWriteError(500, {}, "x").reason).toBe("MACHINE_SYSTEM_DISCONNECTED");
  });
});
