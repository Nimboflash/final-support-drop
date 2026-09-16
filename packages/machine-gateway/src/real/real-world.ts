import {
  projectMachineSession,
  type CommandReceipt,
  type MachineSession,
  type PanelSnapshot,
  type MachineTextRenderer,
} from "@drop/panel-domain";
import { GatewayError, NEXT_ACTIONS } from "../errors";
import type { MachineHttpPort } from "./machine-http-port";
import { createMachineClient, isMachineSessionId, type MachineClient } from "./machine-client";
import type { PanelWorld } from "./panel-world";
import {
  applyNotes,
  clearContentReviews,
  readNotes,
  writeCalendarEntry,
  writeConceptDecision,
  writeConceptRequest,
  writeReviewDecision,
  type MachineReviewPort,
} from "./review-store";

/**
 * A live world over a concept-portfolio session (ticket P10; writes are slice 2).
 *
 * `getSnapshot()` reads the machine and projects it. FOUR writes reach the
 * machine — generate, refine, approve and build — and a further four are the
 * PANEL's own, kept in the notes beside the session: content review, setting
 * a concept aside, the request text behind a refinement, and the calendar.
 * What refuses is what the machine genuinely has no notion of AND the panel
 * has no honest home for: comments, plan amendments, a second project, an
 * event stream.
 *
 * Those refusals used to be `UNAUTHORIZED` because of its Persian rendering —
 * «با نقش فعلی، اجازهٔ این کار را ندارید» — which was true while this world
 * declared `policy.forbidden` and false from the moment writes landed: the
 * person may do everything the machine exposes, so a sentence about their ROLE
 * blamed them for a limit of the machine's. The reason stays `UNAUTHORIZED`
 * (ADR-0021 D6 forbids a ninth), and `nextPermittedActions` now carries
 * `UNSUPPORTED_BY_MACHINE`, which `commandErrorFa` renders as what it is.
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
   * Where the person's own notes about the session are kept.
   *
   * Optional, because a world without one is still a correct read-only world —
   * it simply cannot record that someone looked at a track and said yes. When
   * absent, every panel-side write refuses with a reason rather than pretending.
   */
  readonly review?: MachineReviewPort;
}

export interface RealWorld extends PanelWorld {
  /** The session this world is bound to. */
  readonly sessionId: string;
  /** The typed reader, for surfaces that need the machine's own health. */
  readonly client: MachineClient;
}

/** The machine has no such verb, and the panel has nowhere honest to keep it. */
function refuse(action: string): never {
  throw new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: the machine cannot ${action}`, {
    retryable: false,
    nextPermittedActions: [NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE],
  });
}

/** The panel-side ledger is missing, so a decision would be accepted and lost. */
function noLedger(action: string): never {
  throw new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: nowhere to ${action}`, {
    retryable: false,
    nextPermittedActions: [NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE],
  });
}

function needsReason(): never {
  throw new GatewayError(
    "SCHEMA_VALIDATION_FAILED",
    "SCHEMA_VALIDATION_FAILED: a decision that is not an approval requires a reason (ADR-0013 D2)",
    { retryable: false, nextPermittedActions: [NEXT_ACTIONS.ADD_A_REASON] },
  );
}

/**
 * What the proxy checks the caller's belief against.
 *
 * Read immediately before every write, from the same client the reads use, so
 * a write always carries the caller's most recent view rather than whatever a
 * React render happened to close over. The proxy re-reads under its own lock
 * and refuses on a mismatch; this only makes the common case succeed.
 */
function preconditionOf(session: MachineSession): { expectedRounds: number; expectedStatus: string } {
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
function conceptIndexFor(session: MachineSession, panelConceptId: string): number | null {
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

function unknownConcept(): never {
  throw new GatewayError("UNKNOWN_ID", "UNKNOWN_ID: no such concept in the latest round", {
    retryable: false,
  });
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
  const sid = options.sessionId;

  /**
   * Approves a concept if the machine does not already hold it approved, then
   * builds the research from it.
   *
   * `replace` is the one flag that lets the build run over an existing
   * portfolio. It is passed ONLY by the rebuild route below, which the panel
   * reaches through an explicit confirmation — because replacing research is
   * a deliberate purchase, never a side effect of a click.
   *
   * The approval is SKIPPED when already recorded, which is what makes a
   * failed build recoverable: a build can fail on its own (the model call is
   * the part that can time out or come back unparseable), and re-running the
   * approval would hit the machine's own guard. Now the same press retries
   * just the half that failed.
   */
  async function approveAndBuild(
    session: MachineSession,
    index: number,
    replace: boolean,
  ): Promise<void> {
    const round = session.concept_rounds[session.concept_rounds.length - 1];
    const machineConceptId = round?.concepts[index]?.concept_id ?? null;
    const alreadyApproved =
      machineConceptId !== null && session.approved_concept_id === machineConceptId;

    const afterApprove = alreadyApproved
      ? session
      : await client.approveConcept(sid, { ...preconditionOf(session), conceptIndex: index });

    await client.buildPortfolio(sid, {
      ...preconditionOf(afterApprove),
      ...(replace ? { replaceExistingPortfolio: true } : {}),
    });
  }

  return {
    sessionId: sid,
    client,

    // The machine has no authentication and no roles: there is exactly one
    // actor and it may do everything the service exposes. The refusals below
    // are about what the MACHINE has, not about who the caller is.
    policy: { forbidden: false, disconnected: false },

    panelCommandGateway: {
      async getSnapshot(): Promise<PanelSnapshot> {
        const session = await client.session(sid);
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
        return applyNotes(projected, await readNotes(options.review, sid), {
          actorId: options.ownerId,
        });
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
        const session = await client.session(sid);
        await client.generateConcepts(sid, preconditionOf(session));
        return accepted(command, options.now());
      },

      addComment: () => refuse("keep a comment"),
      selectConcepts: () => refuse("select several concepts at once"),
      amendOutputPlan: () => refuse("amend an output plan"),
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
        if (options.review === undefined) noLedger("keep a date");
        await writeCalendarEntry(options.review, sid, command.entry);
        return accepted(command, options.now());
      },
      updateCalendarPackage: () => refuse("change which output a date points at"),
      // Rejects rather than throws, matching the mock: an async member that
      // throws synchronously is a different failure mode for the caller.
      exportPackage: () => Promise.reject(gatewayUnsupported("export an output")),
      subscribe: () => refuse("stream events"),
    },

    /*
      Two routes reach the machine; two are refused.

        CONCEPT_REVISION   «بهبود کانسپت» — `concepts/respond` with action
                           `refine`, carrying the one concept the person is
                           looking at as the liked one. The request text is
                           then kept in the notes, because the machine writes
                           it only to its events log and the thread would
                           otherwise forget it on close.

        RESEARCH_REFRESH   «بازسازی محتوا» on a CONCEPT — approve it if the
                           machine does not already hold it approved, then
                           `portfolio/build` with `replaceExistingPortfolio`.
                           This is the ONE path that may build over existing
                           research, and the panel reaches it only through an
                           explicit confirmation that names the cost. Content
                           reviews are cleared afterwards, because the tracks
                           they were about no longer exist.

        CONCEPT_REPLACEMENT is `regenerate` on the machine, which throws the
        whole round away and pays for a replacement; no panel control should
        be able to do that by accident. CONTENT_REWRITE has nothing to call —
        the machine builds content in one shot and cannot revise one item.
    */
    revisionGateway: {
      async requestRevision(command): Promise<CommandReceipt> {
        const targetType: unknown = (command.target as { type?: unknown } | undefined)?.type;
        if (targetType !== "CONCEPT") refuse("revise this in place");

        if (command.route === "CONCEPT_REVISION") {
          const session = await client.session(sid);
          const index = conceptIndexFor(session, command.target.id);
          await client.respondToConcepts(sid, {
            ...preconditionOf(session),
            feedback: command.feedbackFa,
            likedConceptIndexes: index === null ? [] : [index],
          });
          if (options.review !== undefined) {
            await writeConceptRequest(options.review, sid, {
              conceptId: command.target.id,
              feedbackFa: command.feedbackFa,
              at: options.now(),
            });
          }
          return accepted(command, options.now());
        }

        if (command.route === "RESEARCH_REFRESH") {
          const session = await client.session(sid);
          const index = conceptIndexFor(session, command.target.id);
          if (index === null) unknownConcept();
          await approveAndBuild(session, index, session.portfolio !== null);
          if (options.review !== undefined) {
            await clearContentReviews(options.review, sid);
            // A concept the person is now building from is not one they set
            // aside, whatever an older note says.
            await writeConceptDecision(options.review, sid, command.target.id, null);
          }
          return accepted(command, options.now());
        }

        return refuse("regenerate or rewrite this");
      },
    },

    review: {
      async reviewItem(command): Promise<CommandReceipt> {
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

        /*
          A decision about CONTENT is the person's own. The machine has no call
          to make for it — the portfolio is built in one shot — so it is
          recorded beside the session and laid back over the next snapshot. That
          is not a lesser kind of approval: it is what assembles the output and
          lets the work reach a calendar.
        */
        if (targetType === "CONTENT") {
          if (options.review === undefined) noLedger("record a decision about this content");
          if (command.outcome === "REJECTED") {
            // The machine has nothing to discard and the panel has nothing to
            // put in its place, so a rejection here would record a state
            // nothing can leave.
            refuse("discard one piece of content");
          }
          if (command.outcome === "CHANGES_REQUESTED" && command.reasonFa === null) needsReason();
          await writeReviewDecision(options.review, sid, command.target.id, {
            outcome: command.outcome === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED",
            reasonFa: command.reasonFa,
            decidedAt: options.now(),
          });
          return accepted(command, options.now());
        }

        /*
          «کنار گذاشتن» — the person's fact, kept by the panel.

          `approve_concept` is the machine's only review verb for a concept;
          there is no reject on its side. That used to make this refuse every
          time, with a sentence blaming the person's role, and left a round's
          unchosen concepts uncleared forever — the «بررسی کانسپت‌ها» row on
          the overview could never reach zero. What the machine cannot record,
          the panel records, exactly as it does for content.

          What it will NOT do is set aside the concept the machine holds
          approved: that is the one whose research exists, and a note saying
          otherwise would contradict every content row on screen.
        */
        if (command.outcome === "REJECTED") {
          if (options.review === undefined) noLedger("record that this concept is set aside");
          const reasonFa = command.reasonFa;
          if (reasonFa === null || reasonFa.trim() === "") needsReason();
          const session = await client.session(sid);
          const index = conceptIndexFor(session, command.target.id);
          if (index === null) unknownConcept();
          const machineConceptId =
            session.concept_rounds[session.concept_rounds.length - 1]?.concepts[index]?.concept_id;
          if (machineConceptId !== undefined && session.approved_concept_id === machineConceptId) {
            throw new GatewayError(
              "INVALID_STATE_TRANSITION",
              "INVALID_STATE_TRANSITION: the concept the research was built from cannot be set aside",
              { retryable: false },
            );
          }
          await writeConceptDecision(options.review, sid, command.target.id, {
            outcome: "REJECTED",
            reasonFa,
            decidedAt: options.now(),
          });
          return accepted(command, options.now());
        }

        if (command.outcome !== "APPROVED") refuse("hold a concept for changes");

        /*
          «انتخاب برای تولید محتوا» — approving a concept.

          Two machine calls behind one decision, and the chaining is what makes
          the label true: `approve_concept` alone only records the choice, and
          it is `portfolio/build` that produces the research the projection
          turns into content. A person who approved and saw nothing appear
          would be right to think the button had failed.

          The order of the checks is what stops the pair half-applying.
          `approve_concept` is free and succeeds unconditionally;
          `portfolio/build` is paid and refuses over an existing portfolio. Run
          blind, selecting a SECOND concept did both things wrong at once: the
          approval landed, the build was refused, and the machine was left
          pointing at a concept whose research had never been made — while the
          projection hung the FIRST concept's research under the second's
          title. So the state is read first, and the refusal happens BEFORE
          anything is written.
        */
        const session = await client.session(sid);
        const index = conceptIndexFor(session, command.target.id);
        if (index === null) unknownConcept();

        const round = session.concept_rounds[session.concept_rounds.length - 1];
        const machineConceptId = round?.concepts[index]?.concept_id ?? null;
        const alreadyApproved =
          machineConceptId !== null && session.approved_concept_id === machineConceptId;

        if (session.portfolio !== null && !alreadyApproved) {
          // Switching concepts means paying for a second portfolio over the
          // first. That is a deliberate purchase, and it has its own route —
          // RESEARCH_REFRESH — behind a confirmation that names the cost.
          throw new GatewayError(
            "INVALID_STATE_TRANSITION",
            "INVALID_STATE_TRANSITION: this session already has research built for another concept",
            { retryable: false, nextPermittedActions: [NEXT_ACTIONS.REPLACE_EXISTING] },
          );
        }

        if (alreadyApproved && session.portfolio !== null) {
          // Nothing to do: it is selected and its research exists. Idempotent
          // rather than refused, so a double press costs nothing and says
          // nothing alarming.
          return accepted(command, options.now());
        }

        await approveAndBuild(session, index, false);
        if (options.review !== undefined) {
          await writeConceptDecision(options.review, sid, command.target.id, null);
        }
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
    machineGateway: { submitApproval: () => refuse("approve outside the review path") },
  };
}

/** The rejected-promise form of `refuse`, for the one member that must reject. */
function gatewayUnsupported(action: string): GatewayError {
  return new GatewayError("UNAUTHORIZED", `UNAUTHORIZED: the machine cannot ${action}`, {
    retryable: false,
    nextPermittedActions: [NEXT_ACTIONS.UNSUPPORTED_BY_MACHINE],
  });
}
