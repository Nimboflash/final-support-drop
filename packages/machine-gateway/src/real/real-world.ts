import {
  projectMachineSession,
  type PanelSnapshot,
  type MachineTextRenderer,
} from "@drop/panel-domain";
import { GatewayError, gatewayErrors } from "../errors";
import type { MachineHttpPort } from "./machine-http-port";
import { createMachineClient, isMachineSessionId, type MachineClient } from "./machine-client";
import type { PanelWorld } from "./panel-world";

/**
 * A read-only world over a live concept-portfolio session (ticket P10, slice 1).
 *
 * `getSnapshot()` reads the machine and projects it. Every write refuses.
 *
 * The refusal is `UNAUTHORIZED`, and the reason it is not
 * `MACHINE_SYSTEM_DISCONNECTED` matters. `commandErrorFa` renders that one as
 * «ارتباط با سامانهٔ ماشین برقرار نیست» — "the machine system is not
 * connected" — which in this mode is simply false: the machine IS connected,
 * we just read a session out of it. `UNAUTHORIZED` renders as «با نقش فعلی،
 * اجازهٔ این کار را ندارید» — "with the current role you are not permitted" —
 * and THAT is true, because this world declares `policy.forbidden`, so
 * `useEnvelope` (`apps/web/lib/demo/commands.ts:53-54`) acts as `VIEWER`.
 *
 * The mode is a read-only role, and every sentence the panel says about it is
 * accurate. Inventing a ninth `GatewayErrorReason` would have been the other
 * way to get an honest sentence, and ADR-0021 D6 forbids widening a closed set.
 */
export interface RealWorldOptions {
  /** The machine session this world shows. Validated before any call. */
  readonly sessionId: string;
  /** The transport, supplied by the composition root (see `MachineHttpPort`). */
  readonly port: MachineHttpPort;
  /**
   * The clock. Injected because `tests/repo/determinism.test.ts` forbids this
   * package from reading one, and because a real machine has real time while
   * the demo world's is fixed (ADR-0021, reported conflicts).
   */
  readonly now: () => string;
  readonly workspaceId: string;
  readonly ownerId: string;
  /**
   * How machine text becomes panel text.
   *
   * Required, with no default, for the reason `machine-session.ts` gives: the
   * machine answers in ENGLISH and the panel is fa-IR only (ADR-0021 D7), and
   * that decision belongs at the composition root where a person can see it.
   */
  readonly text: MachineTextRenderer;
}

export interface RealWorld extends PanelWorld {
  /** The session this world is bound to. */
  readonly sessionId: string;
  /** The typed reader, for surfaces that need the machine's own health. */
  readonly client: MachineClient;
}

function refuse(action: string): never {
  throw gatewayErrors.unauthorized(action);
}

export function createRealWorld(options: RealWorldOptions): RealWorld {
  if (!isMachineSessionId(options.sessionId)) {
    throw new GatewayError(
      "SCHEMA_VALIDATION_FAILED",
      "SCHEMA_VALIDATION_FAILED: MACHINE_SESSION_ID_MUST_BE_12_HEX",
      { retryable: false },
    );
  }

  const client = createMachineClient(options.port);

  return {
    sessionId: options.sessionId,
    client,

    // Read-only, and the panel is told so rather than left to discover it by
    // watching commands fail.
    policy: { forbidden: true },

    panelCommandGateway: {
      async getSnapshot(): Promise<PanelSnapshot> {
        const session = await client.session(options.sessionId);
        /*
          The clock is sampled ONCE per snapshot, not per row. Every timestamp
          in the projection comes from this single instant, so a snapshot is
          internally consistent even though the machine records no times of its
          own. What that costs is recorded in the P10 handoff: «آخرین فعالیت»
          reads as "just now" for everything, because the machine genuinely
          does not persist when anything happened.
        */
        return projectMachineSession(session, {
          now: options.now(),
          workspaceId: options.workspaceId,
          ownerId: options.ownerId,
          text: options.text,
        });
      },

      createProject: () => refuse("create a project"),
      addComment: () => refuse("add a comment"),
      selectConcepts: () => refuse("select concepts"),
      amendOutputPlan: () => refuse("amend the output plan"),
      updateCalendar: () => refuse("update the calendar"),
      updateCalendarPackage: () => refuse("update a calendar output"),
      // Rejects rather than throws, matching the mock: an async member that
      // throws synchronously is a different failure mode for the caller.
      exportPackage: () => Promise.reject(gatewayErrors.unauthorized("export an output")),
      subscribe: () => refuse("subscribe to panel events"),
    },

    revisionGateway: { requestRevision: () => refuse("request a revision") },
    review: { reviewItem: () => refuse("record a review decision") },
    machineGateway: { submitApproval: () => refuse("submit an approval") },
  };
}
