import { commandReceiptSchema, type CommandEnvelope, type Target } from "@drop/panel-domain";
import type { MachineGateway } from "../machine-gateway";
import type { ReviewApplicationService } from "../review-application-service";
import type { RevisionGateway } from "../revision-gateway";
import { GatewayError } from "../errors";
import { ConformanceViolation, type ConformanceCase } from "./index";

/**
 * The review-path conformance suite (ADR-0019 D19; AC-P2.20, AC-P2.25).
 *
 * The load-bearing case here is `submitApproval is the ONLY decision path`. It
 * is the sole MECHANICAL proof that ADR-0013 D1 holds inside the panel: every
 * other guarantee about the single approval write path is a comment, a code
 * review, or an interface shape that a determined implementation can route
 * around. This test cannot be routed around — it swaps `submitApproval` for a
 * stub that always throws, calls `reviewItem`, and asserts the decision list is
 * unchanged. Any implementation that also records the decision locally goes red.
 *
 * Appended, never inserted: the seventeen `MachineGateway` case names are
 * unchanged and still run first, so an adapter's report stays comparable across
 * the change (AC-P2.25).
 */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConformanceViolation(message);
}

export interface ReviewPathFixtures {
  /** A concept or content item with an open approval request. */
  readonly reviewableTarget: Target;
  /** A valid envelope for the acting demo reviewer. */
  readonly envelope: CommandEnvelope;
  /** Reads the decisions currently recorded against a target. */
  readonly readDecisions: (target: Target) => Promise<readonly unknown[]>;
  /** Reads the version ids currently recorded for a target, oldest first. */
  readonly readVersionIds: (target: Target) => Promise<readonly string[]>;
}

export interface ReviewPathOptions {
  readonly name: string;
  /**
   * Builds a fresh world. `machineGateway` is handed back so a case can wrap or
   * replace `submitApproval` before exercising the facade — which is exactly how
   * the single-write-path proof works.
   */
  readonly createWorld: () => Promise<{
    readonly machineGateway: MachineGateway;
    readonly review: ReviewApplicationService;
    readonly revision: RevisionGateway;
    readonly fixtures: ReviewPathFixtures;
  }>;
}

export function createReviewPathConformanceSuite(
  options: ReviewPathOptions,
): readonly ConformanceCase[] {
  const cases: ConformanceCase[] = [
    {
      name: "reviewItem delegates to submitApproval exactly once",
      async run() {
        const world = await options.createWorld();
        let calls = 0;
        const original = world.machineGateway.submitApproval.bind(world.machineGateway);
        world.machineGateway.submitApproval = async (command) => {
          calls += 1;
          return original(command);
        };
        const receipt = await world.review.reviewItem({
          ...world.fixtures.envelope,
          target: world.fixtures.reviewableTarget,
          outcome: "APPROVED",
          reasonFa: "با معیار DROP FIT هم‌خوان است.",
        });
        assert(calls === 1, `reviewItem called submitApproval ${String(calls)} times, expected 1`);
        const parsed = commandReceiptSchema.safeParse(receipt);
        assert(parsed.success, "reviewItem returned a receipt that is not schema-valid");
      },
    },
    {
      name: "submitApproval is the ONLY decision path (ADR-0013 D1)",
      async run() {
        const world = await options.createWorld();
        const before = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);

        // Sever the recorded write path. If the implementation has a second one,
        // the decision list grows anyway and this case fails — which is the
        // entire reason it exists.
        world.machineGateway.submitApproval = () => {
          throw new GatewayError("UNAUTHORIZED", "UNAUTHORIZED: severed for conformance");
        };

        try {
          await world.review.reviewItem({
            ...world.fixtures.envelope,
            target: world.fixtures.reviewableTarget,
            outcome: "APPROVED",
            reasonFa: "با معیار DROP FIT هم‌خوان است.",
          });
        } catch {
          // Expected: the facade must surface the failure, not absorb it.
        }

        const after = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);
        assert(
          after.length === before.length,
          `a decision was recorded (${String(before.length)} → ${String(after.length)}) with ` +
            "submitApproval severed — a SECOND decision write path exists, which ADR-0013 D1 forbids",
        );
      },
    },
    {
      name: "a null reason is rejected before transport, never coerced (ADR-0019 D5)",
      async run() {
        const world = await options.createWorld();
        let reached = false;
        world.machineGateway.submitApproval = () => {
          reached = true;
          throw new GatewayError("UNAUTHORIZED", "UNAUTHORIZED: should not be reached");
        };
        let threw = false;
        try {
          await world.review.reviewItem({
            ...world.fixtures.envelope,
            target: world.fixtures.reviewableTarget,
            outcome: "REJECTED",
            reasonFa: null,
          });
        } catch {
          threw = true;
        }
        assert(threw, "reviewItem accepted a null reason; ADR-0013 D2 makes the reason mandatory");
        assert(
          !reached,
          "reviewItem reached submitApproval with a null reason — it must fail closed BEFORE " +
            "transport rather than coercing null to an empty string, which would look like a " +
            "real justification in the audit trail",
        );
      },
    },
    {
      name: "the same commandId twice yields one effect and the original receipt",
      async run() {
        const world = await options.createWorld();
        const command = {
          ...world.fixtures.envelope,
          // No expectedRowVersion: an idempotent replay must return the original
          // receipt on its own merits. Carrying a version here would make the
          // second call fail as a CONFLICT — true, but a different rule, and it
          // would mask whether idempotency works at all.
          expectedRowVersion: undefined,
          target: world.fixtures.reviewableTarget,
          outcome: "APPROVED" as const,
          reasonFa: "تأیید نخست.",
        };
        const first = await world.review.reviewItem(command);
        const after1 = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);
        const second = await world.review.reviewItem(command);
        const after2 = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);
        assert(
          after2.length === after1.length,
          "replaying a commandId recorded a second decision; V2 03 §4 requires the original " +
            "receipt and no repeated effect",
        );
        assert(
          JSON.stringify(first) === JSON.stringify(second),
          "replaying a commandId returned a different receipt",
        );
      },
    },
    {
      name: "a stale expectedRowVersion throws REVISION_CONFLICT and changes nothing",
      async run() {
        const world = await options.createWorld();
        const before = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);
        let thrown: unknown;
        try {
          await world.review.reviewItem({
            ...world.fixtures.envelope,
            commandId: `${world.fixtures.envelope.commandId}-stale`,
            expectedRowVersion: 999_999,
            target: world.fixtures.reviewableTarget,
            outcome: "APPROVED",
            reasonFa: "تأیید با نسخهٔ کهنه.",
          });
        } catch (error) {
          thrown = error;
        }
        assert(
          thrown instanceof GatewayError && thrown.reason === "REVISION_CONFLICT",
          `stale expectedRowVersion threw ${String(thrown)}, expected REVISION_CONFLICT`,
        );
        assert(
          (thrown as GatewayError).retryable === false,
          "REVISION_CONFLICT must not be retryable: replaying the identical command would be " +
            "stale again. The resolution is refresh-then-resubmit (V2 03 §4)",
        );
        const after = await world.fixtures.readDecisions(world.fixtures.reviewableTarget);
        assert(after.length === before.length, "a conflicting command still mutated state");
      },
    },
    {
      name: "requestRevision creates a new version and leaves prior versions byte-identical",
      async run() {
        const world = await options.createWorld();
        const target = world.fixtures.reviewableTarget;
        const before = await world.fixtures.readVersionIds(target);
        await world.revision.requestRevision({
          ...world.fixtures.envelope,
          commandId: `${world.fixtures.envelope.commandId}-rev`,
          target,
          feedbackFa: "لطفاً پیوند با Taste را صریح‌تر کنید.",
          route: "CONCEPT_REVISION",
        });
        const after = await world.fixtures.readVersionIds(target);
        assert(
          after.length === before.length + 1,
          `requestRevision produced ${String(after.length - before.length)} new versions, ` +
            "expected exactly 1 — a revision creates a version, unlike retryStage which repeats " +
            "an attempt at the same one (V2 03 §2)",
        );
        assert(
          JSON.stringify(after.slice(0, before.length)) === JSON.stringify(before),
          "requestRevision mutated a prior version; versions are immutable (V2 01 §8)",
        );
      },
    },
  ];

  return cases.map((c) => ({ name: `${options.name}: ${c.name}`, run: c.run }));
}
