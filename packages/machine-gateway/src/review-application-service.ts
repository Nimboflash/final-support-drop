import type { ApprovalDecision, CommandEnvelope, CommandReceipt, Target } from "@drop/panel-domain";

/**
 * `ReviewApplicationService` — the review facade (ADR-0019 D4; ADR-0013 D1).
 *
 * A FACADE ABOVE the gateways, and a member of none of them. That placement is
 * the whole design:
 *
 *  - It is the **sole constructor** of `ApprovalCommand`. Nothing else in the
 *    panel builds one, so there is exactly one place a decision can be shaped.
 *  - It resolves the item's approval request and its exact version, then
 *    **delegates to `MachineGateway.submitApproval`** (V2 03 §2). It never
 *    persists a decision itself.
 *  - Putting it on `PanelCommandGateway` would make it a second write path,
 *    which is precisely what ADR-0013 D1 removed.
 *
 * The conformance suite proves the delegation mechanically rather than trusting
 * the comment: replacing `submitApproval` with a rejecting stub must leave the
 * decision list unchanged (ADR-0019 D19). If any implementation ever recorded
 * the decision locally as well, that test goes red.
 */
export interface ReviewApplicationService {
  /**
   * `reasonFa` is `string | null` at the call boundary because V2's `Decision`
   * types it that way and the seed ships approvals with a null reason. The
   * implementation must REJECT a null reason before transport rather than
   * coercing it to `""` (ADR-0019 D5): `approvalCommandSchema.reason` is
   * mandatory per ADR-0013 D2, and a silently empty reason is worse than a
   * refusal because it looks like a real justification in the audit trail.
   */
  reviewItem(
    command: CommandEnvelope & {
      target: Target;
      outcome: Extract<ApprovalDecision, "APPROVED" | "REJECTED" | "CHANGES_REQUESTED">;
      reasonFa: string | null;
    },
  ): Promise<CommandReceipt>;
}
