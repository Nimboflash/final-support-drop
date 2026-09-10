"use client";

import { useCallback, useRef } from "react";

/**
 * Returns focus to whatever opened an overlay, when the overlay closes.
 *
 * Radix does this for you when the overlay is opened by its own
 * `SheetTrigger` / `DialogTrigger`. Every overlay on these surfaces is instead
 * a CONTROLLED `open` overlay driven by a card's own button, so there is no
 * trigger to return to and focus lands on `document.body` — a keyboard user is
 * dropped at the top of the document, having to tab all the way back to the
 * card they were reading.
 *
 * Controlled overlays are the right shape here (the open item is identified by
 * id, which is what makes it linkable), so this restores what that shape costs.
 */
export function useReturnFocus(): {
  /** Call in the click handler that opens the overlay. */
  remember: () => void;
  /** Wrap the overlay's `onOpenChange`. */
  onOpenChange: (next: boolean, set: (next: boolean) => void) => void;
  /**
   * Pass to the overlay content's `onCloseAutoFocus`.
   *
   * This is the deterministic half. Radix fires it at exactly the moment it
   * would move focus itself, so preventing the default and focusing here has
   * no race with the exit animation — where a frame-counting restore does, and
   * flakes the moment the machine is busy.
   */
  onCloseAutoFocus: (event: Event) => void;
} {
  /*
    The opener is remembered as a node AND as a way to find that node again.
    Opening the overlay re-renders the list behind it, and a card whose data
    changed can come back as a NEW element — at which point the remembered node
    is detached and focusing it does nothing, so focus stays on `<body>`. That
    is not hypothetical: it is what a slower machine reproduced reliably where a
    fast one did not.
  */
  const opener = useRef<{ node: HTMLElement; testId: string; index: number } | null>(null);

  const remember = useCallback(() => {
    const node = document.activeElement;
    if (!(node instanceof HTMLElement)) {
      opener.current = null;
      return;
    }
    const testId = node.dataset.testid ?? "";
    const peers =
      testId === "" ? [] : [...document.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`)];
    opener.current = { node, testId, index: peers.indexOf(node) };
  }, []);

  /** The remembered node, or its replacement after a re-render. */
  const resolve = useCallback((): HTMLElement | null => {
    const remembered = opener.current;
    if (remembered === null) return null;
    if (remembered.node.isConnected) return remembered.node;
    if (remembered.testId === "" || remembered.index < 0) return null;
    const peers = [
      ...document.querySelectorAll<HTMLElement>(`[data-testid="${remembered.testId}"]`),
    ];
    return peers[remembered.index] ?? peers[0] ?? null;
  }, []);

  const onOpenChange = useCallback(
    (next: boolean, set: (value: boolean) => void) => {
      set(next);
      if (next) return;
      /*
        This is the mechanism for THESE overlays, and the reason is worth
        recording because it is not what one would expect.

        `onCloseAutoFocus` below is Radix's own hook and would be synchronous
        and exact — but it never fires here. Every detail overlay on these
        surfaces is CONTROLLED by the id of the open item, so closing sets that
        id to null, the component returns null on the next render, and the
        whole subtree unmounts before Radix reaches its close-focus phase. A
        DOM trace confirms the order: focus lands on `<body>` first, and comes
        back afterwards.

        Focus return here is therefore asynchronous by a frame or two. That is
        invisible to a person and correct for a keyboard user, but it does mean
        a test that samples `document.activeElement` the instant the overlay
        hides is sampling too early — which is what it looked like when a busy
        machine reproduced a "dropped focus" that a fast one never showed.
      */
      const target = resolve();
      if (target === null) return;

      const deadline = 800;
      const start = performance.now();
      const restore = () => {
        if (opener.current === null) return; // the authority already handled it
        if (document.activeElement === target) {
          opener.current = null;
          return;
        }
        target.focus();
        if (document.activeElement === target) {
          opener.current = null;
          return;
        }
        if (performance.now() - start > deadline) {
          opener.current = null;
          return;
        }
        requestAnimationFrame(restore);
      };
      requestAnimationFrame(restore);
    },
    [resolve],
  );

  /**
   * Kept for correctness rather than for effect: an overlay that stays mounted
   * through its exit animation WOULD fire this, and then focus returns exactly
   * when Radix would have moved it. Today's overlays unmount first, so the
   * fallback above is what actually runs.
   */
  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      const target = resolve();
      if (target === null) return;
      event.preventDefault();
      opener.current = null;
      target.focus();
    },
    [resolve],
  );

  return { remember, onOpenChange, onCloseAutoFocus };
}
