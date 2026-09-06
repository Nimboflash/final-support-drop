import type {
  ApprovalCommand,
  ArtifactSummary,
  AuditEvent,
  AuditFilters,
  CommandReceipt,
  MachineSummary,
  RunFilters,
  StartRunCommand,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunSummary,
} from "@drop/panel-domain";

/**
 * The sole seam between the panel and machine data (18 §6; ADR-0017 D4).
 *
 * The declaration below is committed VERBATIM from doc 18 §6 — it is quoted in
 * that document as "the required rule". `verbatim-interface.test.ts` extracts
 * the ```ts block from
 * `docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`
 * at test time and compares it character-for-character with the block below, so
 * drift in either direction is a red check rather than a review catch
 * (AC-P2.6).
 *
 * Do not add members. ADR-0018 D1 is explicit: MachineGateway "remains
 * character-for-character unchanged and gains no members"; entity groups beyond
 * its method set belong to `PanelGateway`.
 *
 * --- BEGIN VERBATIM 18 §6 ---
 */
export interface MachineGateway {
  listMachines(): Promise<MachineSummary[]>;
  listWorkflowDefinitions(): Promise<WorkflowDefinition[]>;
  getWorkflowDefinition(id: string): Promise<WorkflowDefinition>;
  listRuns(filters?: RunFilters): Promise<WorkflowRunSummary[]>;
  getRun(id: string): Promise<WorkflowRun>;
  startRun(command: StartRunCommand): Promise<CommandReceipt>;
  pauseRun(runId: string): Promise<CommandReceipt>;
  retryStage(runId: string, stageId: string): Promise<CommandReceipt>;
  submitApproval(command: ApprovalCommand): Promise<CommandReceipt>;
  listArtifacts(runId: string): Promise<ArtifactSummary[]>;
  listAuditEvents(filters?: AuditFilters): Promise<AuditEvent[]>;
}
/** --- END VERBATIM 18 §6 --- */
