import { DEMO_STORAGE_KEY, type DemoStoragePort } from "@drop/mock-data";

/**
 * The browser implementations of the injected demo ports (ticket P3 in_scope,
 * consumed by P4).
 *
 * This is the ONLY module in the repository that names `drop-panel-demo-v2` as a
 * storage key. `packages/mock-data` cannot: it is pinned to `lib: ["ES2023"]`
 * and has no `localStorage` to name (ADR-0019 D17), which is exactly what keeps
 * the determinism guarantee checkable there and the browser concern here.
 */

/**
 * `localStorage` throws in some contexts (private modes, disabled site data),
 * and a demo panel must not white-screen because storage is unavailable — the
 * whole point of ADR-0019 D2's Reset path is that the app survives bad state.
 * Every access is therefore guarded, and a failure reads as "nothing stored".
 */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createBrowserStoragePort(): DemoStoragePort {
  return {
    read() {
      try {
        return safeStorage()?.getItem(DEMO_STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    write(payload) {
      try {
        safeStorage()?.setItem(DEMO_STORAGE_KEY, payload);
      } catch {
        // A full or unavailable store must not break the session; the demo
        // continues in memory and the next reload simply reseeds.
      }
    },
    clear() {
      try {
        safeStorage()?.removeItem(DEMO_STORAGE_KEY);
      } catch {
        /* see write() */
      }
    },
    onExternalChange(listener) {
      if (typeof window === "undefined") return () => undefined;
      // V2 03 §6 — two tabs synchronize via storage events rather than silently
      // last-write-winning. The event fires only in OTHER tabs, which is what
      // makes it the right signal.
      const handler = (event: StorageEvent) => {
        if (event.key !== DEMO_STORAGE_KEY) return;
        listener(event.newValue);
      };
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("storage", handler);
      };
    },
  };
}
