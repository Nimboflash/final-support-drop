import type { MachineReviewPort } from "@drop/machine-gateway";

/**
 * Where a person's review of machine content is kept in the browser.
 *
 * A SEPARATE key from the demo world's, and namespaced per session. The demo
 * key holds a whole snapshot stamped with the MOCK discriminator, and
 * `demo-persistence.ts` validates only that field on the way back in — so one
 * machine write into it would make the demo world resume from machine data
 * forever after. This holds decisions, under its own key, one entry per
 * machine session, and the two can never be confused for each other.
 *
 * Per session because a decision is about a particular run's content. Carrying
 * one session's approvals into another would silently mark items approved that
 * nobody has looked at.
 */
const PREFIX = "drop-machine-review-v1:";

/**
 * `localStorage` throws in some contexts (private modes, disabled site data),
 * and a panel must not white-screen because storage is unavailable. Every
 * access is guarded, and a failure reads as "no decisions recorded" — which
 * degrades to exactly the behaviour before this existed.
 */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createBrowserReviewStore(): MachineReviewPort {
  return {
    read(sessionId: string) {
      try {
        return safeStorage()?.getItem(PREFIX + sessionId) ?? null;
      } catch {
        return null;
      }
    },
    write(sessionId: string, payload: string) {
      try {
        safeStorage()?.setItem(PREFIX + sessionId, payload);
      } catch {
        // A full or unavailable store must not break the review. The decision
        // is lost on reload, which is visible and recoverable; a thrown error
        // in a click handler is neither.
      }
    },
  };
}
