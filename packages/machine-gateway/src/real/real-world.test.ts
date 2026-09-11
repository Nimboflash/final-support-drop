import { describe, expect, it } from "vitest";
import { panelSnapshotSchema } from "@drop/panel-domain";
import { machineSession as MACHINE_SESSION } from "@drop/panel-domain/fixtures";
import { GatewayError, isGatewayError } from "../errors";
import type { MachineHttpPort, MachineHttpResult } from "./machine-http-port";
import { createRealWorld } from "./real-world";

/**
 * The read-only real adapter (ticket P10, slice 1).
 *
 * The port is a stub rather than a live service on purpose: what is under test
 * is the ADAPTER's behaviour at the boundary — what it does with a 404, with a
 * shape it does not recognise, with no answer at all — and a running service
 * cannot be made to produce those on demand. The projection itself is already
 * proven against a real captured session in `machine-session.test.ts`.
 */
const SESSION_ID = "c18c18e12aea";
const NOW = "2026-09-10T09:00:00Z";

/** A port that answers each call from a script, so failures are reproducible. */
function portReturning(result: MachineHttpResult): MachineHttpPort {
  return { getSession: () => Promise.resolve(result) };
}

function worldOver(port: MachineHttpPort) {
  return createRealWorld({
    sessionId: SESSION_ID,
    port,
    now: () => NOW,
    workspaceId: "drop-demo",
    ownerId: "actor-guardian",
    // The identity renderer, matching the composition root: ADR-0021 D7 is open
    // and this adapter must not quietly decide it.
    text: { toFa: (value: string) => value, toEn: (value: string) => value },
  });
}

const OK = { status: 200, body: MACHINE_SESSION as unknown };

describe("reading a live session", () => {
  it("projects it into a snapshot the panel accepts", async () => {
    const snapshot = await worldOver(portReturning(OK)).panelCommandGateway.getSnapshot();
    expect(() => panelSnapshotSchema.parse(snapshot)).not.toThrow();
    expect(snapshot.snapshotKind).toBe("drop.panel.machine.v1");
    expect(snapshot.clock).toBe(NOW);
  });

  it("refuses a session id that is not the machine's twelve-hex form", () => {
    // The service uses the id as a filesystem path segment and validates
    // nothing, so the world will not even be constructed around a bad one.
    expect(() =>
      createRealWorld({
        sessionId: "../../etc/passwd",
        port: portReturning(OK),
        now: () => NOW,
        workspaceId: "drop-demo",
        ownerId: "actor-guardian",
        text: { toFa: (value: string) => value },
      }),
    ).toThrow(GatewayError);
  });
});

describe("what the adapter does when the machine does not cooperate", () => {
  /*
    Every one of these must surface as a GatewayError. `states.tsx` reaches the
    degraded branch — content stays on screen under a banner — only for that
    class; a raw TypeError or a ZodError escaping this adapter would wipe the
    surface instead of degrading it. That is the whole reason these cases exist.
  */
  it("turns no answer at all into a disconnected error, not a TypeError", async () => {
    const error = await worldOver(portReturning({ status: 0, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect(isGatewayError(error)).toBe(true);
    expect((error as GatewayError).reason).toBe("MACHINE_SYSTEM_DISCONNECTED");
    expect((error as GatewayError).retryable).toBe(true);
  });

  it("reports an unknown session as UNKNOWN_ID and does not invite a retry", async () => {
    const error = await worldOver(portReturning({ status: 404, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).reason).toBe("UNKNOWN_ID");
    expect((error as GatewayError).retryable).toBe(false);
  });

  it("treats the service's 400-for-a-missing-session as UNKNOWN_ID too", async () => {
    // Not a guess about REST convention: `api.py` returns 400 for a missing
    // session on every POST and 404 only on the GET.
    const error = await worldOver(portReturning({ status: 400, body: null }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).reason).toBe("UNKNOWN_ID");
  });

  it("turns an unrecognised shape into a schema failure rather than a ZodError", async () => {
    const error = await worldOver(portReturning({ status: 200, body: { nope: true } }))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect(isGatewayError(error)).toBe(true);
    expect((error as GatewayError).reason).toBe("SCHEMA_VALIDATION_FAILED");
  });

  it("never lets the service's own error text reach the message", async () => {
    const leaky = {
      status: 500,
      body: { detail: "OPENROUTER_API_KEY was not found in the environment." },
    };
    const error = await worldOver(portReturning(leaky))
      .panelCommandGateway.getSnapshot()
      .catch((thrown: unknown) => thrown);
    expect((error as GatewayError).message).not.toContain("OPENROUTER");
  });
});

describe("every write refuses, and says something true while refusing", () => {
  /*
    UNAUTHORIZED, not MACHINE_SYSTEM_DISCONNECTED. `commandErrorFa` renders the
    latter as "the machine system is not connected", which in this mode is
    false — it IS connected, we just read a session out of it. The world
    declares `policy.forbidden`, so the acting role is VIEWER, and "you are not
    permitted with your current role" is then simply true.
  */
  const world = worldOver(portReturning(OK));

  it("acts as a read-only role, so the panel's own copy is accurate", () => {
    expect(world.policy.forbidden).toBe(true);
  });

  it.each([
    ["createProject", () => world.panelCommandGateway.createProject({} as never)],
    ["addComment", () => world.panelCommandGateway.addComment({} as never)],
    ["selectConcepts", () => world.panelCommandGateway.selectConcepts({} as never)],
    ["amendOutputPlan", () => world.panelCommandGateway.amendOutputPlan({} as never)],
    ["updateCalendar", () => world.panelCommandGateway.updateCalendar({} as never)],
    ["updateCalendarPackage", () => world.panelCommandGateway.updateCalendarPackage({} as never)],
    ["subscribe", () => world.panelCommandGateway.subscribe(() => {})],
    ["requestRevision", () => world.revisionGateway.requestRevision({} as never)],
    ["reviewItem", () => world.review.reviewItem({} as never)],
  ])("%s refuses with a typed error rather than a plausible success", (_name, call) => {
    let thrown: unknown;
    try {
      call();
    } catch (error) {
      thrown = error;
    }
    expect(isGatewayError(thrown)).toBe(true);
    expect((thrown as GatewayError).reason).toBe("UNAUTHORIZED");
  });

  it("exportPackage rejects rather than throwing, matching the mock", async () => {
    // An async member that throws synchronously is a different failure mode for
    // the caller than one that rejects; `mock-world.ts` makes the same choice.
    await expect(world.panelCommandGateway.exportPackage("pv-1")).rejects.toBeInstanceOf(
      GatewayError,
    );
  });
});

