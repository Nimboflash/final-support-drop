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
 * The same reasoning covers the CALENDAR. A date is not something the machine
 * knows: its five calls have no notion of when anything is published, and the
 * projection therefore emits no entry. But choosing a date is the last step of
 * the work, so with nowhere to keep one the journey ends a step short. It is
 * kept here, beside the decisions, for the same reason and under the same key.
 *
 * NOT the demo key, and that separation is load-bearing. `demo-persistence.ts`
 * stamps whatever it is handed with the MOCK discriminator and validates only
 * that field on the way back in, so one machine write into that key would make
 * the demo world silently resume from machine data forever. This store holds
 * DECISIONS and DATES — never a snapshot — under its own key.
 */

/** The transport seam, exactly as `DemoStoragePort` is for the demo world. */
export interface MachineReviewPort {
  read(sessionId: string): string | null;
  write(sessionId: string, payload: string): void;
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

/** Everything the PANEL knows about a session that the machine does not. */
export interface MachineSessionNotes {
  readonly reviews: MachineReviewLog;
  /** Keyed by entry id, so scheduling the same output twice replaces rather than duplicates. */
  readonly calendar: Readonly<Record<string, PanelCalendarEntry>>;
}

const EMPTY: MachineReviewLog = {};
const EMPTY_NOTES: MachineSessionNotes = { reviews: {}, calendar: {} };

/**
 * Reads the log, treating anything unrecognised as empty.
 *
 * Stored state is untrusted input like any other: a hand-edited key, a payload
 * from an older shape, or a quota-truncated string must read as "no decisions
 * yet" rather than throw on a surface a person is trying to use.
 */
export function readNotes(port: MachineReviewPort, sessionId: string): MachineSessionNotes {
  const raw = port.read(sessionId);
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
    const calendarRaw = held.calendar;
    return {
      reviews: readReviewsFrom(reviewsRaw),
      calendar: readCalendarFrom(calendarRaw),
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
  {
    const out: Record<string, MachineReviewDecision> = {};
    for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
      const value = item;
      if (typeof value !== "object" || value === null) continue;
      const decision = value as Record<string, unknown>;
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
}

export function writeReviewDecision(
  port: MachineReviewPort,
  sessionId: string,
  contentId: string,
  decision: MachineReviewDecision,
): void {
  const notes = readNotes(port, sessionId);
  const next: MachineSessionNotes = {
    ...notes,
    reviews: { ...notes.reviews, [contentId]: decision },
  };
  port.write(sessionId, JSON.stringify(next));
}

export function writeCalendarEntry(
  port: MachineReviewPort,
  sessionId: string,
  entry: PanelCalendarEntry,
): void {
  const notes = readNotes(port, sessionId);
  const next: MachineSessionNotes = {
    ...notes,
    calendar: { ...notes.calendar, [entry.id]: entry },
  };
  port.write(sessionId, JSON.stringify(next));
}

/**
 * Lays recorded decisions over a freshly projected snapshot.
 *
 * The projection is a pure function of what the machine said, and it stays
 * that way — this runs after it, in the world, which is the layer that knows a
 * person has been here. `contentStateOf` reads `reviewStatus` and `freshness`
 * together, so an approval has to set both or the item reads as approved-but-
 * stale and the output never assembles.
 */
export function applyNotes(snapshot: PanelSnapshot, notes: MachineSessionNotes): PanelSnapshot {
  const dates = Object.values(notes.calendar);
  const log = notes.reviews;
  if (Object.keys(log).length === 0 && dates.length === 0) return snapshot;
  return {
    ...snapshot,
    // The machine keeps no calendar, so there is nothing to merge WITH: what
    // the person chose is the whole of it.
    calendar: dates,
    content: snapshot.content.map((item) => {
      const decision = log[item.id];
      if (decision === undefined) return item;
      return decision.outcome === "APPROVED"
        ? { ...item, reviewStatus: "APPROVED" as const, freshness: "CURRENT" as const }
        // The recorded vocabulary's own word for this. «درخواست تغییر» in the
        // panel is REVISION_REQUESTED in the domain, and using the command's
        // word instead would be a sixth review status invented at the edge.
        : { ...item, reviewStatus: "REVISION_REQUESTED" as const };
    }),
  };
}
