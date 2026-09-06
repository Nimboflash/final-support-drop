import {
  artifact as artifactFixture,
  attempt as attemptFixture,
  auditEvent as auditEventFixture,
  definition as definitionFixture,
  run as runFixture,
  runSummary as runSummaryFixture,
  VALID_FIXTURES,
} from "@drop/panel-domain/fixtures";
import type {
  ApprovalCommand,
  ArtifactSummary,
  AuditEvent,
  AuditFilters,
  CommandReceipt,
  MachineSummary,
  RunFilters,
  StageRun,
  StartRunCommand,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunSummary,
} from "@drop/panel-domain";
import type { MachineGateway } from "../machine-gateway";
import { gatewayErrors } from "../errors";
import type { ConformanceFixtures } from "./index";

/**
 * The deliberately minimal in-test reference stub (P2 body, mechanic 6).
 *
 * It exists for one purpose: proving the conformance suite runs and can pass.
 * It is NOT the P3 `MockMachineGateway`, is NOT exported from the package's
 * public entry point, and implements no scenario behaviour beyond what the
 * suite exercises. P3's mock must pass the same suite unmodified.
 *
 * The clock is injected (18 §7 — "fixed timestamps or a controllable clock"),
 * which is what makes the determinism case meaningful.
 */

const STUB_RUN_ID = runSummaryFixture.id;
const STUB_DEFINITION_ID = definitionFixture.id;
/** A FAILED_RETRYABLE stage, so retryStage has something realistic to act on. */
const RETRYABLE_STAGE_ID = "sr_retryable";

export interface ReferenceStubOptions {
  /** Injected clock — every timestamp the stub mints comes from here. */
  readonly now: () => string;
  /** Lets the broken-stub fixture disable one behaviour at a time. */
  readonly breakage?: "PAUSE_APPENDS_NO_AUDIT_EVENT" | "UNKNOWN_ID_RESOLVES_UNDEFINED";
}

export function createReferenceStub(options: ReferenceStubOptions): MachineGateway {
  const now = options.now;
  let commandCounter = 0;

  const retryableStage: StageRun = {
    id: RETRYABLE_STAGE_ID,
    nodeKey: "M01_CONCEPT_DISCOVERY",
    status: "FAILED_RETRYABLE",
    startedAt: attemptFixture.startedAt,
    attempts: [{ ...attemptFixture, id: "att_r1", status: "FAILED_RETRYABLE" }],
  };

  // Mutable state, seeded from the panel-domain fixtures so the stub shares the
  // canonical shapes rather than inventing parallel ones.
  const runs = new Map<string, WorkflowRun>([
    [
      STUB_RUN_ID,
      { ...runFixture, stages: [...runFixture.stages, retryableStage] },
    ],
  ]);
  const auditEvents: AuditEvent[] = [auditEventFixture];

  function receipt(accepted: boolean): CommandReceipt {
    commandCounter += 1;
    return {
      commandId: `cmd_stub_${commandCounter}`,
      accepted,
      occurredAt: now(),
      origin: "MOCK",
      idempotencyKey: `idem_stub_${String(commandCounter).padStart(6, "0")}`,
      ...(accepted ? {} : { rejectionCode: "STUB_REJECTED" }),
    };
  }

  function requireRun(id: string): WorkflowRun {
    const found = runs.get(id);
    if (found === undefined) throw gatewayErrors.unknownId("run", id);
    return found;
  }

  return {
    async listMachines(): Promise<MachineSummary[]> {
      return [VALID_FIXTURES["machineSummarySchema"]!.value as MachineSummary];
    },

    async listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
      return [definitionFixture];
    },

    async getWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
      if (id !== STUB_DEFINITION_ID) {
        if (options.breakage === "UNKNOWN_ID_RESOLVES_UNDEFINED") {
          // The break under test: a silent undefined instead of a typed error.
          return undefined as unknown as WorkflowDefinition;
        }
        throw gatewayErrors.unknownId("workflow definition", id);
      }
      return definitionFixture;
    },

    async listRuns(filters?: RunFilters): Promise<WorkflowRunSummary[]> {
      let summaries = [...runs.values()].map((r) => r.summary);
      if (filters?.status !== undefined) {
        const wanted = filters.status;
        summaries = summaries.filter((s) => wanted.includes(s.status));
      }
      if (filters?.programId !== undefined) {
        summaries = summaries.filter((s) => s.programId === filters.programId);
      }
      return summaries;
    },

    async getRun(id: string): Promise<WorkflowRun> {
      return requireRun(id);
    },

    async startRun(_command: StartRunCommand): Promise<CommandReceipt> {
      return receipt(true);
    },

    async pauseRun(runId: string): Promise<CommandReceipt> {
      requireRun(runId);
      if (options.breakage !== "PAUSE_APPENDS_NO_AUDIT_EVENT") {
        auditEvents.push({
          ...auditEventFixture,
          eventId: `evt_stub_${auditEvents.length + 1}`,
          name: "run.paused",
          occurredAt: now(),
          runId,
          sequenceNumber: auditEvents.length + 1,
        });
      }
      return receipt(true);
    },

    async retryStage(runId: string, stageId: string): Promise<CommandReceipt> {
      const current = requireRun(runId);
      const stage = current.stages.find((s) => s.id === stageId);
      if (stage === undefined) throw gatewayErrors.unknownId("stage", stageId);
      const nextStages = current.stages.map((s) =>
        s.id === stageId
          ? {
              ...s,
              attempts: [
                ...s.attempts,
                {
                  id: `att_${stageId}_${s.attempts.length + 1}`,
                  attemptNumber: s.attempts.length + 1,
                  status: s.status,
                  startedAt: now(),
                },
              ],
            }
          : s,
      );
      runs.set(runId, { ...current, stages: nextStages });
      return receipt(true);
    },

    async submitApproval(_command: ApprovalCommand): Promise<CommandReceipt> {
      return receipt(true);
    },

    async listArtifacts(runId: string): Promise<ArtifactSummary[]> {
      requireRun(runId);
      return [artifactFixture];
    },

    async listAuditEvents(filters?: AuditFilters): Promise<AuditEvent[]> {
      let events = [...auditEvents];
      if (filters?.runId !== undefined) {
        events = events.filter((e) => e.runId === filters.runId);
      }
      if (filters?.names !== undefined) {
        const wanted = filters.names;
        events = events.filter((e) => wanted.includes(e.name));
      }
      return events;
    },
  };
}

/** The handles the suite needs against this stub. */
export const REFERENCE_STUB_FIXTURES: ConformanceFixtures = {
  knownWorkflowDefinitionId: STUB_DEFINITION_ID,
  unknownWorkflowDefinitionId: "wf_does_not_exist",
  knownRunId: STUB_RUN_ID,
  unknownRunId: "run_does_not_exist",
  narrowingRunFilters: { status: ["WAITING_APPROVAL"] },
  pausableRunId: STUB_RUN_ID,
  retryableStage: { runId: STUB_RUN_ID, stageId: RETRYABLE_STAGE_ID },
  startRunCommand: VALID_FIXTURES["startRunCommandSchema"]!.value as StartRunCommand,
  approvalCommand: VALID_FIXTURES["approvalCommandSchema"]!.value as ApprovalCommand,
};
