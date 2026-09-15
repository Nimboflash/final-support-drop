import type { PanelSnapshot } from "@drop/panel-domain";

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
 * NOT the demo key, and that separation is load-bearing. `demo-persistence.ts`
 * stamps whatever it is handed with the MOCK discriminator and validates only
 * that field on the way back in, so one machine write into that key would make
 * the demo world silently resume from machine data forever. This store holds
 * DECISIONS — ids and outcomes — never a snapshot, under its own key.
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

const EMPTY: MachineReviewLog = {};

/**
 * Reads the log, treating anything unrecognised as empty.
 *
 * Stored state is untrusted input like any other: a hand-edited key, a payload
 * from an older shape, or a quota-truncated string must read as "no decisions
 * yet" rather than throw on a surface a person is trying to use.
 */
export function readReviewLog(port: MachineReviewPort, sessionId: string): MachineReviewLog {
  const raw = port.read(sessionId);
  if (raw === null) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY;
    const out: Record<string, MachineReviewDecision> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
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
  } catch {
    return EMPTY;
  }
}

export function writeReviewDecision(
  port: MachineReviewPort,
  sessionId: string,
  contentId: string,
  decision: MachineReviewDecision,
): void {
  const next = { ...readReviewLog(port, sessionId), [contentId]: decision };
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
export function applyReviewLog(snapshot: PanelSnapshot, log: MachineReviewLog): PanelSnapshot {
  if (Object.keys(log).length === 0) return snapshot;
  return {
    ...snapshot,
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
