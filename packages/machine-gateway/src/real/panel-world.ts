import type { ApprovalCommand, CommandReceipt } from "@drop/panel-domain";
import type { PanelCommandGateway } from "../panel-command-gateway";
import type { RevisionGateway } from "../revision-gateway";
import type { ReviewApplicationService } from "../review-application-service";

/**
 * What the panel actually needs from a world (ADR-0021 D4, D5).
 *
 * `MockWorld` is what twenty-four scenarios, twenty acceptance journeys and ten
 * visual baselines run through, and ADR-0021 D5 says it "is not replaced, not
 * deprecated, and not allowed to break". So the real adapter is not bolted onto
 * it and `mock-world.ts` is not edited: a SUPERTYPE is declared here that
 * `MockWorld` already satisfies structurally, and the composition root selects
 * between the two.
 *
 * The membership is not a guess. It is every property reached through
 * `session.world` anywhere in `apps/web`:
 *
 *   - `policy.forbidden`   → `lib/demo/commands.ts:53-54`, picking the actor
 *   - `panelCommandGateway` → `lib/demo/queries.ts:26` and five command hooks
 *   - `review`              → `lib/demo/commands.ts:91`
 *   - `revisionGateway`     → `lib/demo/commands.ts:122`
 *
 * `MockWorld.repository` and `MockWorld.clock` are deliberately absent: nothing
 * above the composition root touches them, and a real world has neither a
 * `DemoRepository` nor an injected fixed clock to offer. Widening the supertype
 * to carry them would force the real adapter to fabricate both.
 */
export interface PanelWorldPolicy {
  /**
   * Whether the acting demo role may write. Read by the envelope builder.
   *
   * Optional and `boolean`, so `ScenarioResponsePolicy`'s `forbidden?: true`
   * is assignable without `mock-world.ts` being touched.
   */
  readonly forbidden?: boolean;
  /** Whether the world is presenting itself as disconnected. */
  readonly disconnected?: boolean;
}

export interface PanelWorld {
  readonly policy: PanelWorldPolicy;
  readonly panelCommandGateway: PanelCommandGateway;
  readonly revisionGateway: RevisionGateway;
  readonly review: ReviewApplicationService;
  /**
   * The single approval write path (ADR-0013 D1).
   *
   * An OBJECT, not a bound function, for the reason `mock-world.ts:54-60`
   * gives: the review facade dispatches through this property so the
   * conformance suite can sever it and prove no second decision path exists.
   * A supertype that flattened it to a function would make that proof
   * impossible for any world declared against it.
   */
  readonly machineGateway: {
    submitApproval(command: ApprovalCommand): Promise<CommandReceipt>;
  };
}
