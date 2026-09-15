import {
  projectMachineSession,
  type CommandReceipt,
  type MachineSession,
  type PanelSnapshot,
  type MachineTextRenderer,
} from "@drop/panel-domain";
import { GatewayError, gatewayErrors } from "../errors";
import type { MachineHttpPort } from "./machine-http-port";
import { createMachineClient, isMachineSessionId, type MachineClient } from "./machine-client";
import type { PanelWorld } from "./panel-world";
import {
  applyNotes,
  readNotes,
  writeCalendarEntry,
  writeReviewDecision,
  type MachineReviewPort,
} from "./review-store";

/**
 * A live world over a concept-portfolio session (ticket P10; writes are slice 2).
 *
 * `getSnapshot()` reads the machine and projects it. FOUR writes now reach it —
 * generate, refine, approve and build — and everything else still refuses,
 * because the machine genuinely has no notion of those things: it has no
 * calendar, no comments, no output plan and no second project. A refusal here
 * is a statement about the machine's surface, not about permission.
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
 * That reasoning still holds for the five members that stay refused. What
 * changed is that it no longer describes the world as a whole: `policy.forbidden`
 * is gone, because a world where the person CAN generate, refine, approve and
 * build is not one where «با نقش فعلی، اجازهٔ این کار را ندارید» is true.
 *
 * Inventing a ninth `GatewayErrorReason` would have been the other way to get an
 * honest sentence, and ADR-0021 D6 forbids widening a closed set.
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
  /**
   * Where the person's own review of machine content is kept.
   *
   * Optional, because a world without one is still a correct read-only world —
   * it simply cannot record that someone looked at a track and said yes. When
   * absent, content review refuses with a reason rather than pretending.
   */
  readonly review?: MachineReviewPort;
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

/**
 * What the proxy checks the caller's belief against.
 *
 * Read immediately before every write, from the same client the reads use, so
 * a write always carries the caller's most recent view rather than whatever a
 * React render happened to close over. The proxy re-reads under its own lock
 * and refuses on a mismatch; this only makes the common case succeed.
 */
async function precondition(
  client: MachineClient,
  sessionId: string,
): Promise<{ expectedRounds: number; expectedStatus: string }> {
  const session = await client.session(sessionId);
  return { expectedRounds: session.concept_rounds.length, expectedStatus: session.status };
}

/**
 * Turns a panel concept id back into a POSITION in the latest round.
 *
 * Positions, never ids, because `concept_id` is minted by the MODEL and carries
 * no pattern and no uniqueness guarantee — so it is not a value that may be put
 * into a URL. The projection builds panel ids as
 * `mc-<session>-<machineConceptId>` with every character outside
 * `[A-Za-z0-9_-]` replaced, and this reverses that by rebuilding each
 * candidate's id and comparing, rather than by parsing — parsing would have to
 * guess where a session id ends and a mangled concept id begins.
 */
function conceptIndexFor(
  session: MachineSession,
  panelConceptId: string,
): number | null {
  const rounds = session.concept_rounds;
  const latest = rounds[rounds.length - 1];
  if (latest === undefined) return null;
  const safe = (value: string): string => value.replace(/[^A-Za-z0-9_-]/g, "-");
  const prefix = "mc-" + safe(session.session_id) + "-";
  for (let index = 0; index < latest.concepts.length; index += 1) {
    if (prefix + safe(latest.concepts[index]!.concept_id) === panelConceptId) return index;
  }
  return null;
}

/** Every write answers with the same accepted receipt shape. */
function accepted(command: { commandId: string; idempotencyKey: string }, now: string): CommandReceipt {
  return {
    commandId: command.commandId,
    accepted: true,
    status: "SUCCEEDED",
    correlationId: command.commandId,
    occurredAt: now,
    origin: "REAL",
    idempotencyKey: command.idempotencyKey,
  };
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

    // The machine has no authentication and no roles: there is exactly one
    // actor and it may do everything the service exposes. The refusals below
    // are about what the MACHINE has, not about who the caller is.
    policy: { forbidden: false, disconnected: false },

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
        const projected = projectMachineSession(session, {
          now: options.now(),
          workspaceId: options.workspaceId,
          ownerId: options.ownerId,
          text: options.text,
        });
        // The projection stays a pure function of what the machine said. What
        // the PERSON said is laid over it here, in the layer that knows one has
        // been here at all.
        if (options.review === undefined) return projected;
        return applyNotes(projected, await readNotes(options.review, options.sessionId));
      },

      /*
        «تولید کانسپت‌ها» — the composer's one press.

        It is `createProject` rather than a new gateway member because from the
        panel's side that IS what happens: a session with no concepts becomes a
        project with concepts in it. The machine has exactly one project per
        session (the projection mints `ms-<session>`), so there is nothing to
        create beside it; what the press does is fill the one that exists.

        SPENDS. Every guard that stops it spending twice lives at the proxy,
        where two tabs and a reload can all be seen; this only supplies the
        caller's view of the session so the proxy has something to check.
      */
      async createProject(command): Promise<CommandReceipt> {
        const input = await precondition(client, options.sessionId);
        await client.generateConcepts(options.sessionId, input);
        return accepted(command, options.now());
      },

      addComment: () => refuse("add a comment"),
      selectConcepts: () => refuse("select concepts"),
      amendOutputPlan: () => refuse("amend the output plan"),
      /*
        A date is the panel's to keep, because the machine has no calendar.

        Its five calls say nothing about when anything is published, and the
        projection emits no entry for exactly that reason. Refusing here as well
        left the work a step short of done: a person could approve their content,
        watch the output assemble, and then have nowhere to put it. So the entry
        is written beside the session's review decisions and laid back over the
        next snapshot, the same way and for the same reason.
      */
      async updateCalendar(command): Promise<CommandReceipt> {
        if (options.review === undefined) refuse("update the calendar");
        await writeCalendarEntry(options.review, options.sessionId, command.entry);
        return accepted(command, options.now());
      },
      updateCalendarPackage: () => refuse("update a calendar output"),
      // Rejects rather than throws, matching the mock: an async member that
      // throws synchronously is a different failure mode for the caller.
      exportPackage: () => Promise.reject(gatewayErrors.unauthorized("export an output")),
      subscribe: () => refuse("subscribe to panel events"),
    },

    /*
      «بهبود کانسپت» — the assistant thread.

      Maps to `concepts/respond` with action `refine`, carrying the one concept
      the person is looking at as the liked one. `regenerate` is deliberately
      unreachable: it throws the round away and pays for a replacement, and no
      panel control should be able to do that by accident.

      Only the CONCEPT routes map. A revision request against content or an
      output has nothing to call — the machine builds those in one shot from an
      approved concept and cannot revise them in place.
    */
    revisionGateway: {
      async requestRevision(command): Promise<CommandReceipt> {
        if (command.route !== "CONCEPT_REVISION") refuse("revise this on the machine");
        const session = await client.session(options.sessionId);
        const index = conceptIndexFor(session, command.target.id);
        const input = {
          expectedRounds: session.concept_rounds.length,
          expectedStatus: session.status,
          feedback: command.feedbackFa,
          likedConceptIndexes: index === null ? [] : [index],
        };
        await client.respondToConcepts(options.sessionId, input);
        return accepted(command, options.now());
      },
    },

    /*
      «انتخاب برای تولید محتوا» — approving a concept.

      Two machine calls behind one decision, and the chaining is what finally
      makes the label true: `approve_concept` alone only records the choice,
      and it is `portfolio/build` that produces the research the projection
      turns into content. A person who approved and saw nothing appear would be
      right to think the button had failed.

      The build is attempted only after the approval is recorded. If it fails,
      the approval stands — it is durable and free — and the person can try the
      build again rather than losing the decision.
    */
    review: {
      async reviewItem(command): Promise<CommandReceipt> {
        /*
          Two different decisions wearing one name, and telling them apart is
          what this whole method is for.

          A decision about CONTENT is the person's own. The machine has no call
          to make for it — the portfolio is built in one shot — so it is
          recorded beside the session and laid back over the next snapshot. That
          is not a lesser kind of approval: it is what assembles the output and
          lets the work reach a calendar.

          A decision about a CONCEPT is a decision the machine acts on, so it
          travels: approve, then build the research the projection turns into
          content.
        */
        /*
          Read defensively even though the signature says it cannot be absent.
          The whole point of this layer's error model is that a raw `TypeError`
          never escapes into the query layer — one does not carry a reason, so
          `states.tsx` cannot reach its degraded branch and the surface is wiped
          instead of banner-ed. A malformed command is a schema failure, and it
          says so.
        */
        const targetType: unknown = (command.target as { type?: unknown } | undefined)?.type;
        if (targetType === undefined) {
          throw new GatewayError(
            "SCHEMA_VALIDATION_FAILED",
            "SCHEMA_VALIDATION_FAILED: a review command must name a target",
            { retryable: false },
          );
        }

        if (targetType === "CONTENT") {
          if (options.review === undefined) refuse("record a decision about this content");
          if (command.outcome === "REJECTED") {
            // The machine has nothing to discard and the panel has nothing to
            // put in its place, so a rejection here would record a state
            // nothing can leave.
            refuse("reject machine content");
          }
          await writeReviewDecision(options.review, options.sessionId, command.target.id, {
            outcome: command.outcome === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED",
            reasonFa: command.reasonFa,
            decidedAt: options.now(),
          });
          return accepted(command, options.now());
        }

        if (command.outcome !== "APPROVED") refuse("record that decision on the machine");
        const session = await client.session(options.sessionId);
        const index = conceptIndexFor(session, command.target.id);
        if (index === null) {
          throw new GatewayError("UNKNOWN_ID", "UNKNOWN_ID: no such concept in the latest round", {
            retryable: false,
          });
        }
        const base = {
          expectedRounds: session.concept_rounds.length,
          expectedStatus: session.status,
        };
        const afterApprove = await client.approveConcept(options.sessionId, {
          ...base,
          conceptIndex: index,
        });
        await client.buildPortfolio(options.sessionId, {
          expectedRounds: afterApprove.concept_rounds.length,
          expectedStatus: afterApprove.status,
        });
        return accepted(command, options.now());
      },
    },

    /*
      Still refused, and not as an oversight. ADR-0013 D1 makes the approval
      endpoint the one write path for approvals, and in REAL mode that path is
      `review.reviewItem` above. A second construction site for an
      `ApprovalCommand` here would be a second way to approve — which is the
      thing `tests/repo/panel-contract-invariants.test.ts` exists to prevent.
    */
    machineGateway: { submitApproval: () => refuse("submit an approval") },
  };
}
