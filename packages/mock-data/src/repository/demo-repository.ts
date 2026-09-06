import {
  panelSnapshotSchema,
  toReviewStatus,
  type ApprovalDecision,
  type CommandReceipt,
  type PanelEvent,
  type PanelSnapshot,
  type Target,
} from "@drop/panel-domain";
import type { DemoClock } from "../ports";
import { deepClone } from "./deep-clone";

/**
 * The canonical demo repository (ticket P3).
 *
 * ONE instance per selected scenario, shared by all four mock adapters. Every
 * read and every write in the demo goes through it — V2 03 §1 requires "one
 * canonical demo repository", and the alternative (each adapter holding its own
 * slice) is how "the same action from the inbox, the card and the graph"
 * silently stops producing identical results (journey A14).
 *
 * Three invariants are enforced here rather than in the adapters, because an
 * adapter is exactly the wrong place to enforce something all four must share:
 *
 *  1. **Idempotency.** A `commandId` is checked and its effect appended in one
 *     await-free critical section. If the check and the append could interleave,
 *     a double-click would slip two decisions past a ledger that says one.
 *  2. **Optimistic concurrency.** A stale `expectedRowVersion` is rejected as
 *     REVISION_CONFLICT before anything mutates, and the caller's typed feedback
 *     comes back intact (V2 03 §4).
 *  3. **Append-only history.** Decisions, comments, versions, packages and
 *     calendar entries are appended; nothing is edited in place, so an approval
 *     recorded against an exact version stays true forever (V2 01 §8).
 */

export interface CommandLedgerEntry {
  readonly commandId: string;
  readonly receipt: CommandReceipt;
}

export class DemoRepository {
  #snapshot: PanelSnapshot;
  readonly #clock: DemoClock;
  readonly #ledger = new Map<string, CommandReceipt>();
  readonly #events: PanelEvent[] = [];
  readonly #listeners = new Set<(event: PanelEvent) => void>();
  readonly #seenEventIds = new Set<string>();
  readonly #latestAggregateRevision = new Map<string, number>();
  #correlationCounter = 0;

  constructor(snapshot: PanelSnapshot, clock: DemoClock) {
    // Parse on construction: a scenario overlay that produced an invalid world
    // must fail here, not at whichever surface first reads the broken row.
    this.#snapshot = panelSnapshotSchema.parse(snapshot);
    this.#clock = clock;
  }

  /** A structural clone, so callers cannot mutate the world by holding a read. */
  snapshot(): PanelSnapshot {
    return deepClone(this.#snapshot);
  }

  get revision(): number {
    return this.#snapshot.revision;
  }

  /* ------------------------------------------------------------ commands -- */

  /**
   * The one place a command becomes an effect.
   *
   * `apply` runs synchronously and is not `async` on purpose: the ledger read,
   * the conflict check and the state write must not be separated by an await,
   * or two rapid submissions can both pass the ledger check before either
   * writes (V2 01 §8 — "Double clicks and retried commands do not duplicate
   * runs, approvals, packages or calendar entries").
   */
  apply<T>(
    command: {
      commandId: string;
      expectedRowVersion?: number;
      aggregateId: string;
    },
    effect: (draft: PanelSnapshot, correlationId: string) => { result: T; events: readonly Omit<PanelEvent, "eventId" | "schemaVersion" | "workspaceId" | "correlationId" | "occurredAt">[] },
  ): { receipt: CommandReceipt; replayed: boolean; result: T | null } {
    const existing = this.#ledger.get(command.commandId);
    if (existing !== undefined) {
      // V2 03 §4 — "Repeating commandId returns the original receipt and does
      // not repeat effects."
      return { receipt: existing, replayed: true, result: null };
    }

    if (command.expectedRowVersion !== undefined) {
      const actual = this.#rowVersionOf(command.aggregateId);
      if (actual !== null && actual !== command.expectedRowVersion) {
        throw new StaleRevisionError(command.aggregateId, command.expectedRowVersion, actual);
      }
    }

    this.#correlationCounter += 1;
    const correlationId = `corr-${String(this.#correlationCounter).padStart(4, "0")}`;
    const draft = deepClone(this.#snapshot);
    const { result, events } = effect(draft, correlationId);

    draft.revision += 1;
    this.#snapshot = panelSnapshotSchema.parse(draft);

    const receipt: CommandReceipt = {
      commandId: command.commandId,
      accepted: true,
      status: "SUCCEEDED",
      correlationId,
      occurredAt: this.#clock.now(),
      origin: "MOCK",
      idempotencyKey: `idem-${command.commandId}`,
    };
    this.#ledger.set(command.commandId, receipt);

    for (const [index, partial] of events.entries()) {
      this.#emit({
        ...partial,
        eventId: `${correlationId}-${String(index)}`,
        schemaVersion: "1.0.0",
        workspaceId: "drop-demo",
        correlationId,
        occurredAt: this.#clock.now(),
      });
    }

    return { receipt, replayed: false, result };
  }

  #rowVersionOf(aggregateId: string): number | null {
    const s = this.#snapshot;
    const found =
      s.projects.find((p) => p.id === aggregateId) ??
      s.concepts.find((c) => c.id === aggregateId) ??
      s.content.find((c) => c.id === aggregateId) ??
      s.calendar.find((c) => c.id === aggregateId);
    return found === undefined ? null : found.rowVersion;
  }

  /* -------------------------------------------------------------- events -- */

  #emit(event: PanelEvent): void {
    // V2 03 §4 — "Deduplicate by eventId; ignore older aggregate revisions."
    if (this.#seenEventIds.has(event.eventId)) return;
    const latest = this.#latestAggregateRevision.get(event.aggregateId);
    if (latest !== undefined && event.aggregateRevision < latest) return;

    this.#seenEventIds.add(event.eventId);
    this.#latestAggregateRevision.set(event.aggregateId, event.aggregateRevision);
    this.#events.push(event);
    for (const listener of this.#listeners) listener(event);
  }

  subscribe(listener: (event: PanelEvent) => void): () => void {
    this.#listeners.add(listener);
    // The returned function must ACTUALLY stop delivery — the conformance suite
    // asserts it, because a no-op unsubscribe leaks a listener per mounted view.
    return () => {
      this.#listeners.delete(listener);
    };
  }

  events(): readonly PanelEvent[] {
    return [...this.#events];
  }

  /* --------------------------------------------------------------- reads -- */

  decisionsFor(target: Target): readonly PanelSnapshot["decisions"][number][] {
    return this.#snapshot.decisions.filter(
      (d) => d.target.id === target.id && d.target.type === target.type,
    );
  }

  versionIdsFor(target: Target): readonly string[] {
    return target.type === "CONCEPT"
      ? this.#snapshot.conceptVersions.filter((v) => v.conceptId === target.id).map((v) => v.id)
      : this.#snapshot.contentVersions.filter((v) => v.contentId === target.id).map((v) => v.id);
  }

  /** The card status an ADR-0013 decision produces (ADR-0019 D5). */
  static reviewStatusFor(decision: ApprovalDecision): PanelSnapshot["concepts"][number]["reviewStatus"] {
    return toReviewStatus(decision);
  }
}

/** Raised on a stale write so the adapter can map it to REVISION_CONFLICT. */
export class StaleRevisionError extends Error {
  readonly aggregateId: string;
  readonly expected: number;
  readonly actual: number;
  constructor(aggregateId: string, expected: number, actual: number) {
    super(`STALE_REVISION: ${aggregateId} expected ${String(expected)}, actual ${String(actual)}`);
    this.name = "StaleRevisionError";
    this.aggregateId = aggregateId;
    this.expected = expected;
    this.actual = actual;
  }
}
