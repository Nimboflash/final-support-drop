import { EmptyState } from "@drop/ui";

/** Not-yet-built surfaces resolve to the standard EmptyState, never a 404 (P1 failure_states). */
export default function Page() {
  return <EmptyState />;
}
