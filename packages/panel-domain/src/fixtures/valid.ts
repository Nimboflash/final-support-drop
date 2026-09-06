import type { z } from "zod";
import * as S from "../index";

/**
 * Accepting fixtures — one canonical valid instance per exported schema
 * (AC-P2.1). Values are deterministic: stable IDs, fixed UTC timestamps, seeded
 * numbers (18 §7 — "Do not use uncontrolled random data in screenshots or
 * tests"). P3's scenarios build on these shapes; they are not scenarios
 * themselves.
 */

const T0 = "2026-08-21T09:00:00Z";
const T1 = "2026-08-21T09:05:00Z";
const T2 = "2026-08-21T09:10:00Z";

export const gatePolicy: S.GatePolicy = {
  gateKey: "CONCEPT_DIRECTION_APPROVAL",
  minimumApprovals: 2,
  selfApprovalMode: "DISTINCT_REVIEWER_REQUIRED",
  authorizedRoles: ["DROP_GUARDIAN"],
  authorizedCapabilities: ["CULTURAL_REVIEW"],
};

export const startNode: S.WorkflowNodeDefinition = {
  id: "node_start",
  nodeKey: "START",
  kind: "START",
  title: "شروع",
};

export const stageNode: S.WorkflowNodeDefinition = {
  id: "node_m01_concept",
  nodeKey: "M01_CONCEPT_DISCOVERY",
  kind: "AUTOMATED_STAGE",
  title: "کشف مفهوم",
  machineNumber: 1,
  stageKey: "CONCEPT_DISCOVERY",
  manualFallbackAllowed: true,
  skippable: false,
};

export const gateNode: S.WorkflowNodeDefinition = {
  id: "node_gate_direction",
  nodeKey: "GATE_DIRECTION",
  kind: "HUMAN_APPROVAL_GATE",
  title: "تأیید جهت‌گیری",
  gatePolicy,
};

export const endNode: S.WorkflowNodeDefinition = {
  id: "node_end",
  nodeKey: "END",
  kind: "END",
  title: "پایان",
};

export const successEdge: S.WorkflowEdgeDefinition = {
  id: "edge_start_stage",
  sourceNodeKey: "START",
  targetNodeKey: "M01_CONCEPT_DISCOVERY",
  edgeType: "SUCCESS",
};

export const loopBackEdge: S.WorkflowEdgeDefinition = {
  id: "edge_changes_requested",
  sourceNodeKey: "GATE_DIRECTION",
  targetNodeKey: "M01_CONCEPT_DISCOVERY",
  edgeType: "CHANGES_REQUESTED",
  isLoopBack: true,
  maxIterations: 3,
};

export const definitionVersion: S.WorkflowDefinitionVersion = {
  id: "wfv_01",
  workflowDefinitionId: "wf_deep_program",
  versionNumber: 1,
  semanticVersion: "1.0.0",
  checksum: "sha256-0000000000000000000000000000000000000000000000000000000000000001",
  status: "PUBLISHED",
  nodes: [startNode, stageNode, gateNode, endNode],
  edges: [
    successEdge,
    loopBackEdge,
    { id: "edge_stage_gate", sourceNodeKey: "M01_CONCEPT_DISCOVERY", targetNodeKey: "GATE_DIRECTION", edgeType: "SUCCESS" },
    { id: "edge_gate_end", sourceNodeKey: "GATE_DIRECTION", targetNodeKey: "END", edgeType: "APPROVED" },
  ],
  publishedAt: T0,
  publishedByActorId: "actor_guardian",
};

export const definition: S.WorkflowDefinition = {
  id: "wf_deep_program",
  workspaceId: "ws_drop",
  key: "DEEP_PROGRAM",
  title: "برنامهٔ عمیق",
  latestPublishedVersionId: "wfv_01",
  versions: [definitionVersion],
  rowVersion: 3,
};

export const attempt: S.StageAttempt = {
  id: "att_01",
  attemptNumber: 1,
  status: "SUCCEEDED",
  startedAt: T0,
  endedAt: T1,
  rawResponse: { available: true, requiredCapability: "RAW_RESPONSE_READ" },
};

export const stageRun: S.StageRun = {
  id: "sr_01",
  nodeKey: "M01_CONCEPT_DISCOVERY",
  status: "SUCCEEDED",
  startedAt: T0,
  endedAt: T1,
  attempts: [attempt],
  artifactIds: ["art_concept_cards"],
};

/** A run parked at its approval gate — the shape scenario 5 (18 §7.2) needs. */
export const waitingStageRun: S.StageRun = {
  id: "sr_02",
  nodeKey: "GATE_DIRECTION",
  status: "WAITING_FOR_APPROVAL",
  startedAt: T1,
  attempts: [{ id: "att_02", attemptNumber: 1, status: "WAITING_FOR_APPROVAL", startedAt: T1 }],
};

export const runSummary: S.WorkflowRunSummary = {
  id: "run_01",
  workspaceId: "ws_drop",
  workflowDefinitionId: "wf_deep_program",
  workflowDefinitionVersionId: "wfv_01",
  programId: "prg_01",
  status: "WAITING_APPROVAL",
  createdAt: T0,
  startedAt: T0,
  lastSequence: 12,
  rowVersion: 5,
};

export const run: S.WorkflowRun = {
  summary: runSummary,
  stages: [stageRun, waitingStageRun],
  manifestId: "man_01",
};

export const artifactValidation: S.ArtifactValidation = {
  validatorKey: "FA_EDITORIAL_VALIDATOR",
  validatorCodeVersion: "1.2.0",
  validatorChecksum: "sha256-abc",
  passed: true,
  checkedAt: T1,
  findings: [],
};

export const artifactVersion: S.ArtifactVersionSummary = {
  id: "av_01",
  versionNumber: 2,
  status: "APPROVED",
  createdAt: T1,
  producedByActorId: "actor_machine_01",
  confidence: 0.87,
  validation: artifactValidation,
  approvedByEventId: "evt_approval_01",
};

export const artifact: S.ArtifactSummary = {
  id: "art_concept_cards",
  artifactKey: "CONCEPT_CARDS",
  title: "کارت‌های مفهوم",
  kind: "CONCEPT_CARD_SET",
  runId: "run_01",
  programId: "prg_01",
  latestVersion: artifactVersion,
  versionCount: 2,
};

export const auditEvent: S.AuditEvent = {
  eventId: "evt_approval_01",
  schemaVersion: S.PANEL_SCHEMA_VERSION,
  name: "approval.decided",
  occurredAt: T2,
  workspaceId: "ws_drop",
  correlationId: "corr_01",
  runId: "run_01",
  sequenceNumber: 12,
  actor: {
    id: "actor_guardian",
    actorType: "HUMAN",
    actedAsRole: "DROP_GUARDIAN",
    displayName: "نگهبان دراپ",
  },
  origin: { machineNumber: 1, machineVersion: "0.4.0" },
  subject: { type: "DIRECTION", id: "dir_b", versionId: "dirv_2" },
};

export const approvalRequest: S.ApprovalRequestSummary = {
  id: "apr_01",
  state: "PENDING",
  subject: { type: "DIRECTION", id: "dir_b", versionId: "dirv_2" },
  policy: gatePolicy,
  runId: "run_01",
  stageId: "sr_02",
  requestedAt: T1,
  decisions: [
    {
      actorId: "actor_guardian",
      actorType: "HUMAN",
      decision: "APPROVED",
      actedAsRole: "DROP_GUARDIAN",
      decidedAt: T2,
      reason: "با معیار DROP FIT هم‌خوان است.",
      wasSelfApproval: false,
    },
  ],
  rowVersion: 1,
};

export const programSummary: S.ProgramSummary = {
  id: "prg_01",
  projectId: "prj_01",
  title: "برنامهٔ عمیق «پاتوق سلیقه» برای فصل پاییز",
  status: "IN_PIPELINE",
  programType: "SEASONAL_PROGRAM",
  lensMode: "LENS_SERIES",
  currentMachineKey: "MACHINE_01",
  activePipelineRunId: "run_01",
  updatedAt: T2,
  rowVersion: 4,
};

export const weeklyLensSummary: S.WeeklyLensSummary = {
  id: "lens_34",
  programId: "prg_01",
  title: "لنز هفتهٔ ۳۴ — بازار پاییزی",
  status: "APPROVED",
  question: "پاییز در بازار تهران چه صدایی دارد؟",
  lensColorToken: "LENS_ACCENT",
  plannedStartAt: T0,
  plannedEndAt: T2,
  updatedAt: T2,
  rowVersion: 2,
};

/** The registry the frozen contract test drives (AC-P2.1). */
export const VALID_FIXTURES: Readonly<
  Record<string, { schema: z.ZodType; value: unknown }>
> = {
  // ---- common ----
  schemaVersionSchema: { schema: S.schemaVersionSchema, value: "1.0.0" },
  idSchema: { schema: S.idSchema, value: "run_01" },
  instantSchema: { schema: S.instantSchema, value: T0 },
  rowVersionSchema: { schema: S.rowVersionSchema, value: 4 },
  sequenceNumberSchema: { schema: S.sequenceNumberSchema, value: 12 },
  stableCodeSchema: { schema: S.stableCodeSchema, value: "PROVIDER_CONFIGURATION_REQUIRED" },
  displayTextSchema: { schema: S.displayTextSchema, value: "نمای کلی" },
  idempotencyKeySchema: { schema: S.idempotencyKeySchema, value: "idem_0000000001" },
  paginationSchema: { schema: S.paginationSchema, value: { limit: 25 } },
  safeDiagnosticSchema: {
    schema: S.safeDiagnosticSchema,
    value: { code: "SOURCE_UNREACHABLE", diagnosticId: "diag_7f3a", occurredAt: T1 },
  },
  rawResponseHandleSchema: {
    schema: S.rawResponseHandleSchema,
    value: { available: false, requiredCapability: "RAW_RESPONSE_READ" },
  },

  // ---- machine ----
  machineConnectionSchema: {
    schema: S.machineConnectionSchema,
    value: { state: "CONNECTED", checkedAt: T2, machineVersion: "0.4.0" },
  },
  machineSummarySchema: {
    schema: S.machineSummarySchema,
    value: {
      id: "machine_01",
      machineNumber: 1,
      nameKey: "MACHINE_01_CONCEPT_DISCOVERY",
      displayName: "ماشین ۰۱ — کشف مفهوم",
      capabilities: ["CONCEPT_GENERATION"],
      connection: { state: "CONNECTED", checkedAt: T2, machineVersion: "0.4.0" },
    },
  },

  // ---- workflow ----
  gatePolicySchema: { schema: S.gatePolicySchema, value: gatePolicy },
  workflowNodeDefinitionSchema: { schema: S.workflowNodeDefinitionSchema, value: gateNode },
  workflowEdgeDefinitionSchema: { schema: S.workflowEdgeDefinitionSchema, value: loopBackEdge },
  workflowDefinitionVersionSchema: {
    schema: S.workflowDefinitionVersionSchema,
    value: definitionVersion,
  },
  workflowDefinitionSchema: { schema: S.workflowDefinitionSchema, value: definition },

  // ---- run ----
  waitingReasonCodeSchema: {
    schema: S.waitingReasonCodeSchema,
    value: "PROVIDER_CONFIGURATION_REQUIRED",
  },
  stageAttemptSchema: { schema: S.stageAttemptSchema, value: attempt },
  stageRunSchema: { schema: S.stageRunSchema, value: stageRun },
  workflowRunSummarySchema: { schema: S.workflowRunSummarySchema, value: runSummary },
  workflowRunSchema: { schema: S.workflowRunSchema, value: run },
  runFiltersSchema: {
    schema: S.runFiltersSchema,
    value: { status: ["RUNNING", "WAITING_APPROVAL"], programId: "prg_01", limit: 50 },
  },

  // ---- command ----
  runCommandVerbSchema: { schema: S.runCommandVerbSchema, value: "PAUSE_RUN" },
  startRunCommandSchema: {
    schema: S.startRunCommandSchema,
    value: {
      workflowDefinitionVersionId: "wfv_01",
      programId: "prg_01",
      actedAsRole: "PROJECT_LEAD",
      idempotencyKey: "idem_0000000001",
    },
  },
  runCommandSchema: {
    schema: S.runCommandSchema,
    value: {
      verb: "RETRY_STAGE",
      runId: "run_01",
      stageId: "sr_01",
      actedAsRole: "PROJECT_LEAD",
      idempotencyKey: "idem_0000000002",
      expectedRowVersion: 5,
    },
  },
  approvalCommandSchema: {
    schema: S.approvalCommandSchema,
    value: {
      approvalRequestId: "apr_01",
      decision: "APPROVED",
      reason: "با معیار DROP FIT هم‌خوان است.",
      subjectVersionId: "dirv_2",
      actedAsRole: "DROP_GUARDIAN",
      idempotencyKey: "idem_0000000003",
      expectedRowVersion: 1,
    },
  },
  commandReceiptSchema: {
    schema: S.commandReceiptSchema,
    value: {
      commandId: "cmd_01",
      accepted: true,
      occurredAt: T2,
      origin: "MOCK",
      idempotencyKey: "idem_0000000003",
    },
  },

  // ---- artifact ----
  artifactVersionStatusSchema: { schema: S.artifactVersionStatusSchema, value: "APPROVED" },
  artifactValidationSchema: { schema: S.artifactValidationSchema, value: artifactValidation },
  artifactVersionSummarySchema: {
    schema: S.artifactVersionSummarySchema,
    value: artifactVersion,
  },
  artifactSummarySchema: { schema: S.artifactSummarySchema, value: artifact },

  // ---- audit ----
  eventOriginSchema: {
    schema: S.eventOriginSchema,
    value: { machineNumber: 2, machineVersion: "0.4.0" },
  },
  eventActorSchema: {
    schema: S.eventActorSchema,
    value: { id: "actor_guardian", actorType: "HUMAN", actedAsRole: "DROP_GUARDIAN" },
  },
  auditEventSchema: { schema: S.auditEventSchema, value: auditEvent },
  auditFiltersSchema: {
    schema: S.auditFiltersSchema,
    value: { names: ["approval.decided"], runId: "run_01", limit: 100 },
  },

  // ---- panel entities ----
  userSummarySchema: {
    schema: S.userSummarySchema,
    value: {
      id: "usr_01",
      actorId: "actor_guardian",
      displayName: "نگهبان دراپ",
      actorType: "HUMAN",
      roles: ["DROP_GUARDIAN", "REVIEWER_EDITOR"],
      capabilities: ["FA_EDITORIAL", "CULTURAL_REVIEW"],
      membershipStatus: "ACTIVE",
    },
  },
  programSummarySchema: { schema: S.programSummarySchema, value: programSummary },
  programSchema: {
    schema: S.programSchema,
    value: {
      summary: programSummary,
      constitutionVersionId: "cv_01",
      sourceBriefId: "brief_01",
      createdByActorId: "actor_lead",
      createdAt: T0,
    },
  },
  weeklyLensSummarySchema: { schema: S.weeklyLensSummarySchema, value: weeklyLensSummary },
  weeklyLensSchema: {
    schema: S.weeklyLensSchema,
    value: {
      summary: weeklyLensSummary,
      conceptBibleVersionId: "cbv_01",
      lensTerritoryId: "lt_01",
      currentContextArtifactId: "art_context_34",
    },
  },
  approvalDecisionRecordSchema: {
    schema: S.approvalDecisionRecordSchema,
    value: approvalRequest.decisions[0],
  },
  approvalRequestSummarySchema: {
    schema: S.approvalRequestSummarySchema,
    value: approvalRequest,
  },
  researchSourceSummarySchema: {
    schema: S.researchSourceSummarySchema,
    value: {
      id: "src_01",
      title: "آرشیو بازار تجریش",
      lifecycle: "ACTIVE",
      coverageClass: "IRANIAN_PERSIAN",
      networkReachable: true,
      contentRetrievable: true,
      lastCheckedAt: T1,
      snapshotId: "snap_01",
    },
  },
  coverageGapSchema: {
    schema: S.coverageGapSchema,
    value: {
      id: "gap_01",
      coverageClass: "INTERNATIONAL",
      requiredSlots: 6,
      fulfilledSlots: 4,
      blockedSlots: 1,
    },
  },
  retrievalRequestSummarySchema: {
    schema: S.retrievalRequestSummarySchema,
    value: {
      id: "req_01",
      title: "بازیابی سند بازار",
      status: "BLOCKED",
      assignedToActorId: "actor_contributor",
      dueAt: T2,
      blockedReasonCode: "SOURCE_UNREACHABLE",
      updatedAt: T2,
    },
  },
  panelListFiltersSchema: {
    schema: S.panelListFiltersSchema,
    value: { programId: "prg_01", onlyOpen: true, limit: 20 },
  },
  notificationSummarySchema: {
    schema: S.notificationSummarySchema,
    value: {
      id: "ntf_01",
      sourceEventId: "evt_approval_01",
      recipientActorId: "actor_lead",
      createdAt: T2,
      kindKey: "APPROVAL_DECIDED",
    },
  },
};
