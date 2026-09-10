"use client";

import { Button, ErrorState } from "@drop/ui";

/**
 * The error boundary for every /studio destination (brief §11).
 *
 * One boundary at the segment root rather than eight identical ones: a Next.js
 * `error.tsx` catches everything rendered beneath it, and eight copies would
 * only be eight places to forget.
 *
 * The brief is explicit that a raw API error or a stack trace must never reach
 * the screen. `error.message` is exactly that — it can carry a gateway phrase, a
 * schema path or an internal identifier — so it is NOT rendered. What the person
 * gets is what happened and what they can do about it; `digest` is the thread
 * back to the real cause for whoever has the logs.
 */
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="این صفحه بالا نیامد"
      detail="می‌توانید دوباره تلاش کنید. اگر باز هم تکرار شد، کار دیگری از این صفحه انجام ندهید."
      diagnosticId={error.digest}
      action={
        <Button onClick={reset} data-testid="error-retry">
          تلاش دوباره
        </Button>
      }
    />
  );
}
