import {
  DemoRepository,
  StaleRevisionError,
  createFixedClock,
  exportPackageFrom,
  loadScenario,
  type DemoClock,
  type ScenarioResponsePolicy,
} from "@drop/mock-data";
import type {
  ApprovalCommand,
  CommandEnvelope,
  CommandReceipt,
  PackageExport,
  PanelCalendarEntry,
  PanelEvent,
  PanelProject,
  PanelSnapshot,
  RevisionRoute,
  Target,
} from "@drop/panel-domain";
import { toApprovalDecision, toReviewStatus } from "@drop/panel-domain";
import { GatewayError, gatewayErrors } from "../errors";
import type { PanelCommandGateway } from "../panel-command-gateway";
import type { RevisionGateway } from "../revision-gateway";
import type { ReviewApplicationService } from "../review-application-service";

/** The one member of MachineGateway the panel's write path uses. */
interface MachineGatewayApprovalSurface {
  submitApproval(command: ApprovalCommand): Promise<CommandReceipt>;
}

/**
 * The mock world: one `DemoRepository` shared by every adapter (ticket P3).
 *
 * All four adapters are constructed here, over the SAME repository instance.
 * V2 04 §4 journey A14 requires the same action from the inbox, the card and the
 * graph to produce one audit event and identical results — which is only true if
 * they are reading and writing one store. Handing each adapter its own slice is
 * how that silently stops being true.
 *
 * The scenario's response policy is applied at this boundary rather than inside
 * the repository: "disconnected" and "forbidden" are transport conditions, not
 * facts about the demo data (V2 04 §2 — these are scenario-controlled, never
 * random).
 */
export interface MockWorld {
  readonly repository: DemoRepository;
  readonly clock: DemoClock;
  readonly policy: ScenarioResponsePolicy;
  readonly panelCommandGateway: PanelCommandGateway;
  readonly revisionGateway: RevisionGateway;
  readonly review: ReviewApplicationService;
  /**
   * The single approval write path (ADR-0013 D1). Exposed as an OBJECT rather
   * than a bound function on purpose: the review facade dispatches through this
   * property, so the conformance suite can sever it and prove no second
   * decision path exists. A captured closure would make that proof impossible —
   * severing the property would leave the facade calling the original.
   */
  readonly machineGateway: Pick<MachineGatewayApprovalSurface, "submitApproval">;
}

export interface MockWorldOptions {
  readonly scenarioId: string;
  readonly clock?: DemoClock;
  /** The acting demo actor; S14 sets a read-only one. */
  readonly actorId?: string;
}

export function createMockWorld(options: MockWorldOptions): MockWorld {
  const loaded = loadScenario(options.scenarioId);
  const clock = options.clock ?? createFixedClock();
  const repository = new DemoRepository(loaded.snapshot, clock);
  const policy = loaded.policy;

  /** Applied before every command; scenario-controlled, never random. */
  function guard(action: string): void {
    if (policy.disconnected === true) throw gatewayErrors.disconnected(`cannot ${action}`);
    if (policy.forbidden === true) throw gatewayErrors.unauthorized(action);
  }

  function toGatewayError(error: unknown): never {
    if (error instanceof StaleRevisionError) {
      // ADR-0019 D10 — the panel's CONFLICT. Not retryable: replaying the same
      // command would be stale again; the fix is refresh-then-resubmit.
      throw gatewayErrors.revisionConflict(error.aggregateId, error.expected, error.actual);
    }
    throw error;
  }

  /** The ONE decision write path (ADR-0013 D1). */
  function submitApprovalImpl(command: ApprovalCommand): Promise<CommandReceipt> {
    guard("submit an approval");
    const reviewStatus = toReviewStatus(command.decision);
    try {
      const { receipt } = repository.apply(
        {
          commandId: command.commandId,
          expectedRowVersion: command.expectedRowVersion,
          aggregateId: command.approvalRequestId.replace(/^apr_/, ""),
        },
        (draft) => {
          const targetId = command.approvalRequestId.replace(/^apr_/, "");
          const card =
            draft.concepts.find((c) => c.id === targetId) ??
            draft.content.find((c) => c.id === targetId);
          if (card !== undefined) {
            card.reviewStatus = reviewStatus;
            card.rowVersion += 1;
            if ("rejectionReasonFa" in card && reviewStatus === "REJECTED") {
              card.rejectionReasonFa = command.reason;
            }
          }
          const kind = draft.concepts.some((c) => c.id === targetId) ? "CONCEPT" : "CONTENT";
          draft.decisions.push({
            id: `d-${command.commandId}`,
            target: { type: kind, id: targetId, versionId: command.subjectVersionId },
            actorId: command.actorId,
            activeRole: command.actedAsRole,
            outcome:
              command.decision === "CHANGES_REQUESTED" ? "REVISION_REQUESTED" : command.decision === "ESCALATED" ? "REVISION_REQUESTED" : command.decision,
            reasonFa: command.reason,
            createdAt: clock.now(),
          });
          return {
            result: null,
            events: [
              {
                aggregateId: targetId,
                aggregateRevision: (card?.rowVersion ?? 1),
                type: kind === "CONCEPT" ? "panel.concept.reviewed" : "panel.content.reviewed",
                data: { decision: command.decision },
              },
            ],
          };
        },
      );
      return Promise.resolve(receipt);
    } catch (error) {
      return toGatewayError(error);
    }
  }

  // A mutable holder, so `reviewItem` dispatches through the property the
  // conformance suite severs rather than through a captured reference.
  const machineGateway: MachineGatewayApprovalSurface = { submitApproval: submitApprovalImpl };

  const review: ReviewApplicationService = {
    reviewItem(command) {
      // Fail closed BEFORE transport (ADR-0019 D5). Coercing null to "" would
      // put an empty string where the audit trail expects a justification.
      if (command.reasonFa === null) {
        throw new GatewayError(
          "SCHEMA_VALIDATION_FAILED",
          "SCHEMA_VALIDATION_FAILED: a review decision requires a reason (ADR-0013 D2)",
          { retryable: false },
        );
      }
      const decision = toApprovalDecision(
        command.outcome === "CHANGES_REQUESTED" ? "REVISION_REQUESTED" : command.outcome,
      );
      if (decision === null) {
        throw new GatewayError(
          "INVALID_STATE_TRANSITION",
          "INVALID_STATE_TRANSITION: that card status carries no decision",
          { retryable: false },
        );
      }
      // The sole construction of an ApprovalCommand in the mock world, and the
      // only call to submitApproval — through the gateway object (ADR-0019 D4).
      return machineGateway.submitApproval({
        approvalRequestId: `apr_${command.target.id}`,
        decision,
        reason: command.reasonFa,
        subjectVersionId: command.target.versionId,
        commandId: command.commandId,
        workspaceId: command.workspaceId,
        actorId: command.actorId,
        actedAsRole: command.actedAsRole,
        idempotencyKey: command.idempotencyKey,
        expectedRowVersion: command.expectedRowVersion,
      });
    },
  };

  const revisionGateway: RevisionGateway = {
    requestRevision(command: CommandEnvelope & { target: Target; feedbackFa: string; route: RevisionRoute }) {
      guard("request a revision");
      try {
        const { receipt } = repository.apply(
          {
            commandId: command.commandId,
            expectedRowVersion: command.expectedRowVersion,
            aggregateId: command.target.id,
          },
          (draft) => {
            // A revision APPENDS a version; it never rewrites one. `retryStage`
            // repeats an attempt at the same version — a different thing
            // entirely (V2 03 §2).
            if (command.target.type === "CONCEPT") {
              const versions = draft.conceptVersions.filter((v) => v.conceptId === command.target.id);
              const previous = versions[versions.length - 1];
              if (previous === undefined) throw gatewayErrors.unknownId("concept", command.target.id);
              const next = previous.number + 1;
              draft.conceptVersions.push({
                ...previous,
                id: `${command.target.id}-v${String(next)}`,
                number: next,
                feedbackAppliedFa: command.feedbackFa,
                createdAt: clock.now(),
              });
              const card = draft.concepts.find((c) => c.id === command.target.id);
              if (card !== undefined) {
                card.pendingRevisionId = `${command.target.id}-v${String(next)}`;
                card.reviewStatus = "REVISION_REQUESTED";
                card.rowVersion += 1;
              }
            } else {
              const versions = draft.contentVersions.filter((v) => v.contentId === command.target.id);
              const previous = versions[versions.length - 1];
              if (previous === undefined) throw gatewayErrors.unknownId("content", command.target.id);
              const next = previous.number + 1;
              draft.contentVersions.push({
                ...previous,
                id: `${command.target.id}-v${String(next)}`,
                number: next,
                createdAt: clock.now(),
              });
              const card = draft.content.find((c) => c.id === command.target.id);
              if (card !== undefined) {
                card.pendingRevisionId = `${command.target.id}-v${String(next)}`;
                card.reviewStatus = "REVISION_REQUESTED";
                card.rowVersion += 1;
              }
            }
            return {
              result: null,
              events: [
                {
                  aggregateId: command.target.id,
                  aggregateRevision: 1,
                  type:
                    command.target.type === "CONCEPT"
                      ? "panel.concept.revision_requested"
                      : "panel.content.revision_requested",
                  data: { route: command.route },
                },
              ],
            };
          },
        );
        return Promise.resolve(receipt);
      } catch (error) {
        return toGatewayError(error);
      }
    },
  };

  const panelCommandGateway: PanelCommandGateway = {
    getSnapshot: () => Promise.resolve(repository.snapshot()),

    createProject(command) {
      guard("create a project");
      const { receipt } = repository.apply(
        { commandId: command.commandId, aggregateId: "workspace" },
        (draft) => {
          const id = `p-${command.commandId}`;
          draft.projects.push({
            ...(command.project as unknown as PanelProject),
            id,
            workspaceId: command.workspaceId,
            rowVersion: 1,
          } as PanelProject);
          return {
            result: null,
            events: [{ aggregateId: id, aggregateRevision: 1, type: "panel.project.created", data: { id } }],
          };
        },
      );
      return Promise.resolve(receipt);
    },

    addComment(command) {
      guard("add a comment");
      const { receipt } = repository.apply(
        { commandId: command.commandId, aggregateId: command.target.id },
        (draft) => {
          // V2 01 §4 — a comment NEVER changes approval status. The DTO is
          // structurally incapable of carrying an outcome, and this write
          // touches no review field.
          draft.comments.push({
            id: `cm-${command.commandId}`,
            target: command.target,
            actorId: command.actorId,
            bodyFa: command.bodyFa,
            createdAt: clock.now(),
          });
          return { result: null, events: [] };
        },
      );
      return Promise.resolve(receipt);
    },

    selectConcepts(command) {
      guard("select concepts");
      try {
        const { receipt } = repository.apply(
          {
            commandId: command.commandId,
            expectedRowVersion: command.expectedRowVersion,
            aggregateId: command.projectId,
          },
          (draft) => {
            const found = draft.projects.find((p) => p.id === command.projectId);
            if (found === undefined) throw gatewayErrors.unknownId("project", command.projectId);
            found.selectedConceptVersionIds = [...command.conceptVersionIds];
            found.rowVersion += 1;
            return {
              result: null,
              events: [
                {
                  aggregateId: command.projectId,
                  aggregateRevision: found.rowVersion,
                  type: "panel.project.concepts_selected",
                  data: { count: command.conceptVersionIds.length },
                },
              ],
            };
          },
        );
        return Promise.resolve(receipt);
      } catch (error) {
        return toGatewayError(error);
      }
    },

    amendOutputPlan(command) {
      guard("amend the output plan");
      try {
        const { receipt } = repository.apply(
          {
            commandId: command.commandId,
            expectedRowVersion: command.expectedRowVersion,
            aggregateId: command.projectId,
          },
          (draft) => {
            const found = draft.projects.find((p) => p.id === command.projectId);
            if (found === undefined) throw gatewayErrors.unknownId("project", command.projectId);
            found.outputPlan = {
              revision: found.outputPlan.revision + 1,
              includedConceptIds: found.outputPlan.includedConceptIds,
              requiredContentIds: [...command.requiredContentIds],
              optionalContentIds: [...command.optionalContentIds],
            };
            found.rowVersion += 1;
            return {
              result: null,
              events: [
                {
                  aggregateId: command.projectId,
                  aggregateRevision: found.rowVersion,
                  type: "panel.output_plan.amended",
                  data: { reasonFa: command.reasonFa },
                },
              ],
            };
          },
        );
        return Promise.resolve(receipt);
      } catch (error) {
        return toGatewayError(error);
      }
    },

    updateCalendar(command) {
      guard("update the calendar");
      try {
        const { receipt } = repository.apply(
          {
            commandId: command.commandId,
            expectedRowVersion: command.expectedRowVersion,
            aggregateId: command.entry.id,
          },
          (draft) => {
            // Idempotent per package FAMILY (ADR-0019 D7): a second create for
            // the same family updates the entry rather than duplicating it.
            const index = draft.calendar.findIndex(
              (c) => c.packageFamilyId === command.entry.packageFamilyId,
            );
            const entry: PanelCalendarEntry = { ...command.entry, rowVersion: command.entry.rowVersion + 1 };
            if (index >= 0) draft.calendar[index] = entry;
            else draft.calendar.push(entry);
            return {
              result: null,
              events: [
                {
                  aggregateId: entry.id,
                  aggregateRevision: entry.rowVersion,
                  type: index >= 0 ? "panel.calendar.entry_rescheduled" : "panel.calendar.entry_created",
                  data: { date: entry.date },
                },
              ],
            };
          },
        );
        return Promise.resolve(receipt);
      } catch (error) {
        return toGatewayError(error);
      }
    },

    updateCalendarPackage(command) {
      guard("relink the calendar entry");
      const { receipt } = repository.apply(
        { commandId: command.commandId, aggregateId: command.entryId },
        (draft) => {
          const entry = draft.calendar.find((c) => c.id === command.entryId);
          if (entry === undefined) throw gatewayErrors.unknownId("calendar entry", command.entryId);
          // An explicit relink, never a duplicate entry (V2 01 §6).
          entry.packageVersionId = command.packageVersionId;
          entry.rowVersion += 1;
          return {
            result: null,
            events: [
              {
                aggregateId: entry.id,
                aggregateRevision: entry.rowVersion,
                type: "panel.calendar.entry_rescheduled",
                data: { packageVersionId: command.packageVersionId },
              },
            ],
          };
        },
      );
      return Promise.resolve(receipt);
    },

    exportPackage(packageVersionId: string): Promise<PackageExport> {
      // Wrapped so an unknown id REJECTS rather than throwing synchronously:
      // the interface is async, and a caller awaiting it would otherwise face a
      // throw from the call expression rather than from the await.
      try {
        return Promise.resolve(exportPackageFrom(repository.snapshot(), packageVersionId));
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },

    subscribe(listener: (event: PanelEvent) => void): () => void {
      return repository.subscribe(listener);
    },
  };

  return { repository, clock, policy, panelCommandGateway, revisionGateway, review, machineGateway };
}

export type { PanelSnapshot };
