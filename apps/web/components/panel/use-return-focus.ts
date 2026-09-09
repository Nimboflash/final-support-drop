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
  const opener = useRef<HTMLElement | null>(null);

  const remember = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const onOpenChange = useCallback((next: boolean, set: (value: boolean) => void) => {
    set(next);
    if (next) return;
    const target = opener.current;
    opener.current = null;
    if (target === null || !target.isConnected) return;
    /*
      Radix moves focus itself as the overlay closes, and how long that takes
      depends on the exit animation — which is not a fixed number of frames.
      So this keeps asking until the focus sticks, for a bounded window, rather
      than guessing at a frame count that happens to work on an idle machine.
    */
    const deadline = 600;
    const start = performance.now();
    const restore = () => {
      if (document.activeElement === target) return;
      target.focus();
      if (document.activeElement === target) return;
      if (performance.now() - start > deadline) return;
      requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    const target = opener.current;
    if (target === null || !target.isConnected) return;
    event.preventDefault();
    opener.current = null;
    target.focus();
  }, []);

  return { remember, onOpenChange, onCloseAutoFocus };
}
