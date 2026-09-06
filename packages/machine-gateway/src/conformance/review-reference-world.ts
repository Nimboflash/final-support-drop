import type {
  ApprovalCommand,
  CommandEnvelope,
  CommandReceipt,
  RevisionRoute,
  Target,
} from "@drop/panel-domain";
import type { MachineGateway } from "../machine-gateway";
import type { ReviewApplicationService } from "../review-application-service";
import type { RevisionGateway } from "../revision-gateway";
import { GatewayError, gatewayErrors } from "../errors";
import type { ReviewPathFixtures } from "./review-path";

/**
 * A deliberately minimal world for the review-path suite (AC-P2.20, AC-P2.25).
 *
 * NOT the P3 mock and not exported from the package root: its only job is to
 * prove the suite is runnable and can fail. P3's real adapters must pass the
 * same suite unmodified.
 *
 * The important structural choice: `reviewItem` here holds NO decision store of
 * its own. It validates, builds the one `ApprovalCommand`, and hands it to
 * `submitApproval`. The decisions array is written by `submitApproval` alone —
 * which is what makes the severed-path case meaningful rather than circular.
 */

export type ReviewWorldBreakage =
  /** Records the decision locally as well — the second write path ADR-0013 D1 forbids. */
  | "SECOND_DECISION_WRITE_PATH"
  /** Coerces a null reason to "" instead of failing closed (ADR-0019 D5). */
  | "COERCES_NULL_REASON"
  /** Ignores commandId, so a replay produces a second effect (V2 03 §4). */
  | "IGNORES_IDEMPOTENCY"
  /** Mutates a prior version instead of appending a new one (V2 01 §8). */
  | "REVISION_MUTATES_HISTORY";

export interface ReviewWorldOptions {
  readonly now: () => string;
  readonly breakage?: ReviewWorldBreakage;
}

const TARGET: Target = { type: "CONCEPT", id: "c1", versionId: "c1-v1" };

const ENVELOPE: CommandEnvelope = {
  commandId: "cmd_review_01",
  workspaceId: "drop-demo",
  actorId: "actor_guardian",
  actedAsRole: "DROP_GUARDIAN",
  idempotencyKey: "idem_review_0001",
  expectedRowVersion: 1,
};

export function createReviewReferenceWorld(options: ReviewWorldOptions): {
  machineGateway: MachineGateway;
  review: ReviewApplicationService;
  revision: RevisionGateway;
  fixtures: ReviewPathFixtures;
} {
  const decisions: { target: Target; decision: string; commandId: string }[] = [];
  const versions = new Map<string, string[]>([["c1", ["c1-v1"]]]);
  const receipts = new Map<string, CommandReceipt>();
  let rowVersion = 1;
  let counter = 0;

  function receipt(commandId: string, accepted: boolean, rejectionCode?: string): CommandReceipt {
    counter += 1;
    return {
      commandId,
      accepted,
      status: accepted ? "SUCCEEDED" : "REJECTED",
      correlationId: `corr_review_${counter}`,
      occurredAt: options.now(),
      origin: "MOCK",
      idempotencyKey: `idem_review_${String(counter).padStart(4, "0")}`,
      ...(accepted ? {} : { rejectionCode: rejectionCode ?? "REJECTED" }),
    };
  }

  // Only the parts of MachineGateway the review suite exercises are real; the
  // rest throw, because a stub that quietly returns [] would let a broken
  // adapter look conformant.
  const notExercised = (name: string) => (): never => {
    throw gatewayErrors.unknownId("method", name);
  };

  const machineGateway = {
    listMachines: notExercised("listMachines"),
    listWorkflowDefinitions: notExercised("listWorkflowDefinitions"),
    getWorkflowDefinition: notExercised("getWorkflowDefinition"),
    listRuns: notExercised("listRuns"),
    getRun: notExercised("getRun"),
    startRun: notExercised("startRun"),
    pauseRun: notExercised("pauseRun"),
    retryStage: notExercised("retryStage"),
    listArtifacts: notExercised("listArtifacts"),
    listAuditEvents: notExercised("listAuditEvents"),

    /** The single decision write path. Nothing else appends to `decisions`. */
    async submitApproval(command: ApprovalCommand): Promise<CommandReceipt> {
      decisions.push({
        target: TARGET,
        decision: command.decision,
        commandId: command.commandId,
      });
      rowVersion += 1;
      return receipt(command.commandId, true);
    },
  } as unknown as MachineGateway;

  const review: ReviewApplicationService = {
    async reviewItem(command) {
      // Idempotency first: a replay must return the ORIGINAL receipt and do
      // nothing else (V2 03 §4).
      if (options.breakage !== "IGNORES_IDEMPOTENCY") {
        const seen = receipts.get(command.commandId);
        if (seen !== undefined) return seen;
      }

      // Fail closed BEFORE transport. Coercing null to "" would put an empty
      // string where the audit trail expects a justification (ADR-0019 D5).
      let reason = command.reasonFa;
      if (reason === null) {
        if (options.breakage === "COERCES_NULL_REASON") reason = "";
        else {
          throw new GatewayError(
            "SCHEMA_VALIDATION_FAILED",
            "SCHEMA_VALIDATION_FAILED: a review decision requires a reason (ADR-0013 D2)",
            { retryable: false },
          );
        }
      }

      if (
        command.expectedRowVersion !== undefined &&
        command.expectedRowVersion !== rowVersion
      ) {
        throw gatewayErrors.revisionConflict("concept", command.expectedRowVersion, rowVersion);
      }

      if (options.breakage === "SECOND_DECISION_WRITE_PATH") {
        // The defect this suite exists to catch: a local write beside the
        // gateway, so the decision survives even when submitApproval fails.
        decisions.push({
          target: command.target,
          decision: command.outcome,
          commandId: command.commandId,
        });
      }

      const approval = {
        approvalRequestId: `apr_${command.target.id}`,
        decision: command.outcome,
        reason,
        subjectVersionId: command.target.versionId,
        commandId: command.commandId,
        workspaceId: command.workspaceId,
        actorId: command.actorId,
        actedAsRole: command.actedAsRole,
        idempotencyKey: command.idempotencyKey,
        expectedRowVersion: command.expectedRowVersion,
      } as ApprovalCommand;

      const result = await machineGateway.submitApproval(approval);
      receipts.set(command.commandId, result);
      return result;
    },
  };

  const revision: RevisionGateway = {
    async requestRevision(command: CommandEnvelope & {
      target: Target;
      feedbackFa: string;
      route: RevisionRoute;
    }): Promise<CommandReceipt> {
      const list = versions.get(command.target.id) ?? [];
      if (options.breakage === "REVISION_MUTATES_HISTORY") {
        // Appends correctly AND rewrites the prior version. Appending matters:
        // it lets the count assertion pass so the IMMUTABILITY assertion is the
        // one that fires, which is what this break is meant to demonstrate.
        // Silently rewriting an approved version is how a revision would
        // invalidate a decision nobody revisited.
        list[list.length - 1] = `${command.target.id}-v${String(list.length)}-rewritten`;
        list.push(`${command.target.id}-v${String(list.length + 1)}`);
      } else {
        list.push(`${command.target.id}-v${String(list.length + 1)}`);
      }
      versions.set(command.target.id, list);
      return receipt(command.commandId, true);
    },
  };

  const fixtures: ReviewPathFixtures = {
    reviewableTarget: TARGET,
    envelope: ENVELOPE,
    readDecisions: async (target) => decisions.filter((d) => d.target.id === target.id),
    readVersionIds: async (target) => [...(versions.get(target.id) ?? [])],
  };

  return { machineGateway, review, revision, fixtures };
}
