import { EmptyState } from "@drop/ui";

/**
 * Not-yet-built surfaces resolve to the standard EmptyState, never a 404
 * (P1 failure_states).
 *
 * The wrapper's `data-testid` is load-bearing (AC-P1R.2). This catch-all sits
 * at the same depth as the static destination folders, so deleting one of them
 * would land here and render at HTTP 200 — a dead end that looks like a working
 * page. Real destinations also use `EmptyState`, so the empty state alone
 * cannot tell the two apart; this marker can.
 */
export default function Page() {
  return (
    <div data-testid="studio-catch-all">
      <EmptyState />
    </div>
  );
}
