import type { CommandEnvelope, CommandReceipt, RevisionRoute, Target } from "@drop/panel-domain";

/**
 * `RevisionGateway` — targeted regeneration (ADR-0019 D3, D4).
 *
 * Separate from `MachineGateway` because targeted generation is missing from
 * the frozen (18 §6) interface and V2 03 §2 is explicit about why it must not be
 * bolted onto the nearest existing method: **"do not abuse retryStage to mean
 * changing content."**
 *
 * The distinction is load-bearing, not pedantic:
 *
 *  - `MachineGateway.retryStage` repeats a FAILED attempt with the SAME input.
 *    History shows another attempt at the same version.
 *  - `requestRevision` applies NEW feedback and produces a NEW version. Prior
 *    versions stay byte-identical and the card returns to review; a revision
 *    never inherits approval.
 *
 * Aliasing the two would make "regenerate this film recommendation" look like a
 * retry in the audit trail, and would let a revision silently overwrite the
 * version a reviewer approved.
 *
 * PROVISIONAL (18 §9) — held here "until the machine team agrees its endpoint".
 */
export interface RevisionGateway {
  /**
   * V2 01 §4-§5. `feedbackFa` is required: every route in the set is driven by
   * reviewer feedback, and a revision with no feedback is a retry wearing the
   * wrong name.
   *
   * Reject-and-revise records the decision FIRST and durably (ADR-0019 D4): a
   * failure here must neither erase the rejection nor duplicate it on retry.
   */
  requestRevision(
    command: CommandEnvelope & {
      target: Target;
      feedbackFa: string;
      route: RevisionRoute;
    },
  ): Promise<CommandReceipt>;
}
