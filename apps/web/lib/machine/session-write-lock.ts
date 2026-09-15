/**
 * The server-side write guard for the machine proxy (ticket P10, slice 2).
 *
 * Three separate jobs live here, and they are separate on purpose because each
 * one fails differently:
 *
 *   1. MUTUAL EXCLUSION, per session. `session_service._save` does
 *      `Path.write_text(...)` over the WHOLE session file — truncate, then
 *      rewrite — with no locking and no version field. Two writes that overlap
 *      do load → mutate → overwrite, and the later save silently destroys the
 *      earlier one's round. Both were paid for.
 *
 *   2. A SPEND CEILING. The mutex bounds concurrency to one; it has nothing to
 *      say about volume. Generate, wait, generate, wait is unbounded and every
 *      call is legitimate by the mutex's own rules. The ceiling is read off the
 *      session itself (`concept_rounds.length`), so it survives a restart —
 *      unlike anything held in this module.
 *
 *   3. A COOLDOWN and a GLOBAL cap. Both are process-local and both die with
 *      the process; they exist to make a stuck loop or a double-click cheap,
 *      not to be a budget. Said plainly here so nobody mistakes them for one.
 *
 * What this module is NOT: an authorization boundary. The panel has no
 * authentication. Anyone who can reach the panel can reach these writes, and
 * the checks in the route stop a BROWSER on another origin, not a script on
 * this machine.
 *
 * No timers. `tests/repo/determinism.test.ts` does not reach `apps/web/lib`,
 * but the reason behind it applies anyway: a lock whose release depends on a
 * `setTimeout` is a lock that leaks when the process is busy. Expiry is checked
 * on acquire, against a clock read at that moment.
 */

/** A lock entry. `startedAt` is what expiry is measured from. */
interface Held {
  readonly startedAt: number;
  /** A write that timed out upstream may still be running and still spending. */
  readonly poisoned: boolean;
}

/**
 * How long a lock entry may stand before another write may take it.
 *
 * Deliberately far above the service's worst case rather than above the proxy's
 * deadline. `backends/openrouter.py` passes `http_timeout` (default 180) to
 * `requests` as its `timeout=`, and that argument is a per-socket connect/read
 * timeout, NOT a wall-clock deadline: the worst case is roughly connect 180 +
 * read 180, plus DNS which it does not cover at all, plus the JSON parse and
 * the whole-file save. A 210s expiry would hand the lock to a second paid call
 * while the first was still in flight, which is the exact race the lock exists
 * to prevent.
 */
const LOCK_EXPIRY_MS = 400_000;

/** At most this many paid writes in flight across ALL sessions. */
const GLOBAL_IN_FLIGHT_LIMIT = 2;

/** The shortest gap between two paid writes on one session. */
const COOLDOWN_MS = 30_000;

/**
 * The most concept rounds a session may accumulate.
 *
 * A budget, not a parse bound — and the two used to be confused. A cap
 * expressed as a limit on the `expectedRounds` FIELD bricks a session the
 * moment it legitimately passes the cap: the truthful round count is then
 * unrepresentable, so every write fails as malformed, including the free
 * approve. This is checked against the live session instead, so hitting it
 * refuses the paid calls and leaves the free ones reachable.
 */
function maxRounds(): number {
  const raw = Number.parseInt(process.env.DROP_MACHINE_MAX_ROUNDS ?? "", 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 6;
}

const held = new Map<string, Held>();
const lastPaidCallAt = new Map<string, number>();

export type AcquireResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "IN_FLIGHT" | "TOO_MANY_IN_FLIGHT" | "COOLING_DOWN" };

/**
 * Takes the lock for one session, or says why it could not.
 *
 * REFUSES rather than queues, and that is the whole point. Queuing a generate
 * behind a generate preserves the double-spend the lock exists to stop: the
 * second call was fired on a belief about the session that the first one is in
 * the middle of invalidating. A refusal also means the map cannot grow without
 * bound — a refused acquire stores nothing.
 */
export function acquireWriteLock(
  sessionId: string,
  options: { readonly spends: boolean; readonly now: number },
): AcquireResult {
  const current = held.get(sessionId);
  if (current !== undefined && options.now - current.startedAt < LOCK_EXPIRY_MS) {
    return { ok: false, reason: "IN_FLIGHT" };
  }

  if (options.spends) {
    // Breadth, not just depth: the per-session lock does nothing about a caller
    // addressing many session ids at once, and every one of those pins a thread
    // in the service's threadpool for up to three minutes.
    let inFlight = 0;
    for (const entry of held.values()) {
      if (options.now - entry.startedAt < LOCK_EXPIRY_MS) inFlight += 1;
    }
    if (inFlight >= GLOBAL_IN_FLIGHT_LIMIT) {
      return { ok: false, reason: "TOO_MANY_IN_FLIGHT" };
    }

    const last = lastPaidCallAt.get(sessionId);
    if (last !== undefined && options.now - last < COOLDOWN_MS) {
      return { ok: false, reason: "COOLING_DOWN" };
    }
    lastPaidCallAt.set(sessionId, options.now);
  }

  held.set(sessionId, { startedAt: options.now, poisoned: false });
  return { ok: true };
}

/**
 * Gives the lock back — but only on a DEFINITIVE outcome.
 *
 * `outcome: "unknown"` is the case that matters and the one a plain
 * `finally { release() }` gets wrong. When a spending write hits the proxy's
 * deadline, nothing upstream was cancelled: FastAPI ran the endpoint in a
 * threadpool and a client disconnect does not kill the thread, so the model
 * call finishes and `_save()` writes minutes later. Releasing then leaves the
 * round count unchanged and the lock free, so the very next generate passes its
 * precondition and pays again. The entry is kept and left to expire instead.
 */
export function releaseWriteLock(sessionId: string, outcome: "settled" | "unknown"): void {
  if (outcome === "settled") {
    held.delete(sessionId);
    return;
  }
  const current = held.get(sessionId);
  if (current !== undefined) held.set(sessionId, { ...current, poisoned: true });
}

/** Whether a write is currently believed to be running against this session. */
export function isWriteInFlight(sessionId: string, now: number): boolean {
  const current = held.get(sessionId);
  return current !== undefined && now - current.startedAt < LOCK_EXPIRY_MS;
}

/**
 * The durable spend ceiling, checked against the session the proxy just read.
 *
 * Only the calls that reach a model are capped. `approve` is a filesystem
 * write and stays reachable at any round count, so a session that has spent its
 * budget can still be finished.
 */
export function withinRoundBudget(rounds: number): boolean {
  return rounds < maxRounds();
}

export function roundBudget(): number {
  return maxRounds();
}

/** Test seam. Never called by the route. */
export function resetWriteLocks(): void {
  held.clear();
  lastPaidCallAt.clear();
}
