import type { PanelCalendarEntry, PanelSnapshot } from "@drop/panel-domain";

/**
 * Where a person's review of MACHINE content is kept (ticket P10, slice 2).
 *
 * The machine cannot hold it. Its whole write surface is five calls, the
 * portfolio arrives complete in one shot, and there is no "this track is
 * approved" anywhere in it. The first cut of the write path read that fact and
 * drew the wrong conclusion — that the panel must therefore not offer approval
 * at all — which conflated two different things:
 *
 *   telling the MACHINE a per-item decision   — genuinely impossible
 *   the PERSON marking an item reviewed       — legitimate, and the only way
 *                                                the work moves forward
 *
 * Taking the second away dead-ends the journey at content: an output assembles
 * when its content is approved, so with nothing approvable there is nothing to
 * schedule and nothing to publish. So the decision lives here instead, beside
 * the session it is about, and the panel is honest about which of the two it
 * just did.
 *
 * The same reasoning covers three more things, each added because a surface
 * was lying without it:
 *
 *   the CALENDAR    — the machine has no notion of when anything is published,
 *                     so a date is the panel's to keep.
 *   SETTING ASIDE   — `approve_concept` is the machine's only verb for a
 *                     concept. «کنار گذاشتن» sent a REJECTED it could not
 *                     record, failed every time, and blamed the person's role.
 *                     A concept the person has set aside is the person's fact.
 *   the REQUESTS    — what a person asked «بهبود کانسپت» for reaches the model
 *                     and is then written only to the machine's events log,
 *                     never to its session state. The panel's thread was
 *                     write-only: close the sheet and the request was gone.
 *
 * Everything here is laid back over the projection by `applyNotes`, which also
 * turns the decisions into تاریخچه rows — a destination that was permanently
 * empty in REAL mode while its empty state promised otherwise.
 *
 * NOT the demo key, and that separation is load-bearing. `demo-persistence.ts`
 * stamps whatever it is handed with the MOCK discriminator and validates only
 * that field on the way back in, so one machine write into that key would make
 * the demo world silently resume from machine data forever. This store holds
 * DECISIONS, DATES and REQUESTS — never a snapshot — under its own key.
 */

/**
 * The transport seam.
 *
 * ASYNC, because the answer is not in this process. It began as a synchronous
 * `localStorage` pair, which made the decisions per-browser and per-device — a
 * person who approved content on one machine found none of it on the next, and
 * the only honest thing the setup guide could say was "they do not follow you".
 *
 * The notes now live beside the session they are about, in the machine's own
 * run directory, written through a route this app owns. That is where a
 * decision about a session belongs: it travels with the session, survives a
 * cleared browser, and is visible to anything else reading that run.
 */
export interface MachineReviewPort {
  read(sessionId: string): Promise<string | null>;
  write(sessionId: string, payload: string): Promise<void>;
}

export type MachineReviewOutcome = "APPROVED" | "CHANGES_REQUESTED";

export interface MachineReviewDecision {
  readonly outcome: MachineReviewOutcome;
  /** What the person said, when they said anything. */
  readonly reasonFa: string | null;
  readonly decidedAt: string;
}

/** contentId → decision. Absent means undecided, which is not the same as rejected. */
export type MachineReviewLog = Readonly<Record<string, MachineReviewDecision>>;

/** A concept the person set aside. The only verb here is the one the machine lacks. */
export interface MachineConceptDecision {
  readonly outcome: "REJECTED";
  /** V2 01 §4 — a rejection always has a reason. */
  readonly reasonFa: string;
  readonly decidedAt: string;
}

/** What the person asked the machine to do to a concept, in their words. */
export interface MachineConceptRequest {
  readonly conceptId: string;
  readonly feedbackFa: string;
  readonly at: string;
}

/** Everything the PANEL knows about a session that the machine does not. */
export interface MachineSessionNotes {
  readonly reviews: MachineReviewLog;
  /** Keyed by entry id, so scheduling the same output twice replaces rather than duplicates. */
  readonly calendar: Readonly<Record<string, PanelCalendarEntry>>;
  /** conceptId → set-aside. Absent means the machine's own status stands. */
  readonly concepts: Readonly<Record<string, MachineConceptDecision>>;
  /** In the order they were made. */
  readonly requests: readonly MachineConceptRequest[];
}

const EMPTY: MachineReviewLog = {};
const EMPTY_NOTES: MachineSessionNotes = { reviews: {}, calendar: {}, concepts: {}, requests: [] };

/**
 * Reads the log, treating anything unrecognised as empty.
 *
 * Stored state is untrusted input like any other: a hand-edited key, a payload
 * from an older shape, or a quota-truncated string must read as "no decisions
 * yet" rather than throw on a surface a person is trying to use.
 */
export async function readNotes(
  port: MachineReviewPort,
  sessionId: string,
): Promise<MachineSessionNotes> {
  const raw = await port.read(sessionId);
  if (raw === null) return EMPTY_NOTES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY_NOTES;
    const held = parsed as Record<string, unknown>;
    /*
      Two shapes, because an earlier version of this store wrote the review log
      at the top level. A person who reviewed content before dates existed must
      not lose those decisions on the next read — so a payload with no `reviews`
      key is treated as the log itself.
    */
    const reviewsRaw = held.reviews ?? held;
    return {
      reviews: readReviewsFrom(reviewsRaw),
      calendar: readCalendarFrom(held.calendar),
      concepts: readConceptsFrom(held.concepts),
      requests: readRequestsFrom(held.requests),
    };
  } catch {
    return EMPTY_NOTES;
  }
}

/** Entries are re-validated by the snapshot schema, so this only shapes them. */
function readCalendarFrom(value: unknown): Readonly<Record<string, PanelCalendarEntry>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, PanelCalendarEntry> = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "object" && entry !== null) out[id] = entry as PanelCalendarEntry;
  }
  return out;
}

function readReviewsFrom(value: unknown): MachineReviewLog {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return EMPTY;
  const out: Record<string, MachineReviewDecision> = {};
  for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== "object" || item === null) continue;
    const decision = item as Record<string, unknown>;
    const outcome = decision.outcome;
    if (outcome !== "APPROVED" && outcome !== "CHANGES_REQUESTED") continue;
    out[id] = {
      outcome,
      reasonFa: typeof decision.reasonFa === "string" ? decision.reasonFa : null,
      decidedAt: typeof decision.decidedAt === "string" ? decision.decidedAt : "",
    };
  }
  return out;
}

function readConceptsFrom(value: unknown): Readonly<Record<string, MachineConceptDecision>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, MachineConceptDecision> = {};
  for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== "object" || item === null) continue;
    const decision = item as Record<string, unknown>;
    // A set-aside with no reason is the silent deletion V2 01 §4 rules out, so
    // one that lost its reason in storage is not resurrected.
    if (decision.outcome !== "REJECTED" || typeof decision.reasonFa !== "string") continue;
    if (decision.reasonFa.trim() === "") continue;
    out[id] = {
      outcome: "REJECTED",
      reasonFa: decision.reasonFa,
      decidedAt: typeof decision.decidedAt === "string" ? decision.decidedAt : "",
    };
  }
  return out;
}

function readRequestsFrom(value: unknown): readonly MachineConceptRequest[] {
  if (!Array.isArray(value)) return [];
  const out: MachineConceptRequest[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const request = item as Record<string, unknown>;
    if (typeof request.conceptId !== "string" || typeof request.feedbackFa !== "string") continue;
    if (request.feedbackFa.trim() === "") continue;
    out.push({
      conceptId: request.conceptId,
      feedbackFa: request.feedbackFa,
      at: typeof request.at === "string" ? request.at : "",
    });
  }
  return out;
}

async function save(port: MachineReviewPort, sessionId: string, next: MachineSessionNotes) {
  await port.write(sessionId, JSON.stringify(next));
}

export async function writeReviewDecision(
  port: MachineReviewPort,
  sessionId: string,
  contentId: string,
  decision: MachineReviewDecision,
): Promise<void> {
  const notes = await readNotes(port, sessionId);
  await save(port, sessionId, { ...notes, reviews: { ...notes.reviews, [contentId]: decision } });
}

/**
 * Forgets every content decision.
 *
 * Called when the research is REBUILT. Content ids are minted from category
 * and rank (`mt-<session>-<category>-<rank>`) with no concept and no version
 * in them, so an approval given to the third track of the old portfolio would
 * otherwise attach itself to the third track of the new one — a piece of
 * content the person has never seen, reading «تأییدشده».
 */
export async function clearContentReviews(port: MachineReviewPort, sessionId: string): Promise<void> {
  const notes = await readNotes(port, sessionId);
  if (Object.keys(notes.reviews).length === 0) return;
  await save(port, sessionId, { ...notes, reviews: {} });
}

export async function writeCalendarEntry(
  port: MachineReviewPort,
  sessionId: string,
  entry: PanelCalendarEntry,
): Promise<void> {
  const notes = await readNotes(port, sessionId);
  await save(port, sessionId, { ...notes, calendar: { ...notes.calendar, [entry.id]: entry } });
}

/** `null` withdraws a set-aside — the person selected the concept after all. */
export async function writeConceptDecision(
  port: MachineReviewPort,
  sessionId: string,
  conceptId: string,
  decision: MachineConceptDecision | null,
): Promise<void> {
  const notes = await readNotes(port, sessionId);
  const concepts: Record<string, MachineConceptDecision> = { ...notes.concepts };
  if (decision === null) delete concepts[conceptId];
  else concepts[conceptId] = decision;
  await save(port, sessionId, { ...notes, concepts });
}

export async function writeConceptRequest(
  port: MachineReviewPort,
  sessionId: string,
  request: MachineConceptRequest,
): Promise<void> {
  const notes = await readNotes(port, sessionId);
  await save(port, sessionId, { ...notes, requests: [...notes.requests, request] });
}

export interface ApplyNotesOptions {
  /** Who the decisions and requests are attributed to. There is exactly one actor. */
  readonly actorId: string;
}

/**
 * Lays recorded decisions over a freshly projected snapshot.
 *
 * The projection is a pure function of what the machine said, and it stays
 * that way — this runs after it, in the world, which is the layer that knows a
 * person has been here. `contentStateOf` reads `reviewStatus` and `freshness`
 * together, so an approval has to set both or the item reads as approved-but-
 * stale and the output never assembles.
 *
 * The decisions are ALSO emitted as `decisions` rows and the requests as
 * `comments`, in the recorded read-model shapes, so تاریخچه and the concept
 * thread show them. Nothing here invents a row the person did not make.
 */
export function applyNotes(
  snapshot: PanelSnapshot,
  notes: MachineSessionNotes,
  options: ApplyNotesOptions,
): PanelSnapshot {
  const dates = Object.values(notes.calendar);
  const log = notes.reviews;
  const setAside = notes.concepts;
  if (
    Object.keys(log).length === 0 &&
    dates.length === 0 &&
    Object.keys(setAside).length === 0 &&
    notes.requests.length === 0
  ) {
    return snapshot;
  }

  const content = snapshot.content.map((item) => {
    const decision = log[item.id];
    if (decision === undefined) return item;
    return decision.outcome === "APPROVED"
      ? { ...item, reviewStatus: "APPROVED" as const, freshness: "CURRENT" as const }
      // The recorded vocabulary's own word for this. «درخواست تغییر» in the
      // panel is REVISION_REQUESTED in the domain, and using the command's
      // word instead would be a sixth review status invented at the edge.
      : { ...item, reviewStatus: "REVISION_REQUESTED" as const };
  });

  const concepts = snapshot.concepts.map((concept) => {
    const decision = setAside[concept.id];
    // The machine's own approval outranks a stale set-aside: if the person
    // went on to select this concept, the note was withdrawn at that moment
    // (see `writeConceptDecision(null)`), and if it somehow was not, the
    // machine's word is the one the research was built from.
    if (decision === undefined || concept.reviewStatus === "APPROVED") return concept;
    return {
      ...concept,
      reviewStatus: "REJECTED" as const,
      rejectionReasonFa: decision.reasonFa,
    };
  });

  const decisions: PanelSnapshot["decisions"] = [...snapshot.decisions];
  for (const [contentId, decision] of Object.entries(log)) {
    const item = snapshot.content.find((row) => row.id === contentId);
    // A decision about content the machine no longer has (the research was
    // rebuilt) is not shown as a row about nothing.
    if (item === undefined || decision.decidedAt === "") continue;
    decisions.push({
      id: `mdec-c-${contentId}`,
      target: { type: "CONTENT", id: contentId, versionId: item.activeVersionId },
      actorId: options.actorId,
      activeRole: "DROP_GUARDIAN",
      outcome: decision.outcome === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
      reasonFa: decision.reasonFa,
      createdAt: decision.decidedAt,
    });
  }
  for (const [conceptId, decision] of Object.entries(setAside)) {
    const concept = snapshot.concepts.find((row) => row.id === conceptId);
    if (concept === undefined || decision.decidedAt === "") continue;
    decisions.push({
      id: `mdec-k-${conceptId}`,
      target: { type: "CONCEPT", id: conceptId, versionId: concept.activeVersionId },
      actorId: options.actorId,
      activeRole: "DROP_GUARDIAN",
      outcome: "REJECTED",
      reasonFa: decision.reasonFa,
      createdAt: decision.decidedAt,
    });
  }

  const comments: PanelSnapshot["comments"] = [...snapshot.comments];
  notes.requests.forEach((request, index) => {
    const concept = snapshot.concepts.find((row) => row.id === request.conceptId);
    if (concept === undefined || request.at === "") return;
    comments.push({
      id: `mreq-${String(index)}`,
      target: { type: "CONCEPT", id: request.conceptId, versionId: concept.activeVersionId },
      actorId: options.actorId,
      bodyFa: request.feedbackFa,
      createdAt: request.at,
    });
  });

  return {
    ...snapshot,
    // The machine keeps no calendar, so there is nothing to merge WITH: what
    // the person chose is the whole of it.
    calendar: dates,
    content,
    concepts,
    decisions,
    comments,
  };
}
