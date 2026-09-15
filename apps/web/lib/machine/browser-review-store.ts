import type { MachineReviewPort } from "@drop/machine-gateway";

/**
 * The client half of the panel's notes about a machine session.
 *
 * It reads and writes through `/api/machine/notes/<session>`, which keeps the
 * file beside the session in the machine's own run directory. That is the whole
 * point of this module existing in its current form: the notes used to live in
 * `localStorage`, which made a person's approvals per-browser and per-device —
 * approve your content on one machine and none of it is there on the next.
 *
 * The old key is still READ, once, and carried up. Someone who reviewed content
 * before this existed must not lose those decisions to an upgrade they did not
 * ask for.
 */

/** Sent on every write so a cross-origin page cannot forge one. See the route. */
const WRITE_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-drop-machine-write": "1",
} as const;

/** The key the notes lived under while they were per-browser. */
const LEGACY_PREFIX = "drop-machine-review-v1:";

function legacyRead(sessionId: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LEGACY_PREFIX + sessionId);
  } catch {
    // Private mode, disabled site data, or no storage at all. There is simply
    // nothing to migrate, which is the common case and not an error.
    return null;
  }
}

function legacyClear(sessionId: string): void {
  try {
    window.localStorage.removeItem(LEGACY_PREFIX + sessionId);
  } catch {
    // Leaving it behind is harmless: the server copy wins from here on, and a
    // second migration would find the same decisions already recorded.
  }
}

export function createBrowserReviewStore(): MachineReviewPort {
  return {
    async read(sessionId: string): Promise<string | null> {
      let stored: string | null = null;
      try {
        const response = await fetch(
          "/api/machine/notes/" + encodeURIComponent(sessionId),
          { headers: { accept: "application/json" }, cache: "no-store" },
        );
        if (response.ok) {
          const body: unknown = await response.json();
          const notes =
            typeof body === "object" && body !== null
              ? (body as Record<string, unknown>).notes
              : null;
          stored = typeof notes === "string" ? notes : null;
        }
      } catch {
        // Offline, or the panel is not pointed at a machine. Fall through to
        // whatever the browser still holds rather than losing the overlay.
        stored = null;
      }

      if (stored !== null) return stored;

      // Nothing on the server. If this browser holds decisions from before the
      // notes were durable, carry them up ONCE and then let the server own them.
      const legacy = legacyRead(sessionId);
      if (legacy === null) return null;
      try {
        await this.write(sessionId, legacy);
        legacyClear(sessionId);
      } catch {
        // The migration can wait for the next read. Returning the legacy value
        // means the person still sees their decisions in the meantime.
      }
      return legacy;
    },

    async write(sessionId: string, payload: string): Promise<void> {
      const response = await fetch("/api/machine/notes/" + encodeURIComponent(sessionId), {
        method: "PUT",
        headers: WRITE_HEADERS,
        body: JSON.stringify({ notes: payload }),
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) {
        // Loud, not silent. A decision the person made and the panel then
        // dropped is worse than an error they can see and retry — the whole
        // reason this moved off `localStorage` was decisions going missing.
        throw new Error("NOTES_WRITE_FAILED");
      }
    },
  };
}
