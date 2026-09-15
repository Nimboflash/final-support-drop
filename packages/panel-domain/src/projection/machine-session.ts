import {
  panelSnapshotSchema,
  type PackageSnapshot,
  type PanelSnapshot,
} from "../schemas/panel-product";
import type {
  MachineConceptCard,
  MachineRecommendation,
  MachineSession,
} from "./machine-wire";

/**
 * The machine's world, projected onto the panel's (ADR-0021 D6).
 *
 * This is the ONE place `services/concept-portfolio`'s vocabulary meets the
 * panel's recorded vocabulary — the same rule `wire-codec.ts` and
 * `product-stage.ts` already follow. Nothing else in the panel knows the
 * machine exists.
 *
 * It is a PURE function on purpose. `tests/repo/determinism.test.ts` forbids
 * `Date.now` and `new Date()` anywhere in the contract packages (ADR-0019 D16),
 * and the machine emits no timestamps of its own — `SessionState` has no
 * created, updated or occurred field on any model. So the clock is a parameter,
 * supplied by the caller that legitimately owns one.
 */
export interface MachineProjectionOptions {
  /** A UTC instant. The caller owns the clock; this module must not. */
  readonly now: string;
  /** The workspace these sessions belong to. */
  readonly workspaceId: string;
  /** The acting owner, for rows that require one. */
  readonly ownerId: string;
  /**
   * How machine text becomes panel text.
   *
   * A required argument with no default, deliberately. The machine returns
   * ENGLISH — its prompts carry no language directive and its mock fixtures are
   * English strings — and the panel is fa-IR only. That collision is an open
   * decision (ADR-0021 D7), and a default here would bury the decision in this
   * file instead of leaving it visible at the composition root where somebody
   * can rule on it.
   */
  readonly text: MachineTextRenderer;
}

export interface MachineTextRenderer {
  /** Produces the Persian display string for a piece of machine text. */
  readonly toFa: (value: string) => string;
  /** The original, kept alongside when the schema has somewhere to put it. */
  readonly toEn?: (value: string) => string | undefined;
}

/* ------------------------------------------------------------------ ids -- */

/**
 * `idSchema` is `^[A-Za-z0-9_-]+$`, max 128. The machine's session ids are
 * 12 hex characters and its concept ids look like `concept_02`, so both pass —
 * but only the SHAPE passes. `concept_02` is not unique: the mock backend mints
 * `concept_01..05` in every round of every session, and the real backend's ids
 * are model-authored with no uniqueness constraint at all.
 *
 * So every panel id is namespaced by the session, and concept identity is keyed
 * on `(session_id, concept_id)` — which is also the answer this projection
 * gives to the open question of whether round 2's `concept_02` is round 1's
 * concept revised. It treats it as the same concept, revised. That is
 * provisional and recorded (ADR-0021, OD-4); if the owner rules otherwise, the
 * change is confined to `conceptId()` and `versionId()` below.
 */
const safe = (value: string): string => value.replace(/[^A-Za-z0-9_-]/g, "-");

/** Matches the demo world's envelope; `schemaVersionSchema` pins the semver form. */
const SCHEMA_VERSION = "1.0.0";

const projectId = (sessionId: string): string => `ms-${safe(sessionId)}`;
const conceptId = (sessionId: string, machineConceptId: string): string =>
  `mc-${safe(sessionId)}-${safe(machineConceptId)}`;
const versionId = (sessionId: string, machineConceptId: string, round: number): string =>
  `${conceptId(sessionId, machineConceptId)}-v${String(round)}`;
const contentId = (sessionId: string, category: string, rank: number): string =>
  `mt-${safe(sessionId)}-${category}-${String(rank)}`;

/* ---------------------------------------------------------- categories -- */

/**
 * The machine's five portfolio categories against the closed `OUTPUT_TYPES`.
 *
 * Three land. Two do not: `scientific_readings` and `artistic_readings` have no
 * member in the recorded set, and inventing one is precisely what ADR-0019 D5
 * and ADR-0021 D6 forbid. `BOOK` is the nearest and it is not the same thing —
 * a reading recommendation is not a book output. So they map to `null` and the
 * projection drops them, which is a real and stated loss (ADR-0021, OD-5):
 * roughly six of twenty-four recommendations do not reach the panel.
 *
 * Null-tolerant on purpose, in the pattern of the other projection tables. The
 * nulls are the open decision, made visible rather than closed by invention.
 */
export const MACHINE_CATEGORY_TO_OUTPUT_TYPE = {
  music: "MUSIC",
  films_and_series: "FILM",
  artworks: "ART_DESIGN",
  scientific_readings: null,
  artistic_readings: null,
} as const;

export type MachineCategory = keyof typeof MACHINE_CATEGORY_TO_OUTPUT_TYPE;

/* --------------------------------------------------------------- stage -- */

/**
 * The product stage, derived from FACTS rather than from the machine's status.
 *
 * `SessionState.status` cannot be trusted as a state machine. The service
 * writes it and never reads it — every precondition tests an artifact instead —
 * and it regresses: calling `respond` after a portfolio is built sets it back
 * to `CONCEPTS_READY` while leaving the finished portfolio in place. A
 * projection that trusted it would tell the panel a session is still choosing
 * concepts while holding its completed research.
 */
export function machineProductStage(session: MachineSession): "DRAFT" | "CONCEPTS" | "RESEARCH_CONTENT" {
  if (session.concept_rounds.length === 0) return "DRAFT";
  if (session.portfolio !== null) return "RESEARCH_CONTENT";
  return "CONCEPTS";
}

/** The active version of a concept already projected into the snapshot. */
function activeVersionOf(
  concepts: readonly { readonly id: string; readonly activeVersionId: string }[],
  id: string,
): string {
  return concepts.find((c) => c.id === id)?.activeVersionId ?? id;
}

/* ---------------------------------------------------------- projection -- */

/**
 * Projects one machine session onto one panel project and its dependent rows.
 *
 * The result is parsed by `panelSnapshotSchema` before it is returned, so a
 * mapping error is a loud failure here rather than a broken surface later.
 */
/**
 * The machine's portfolio, projected as the output it is.
 *
 * `build_portfolio` produces exactly one artifact per session and the panel
 * calls that artifact an output, so the mapping is one-to-one rather than
 * anything assembled here. A session without a portfolio has nothing built yet
 * and emits nothing.
 *
 * `isMock: false` is the whole point of OD-2 being ruled: this is real research
 * from a real model call, and the flag exists so nothing MISTAKES mock material
 * for real. Saying `true` here to satisfy a literal would have been the exact
 * claim the rule was written to prevent.
 *
 * `files` carries the machine's own final report, which is the file a person
 * would actually want out of this. Its bytes are not re-read here — the
 * projection is pure and transport-free — so the entry names the report and its
 * type, and the export path supplies the content.
 */
function portfolioPackage(
  sid: string,
  session: MachineSession,
  concepts: readonly { readonly id: string; readonly activeVersionId: string }[],
  content: readonly { readonly id: string; readonly activeVersionId: string }[],
  now: string,
): readonly PackageSnapshot[] {
  if (session.portfolio === null) return [];
  // A package must carry at least one concept version and one content version.
  // Both are guaranteed the moment a portfolio exists — the machine refuses to
  // build one without an approved concept — but a projection reads what it was
  // given rather than trusting an invariant it cannot enforce.
  const approved = session.approved_concept_id;
  const conceptVersionIds =
    approved === null
      ? concepts.slice(0, 1).map((c) => c.activeVersionId)
      : concepts.filter((c) => c.id === conceptId(sid, approved)).map((c) => c.activeVersionId);
  if (conceptVersionIds.length === 0 || content.length === 0) return [];

  const familyId = `mpk-${safe(sid)}`;
  return [
    {
      id: `${familyId}-v1`,
      familyId,
      projectId: projectId(sid),
      version: 1,
      planRevision: 1,
      // CURRENT: this is the live assembly of the session. STALE and HISTORICAL
      // describe a package a newer one has superseded, and the machine keeps
      // exactly one portfolio per session, so neither can arise here.
      status: "CURRENT" as const,
      conceptVersionIds,
      contentVersionIds: content.map((item) => item.activeVersionId),
      /*
        One file, naming the machine's own final report.

        `body` is empty and `contentVersionId` is null deliberately. This
        projection is pure and transport-free — it is handed a parsed session,
        never a filesystem — and the report lives in the machine's run
        directory, which only the service can read. The entry records that the
        report EXISTS and what it is called; anything that needs its bytes must
        go and get them.
      */
      files: [{ path: "final_report.md", contentVersionId: null, body: "" }],
      createdAt: now,
      isMock: false,
    },
  ];
}

export function projectMachineSession(
  session: MachineSession,
  options: MachineProjectionOptions,
): PanelSnapshot {
  const { now, workspaceId, ownerId, text } = options;
  const sid = session.session_id;

  /*
    Concept identity across rounds. The latest round a concept appears in is its
    ACTIVE version; earlier appearances are its history. Array position is the
    round number, because `round_index` is whatever the model echoed back — the
    service hard-codes 1 on the first call and never corrects the answer, so two
    rounds can both claim to be round 1.
  */
  const seen = new Map<string, { card: MachineConceptCard; rounds: number[] }>();
  session.concept_rounds.forEach((batch, index) => {
    for (const card of batch.concepts) {
      const existing = seen.get(card.concept_id);
      if (existing === undefined) seen.set(card.concept_id, { card, rounds: [index + 1] });
      else {
        existing.card = card;
        existing.rounds.push(index + 1);
      }
    }
  });

  const conceptVersions: PanelSnapshot["conceptVersions"] = [];
  const concepts: PanelSnapshot["concepts"] = [];

  for (const [machineConceptId, { card, rounds }] of seen) {
    const id = conceptId(sid, machineConceptId);
    const latest = rounds[rounds.length - 1]!;
    const approved = session.approved_concept_id === machineConceptId;

    for (const round of rounds) {
      conceptVersions.push({
        id: versionId(sid, machineConceptId, round),
        conceptId: id,
        number: round,
        titleFa: text.toFa(card.title),
        ...(text.toEn?.(card.title) === undefined ? {} : { titleEn: text.toEn(card.title) }),
        thesisFa: text.toFa(card.one_line || card.central_idea || card.title),
        dropRationaleFa: text.toFa(card.why_it_fits || card.human_truth || card.title),
        directions: [],
        // The machine never tells us which feedback produced which round: the
        // action word is written only to events.jsonl and never reaches the
        // model or the session state. Claiming one would be an invention.
        feedbackAppliedFa: null,
        createdAt: now,
      });
    }

    concepts.push({
      id,
      projectId: projectId(sid),
      batchId: `mb-${safe(sid)}-${String(latest)}`,
      activeVersionId: versionId(sid, machineConceptId, latest),
      reviewStatus: approved ? "APPROVED" : "IN_REVIEW",
      /*
        Staleness is the honest home for the machine's self-contradiction: an
        approval survives a later round, so `approved_concept_id` can point at a
        concept whose newest version the reviewer never saw. That is exactly
        what STALE means on the panel's recorded axis, so it is recorded there
        rather than hidden.
      */
      freshness: approved && rounds.length > 1 ? "STALE" : "CURRENT",
      pendingRevisionId: null,
      replacesConceptId: null,
      rejectionReasonFa: null,
      rowVersion: rounds.length,
      updatedAt: now,
    });
  }

  /* Portfolio -> content items, one per recommendation the panel can express. */
  const content: PanelSnapshot["content"] = [];
  const contentVersions: PanelSnapshot["contentVersions"] = [];
  const approvedConceptId =
    session.approved_concept_id === null ? null : conceptId(sid, session.approved_concept_id);

  if (session.portfolio !== null && approvedConceptId !== null) {
    for (const [category, outputType] of Object.entries(MACHINE_CATEGORY_TO_OUTPUT_TYPE)) {
      if (outputType === null) continue;
      const items = session.portfolio[category as MachineCategory];
      items.forEach((item: MachineRecommendation, index: number) => {
        const id = contentId(sid, category, index + 1);
        const vId = `${id}-v1`;
        contentVersions.push({
          id: vId,
          contentId: id,
          number: 1,
          // Frozen against the exact concept version this research was built
          // for, which is what makes staleness detectable at all.
          conceptVersionId: activeVersionOf(concepts, approvedConceptId),
          titleFa: text.toFa(item.title),
          bodyFa: text.toFa(
            [item.creator, item.why_related, item.source_notes].filter(Boolean).join("\n\n") ||
              item.title,
          ),
          // `links` are model-authored URLs and `sourceIds` is `array(idSchema)`
          // — a URL fails that pattern on its colon and slashes. They are not
          // ids and must not be laundered into an id field.
          sourceIds: [],
          createdAt: now,
        });
        content.push({
          id,
          projectId: projectId(sid),
          conceptId: approvedConceptId,
          type: outputType,
          activeVersionId: vId,
          generationState: "SUCCEEDED",
          blockedReasonCode: null,
          blockedReasonFa: null,
          reviewStatus: "IN_REVIEW",
          freshness: "CURRENT",
          editorialStatus: "NOT_REQUIRED",
          pendingRevisionId: null,
          rowVersion: 1,
          updatedAt: now,
        });
      });
    }
  }

  const stage = machineProductStage(session);
  const selected =
    approvedConceptId === null
      ? []
      : concepts.filter((c) => c.id === approvedConceptId).map((c) => c.activeVersionId);

  const brief = session.input.project_brief;

  const snapshot = {
    schemaVersion: SCHEMA_VERSION,
    snapshotKind: "drop.panel.machine.v1",
    revision: 1,
    clock: now,
    discoverySeed: 0,
    projects: [
      {
        id: projectId(sid),
        workspaceId,
        rowVersion: 1,
        titleFa: text.toFa(brief || "Machine session"),
        stage,
        // The machine takes a brief, a context, a feeling and a seed — all
        // free text, none of them a reference in the panel's sense (a file,
        // a URL, a prior artifact). BLANK is the truthful mode.
        input: { mode: "BLANK" as const },
        ownerId,
        selectedConceptVersionIds: selected,
        outputPlan: {
          revision: 1,
          includedConceptIds: approvedConceptId === null ? [] : [approvedConceptId],
          /*
            Nothing a machine portfolio contains is REQUIRED, and calling it all
            required is what stranded the work one step from the end.

            `build_portfolio` returns research — music, films, artworks,
            readings — as a menu for a person to draw from. The panel's plan
            model reads `requiredContentIds` as "the output is not assembled
            until every one of these is approved", so declaring all eighteen
            required demanded approval of every item before anything could be
            published. And there is no way to say "this one is not needed": the
            machine has no reject, so the demand was unsatisfiable except by
            approving material the person did not want in their output.

            Optional is the truthful reading. What gets approved is what goes in;
            what does not is simply left out.

            Content ITEM ids, not version ids: the package join builds
            `n:content-review:${id}` from these.
          */
          requiredContentIds: [],
          optionalContentIds: content.map((item) => item.id),
        },
        targetDate: null,
        createdAt: now,
        updatedAt: now,
        type: "PROGRAM" as const,
        /*
          `PanelProject` requires a fully-formed embedded Program, and a machine
          session supplies none of it — no status, no type, no lens mode, no
          creator. Every value here is SYNTHESIZED to satisfy the schema, and
          saying so plainly matters: a reader must not mistake `IN_PIPELINE` for
          something the machine reported. It reported nothing.
        */
        program: {
          summary: {
            id: `mp-${safe(sid)}`,
            projectId: projectId(sid),
            title: text.toFa(brief || "Machine session"),
            // DRAFT, not IN_PIPELINE: the latter requires an
            // `activePipelineRunId`, and the machine has no pipeline run to
            // point at. Claiming one to satisfy a refine would be exactly the
            // invention this projection exists to avoid. DRAFT claims least.
            status: "DRAFT" as const,
            programType: "THEMATIC_PROGRAM" as const,
            lensMode: "NONE" as const,
            updatedAt: now,
            rowVersion: 1,
          },
          createdByActorId: ownerId,
          createdAt: now,
        },
      },
    ],
    concepts,
    conceptVersions,
    content,
    contentVersions,
    comments: [],
    decisions: [],
    /*
      The machine's `portfolio` IS the assembled output, so it is projected as
      one — this is not synthesis, it is the one artifact `build_portfolio`
      actually produces.

      It used to be empty, and the recorded reason was real: `packageSnapshotSchema`
      pinned `isMock: z.literal(true)`, so a genuine machine package could not be
      expressed without claiming to be a mock, and a calendar entry must point at
      a package version. That literal is now a boolean (OD-2, ruled by the owner),
      so a real output can say what it is — `isMock: false` — and be scheduled.

      Absent a portfolio there is nothing assembled and nothing to emit.
    */
    packages: portfolioPackage(sid, session, concepts, content, now),
    calendar: [],
  };

  return panelSnapshotSchema.parse(snapshot);
}
