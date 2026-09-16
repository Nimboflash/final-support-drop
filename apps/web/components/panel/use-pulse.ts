"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A key that changes only when a value changes AFTER mount.
 *
 * Used on state badges: `key={pulse}` with `className="drop-pulse"` re-mounts
 * the badge — and plays its entrance — exactly when the state moved, and never
 * on first render. Eighteen badges popping together on page load is noise;
 * the one that changed because of what the person just did is the signal.
 */
export function usePulseKey(value: string): number {
  const previous = useRef(value);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setPulse((prior) => prior + 1);
  }, [value]);
  return pulse;
}
