import type { z } from "zod";
import * as S from "../index";
import { VALID_FIXTURES, gatePolicy, definitionVersion, runSummary, stageRun, approvalRequest, programSummary, weeklyLensSummary, artifactVersion } from "./valid";

/**
 * Rejecting fixtures — every one cites the rule it violates (AC-P2.1) and the
 * frozen test asserts the rejection lands where the rule says it does. Rules
 * come from the recorded documents, never from the schema source.
 */

export interface RejectionFixture {
  readonly schemaName: string;
  readonly schema: z.ZodType;
  /** The recorded rule this fixture violates, with its citation. */
  readonly rule: string;
  readonly value: unknown;
  /** Dotted path the issue must appear at, when the rule names a field. */
  readonly expectPath?: string;
  /** Stable English code the rejection must mention. */
  readonly expectMessage?: string;
}

/** Shallow clone-with-override helper; keeps fixtures readable. */
function withOverride<T extends object>(base: T, patch: Record<string, unknown>): unknown {
  return { ...base, ...patch };
}

const valid = (name: string): unknown => VALID_FIXTURES[name]!.value;

export const INVALID_FIXTURES: readonly RejectionFixture[] = [
  // ---------------------------------------------------------- common ----
  {
    schemaName: "schemaVersionSchema",
    schema: S.schemaVersionSchema,
    rule: "18 §9 — every payload carries a semantic schema version",
    value: "v1",
    expectMessage: "SCHEMA_VERSION_MUST_BE_SEMVER",
  },
  {
    schemaName: "idSchema",
    schema: S.idSchema,
    rule: "06 §1 — consistent opaque application identifiers, never free text",
    value: "run 01/../etc",
    expectMessage: "ID_MUST_BE_URL_SAFE_OPAQUE",
  },
  {
    schemaName: "instantSchema",
    schema: S.instantSchema,
    rule: "06 §1 — UTC persistence; Tehran/Jalali is display only (09 §12)",
    value: "2026-08-21T09:00:00+03:30",
    expectMessage: "INSTANT_MUST_BE_UTC_ISO_8601",
  },
  {
    schemaName: "rowVersionSchema",
    schema: S.rowVersionSchema,
    rule: "06 §1 — optimistic concurrency token is a non-negative integer",
    value: -1,
    expectMessage: "ROW_VERSION_MUST_BE_NON_NEGATIVE",
  },
  {
    schemaName: "sequenceNumberSchema",
    schema: S.sequenceNumberSchema,
    rule: "06 §9.2 — per-run monotonic sequence numbers are non-negative",
    value: -5,
    expectMessage: "SEQUENCE_MUST_BE_NON_NEGATIVE",
  },
  {
    schemaName: "stableCodeSchema",
    schema: S.stableCodeSchema,
    rule: "10 §2 — codes are stable English identifiers, not Persian presentation text",
    value: "پیکربندی لازم است",
    expectMessage: "CODE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE",
  },
  {
    schemaName: "displayTextSchema",
    schema: S.displayTextSchema,
    rule: "09 §9 — a rendered label is never the empty string",
    value: "",
    expectMessage: "TEXT_MUST_NOT_BE_EMPTY",
  },
  {
    schemaName: "idempotencyKeySchema",
    schema: S.idempotencyKeySchema,
    rule: "10 §3 — retryable commands carry a usable Idempotency-Key",
    value: "abc",
    expectMessage: "IDEMPOTENCY_KEY_TOO_SHORT",
  },
  {
    schemaName: "paginationSchema",
    schema: S.paginationSchema,
    rule: "10 §10 — page size is bounded",
    value: { limit: 0 },
    expectPath: "limit",
    expectMessage: "LIMIT_MUST_BE_POSITIVE",
  },
  {
    schemaName: "safeDiagnosticSchema",
    schema: S.safeDiagnosticSchema,
    rule: "18 §4.1 — diagnostics carry a stable code, not free-form provider text",
    value: { code: "unreachable source", diagnosticId: "diag_7f3a", occurredAt: "2026-08-21T09:05:00Z" },
    expectPath: "code",
  },
  {
    schemaName: "rawResponseHandleSchema",
    schema: S.rawResponseHandleSchema,
    rule: "ADR-0013 D6 — raw AI response reads are governed by RAW_RESPONSE_READ alone",
    value: { available: true, requiredCapability: "PROMPT_CONFIGURE" },
    expectPath: "requiredCapability",
  },

  // --------------------------------------------------------- machine ----
  {
    schemaName: "machineConnectionSchema",
    schema: S.machineConnectionSchema,
    rule: "18 §7.2.13 — a disconnected machine is a recorded state, not an arbitrary string",
    value: { state: "OFFLINE", checkedAt: "2026-08-21T09:10:00Z" },
    expectPath: "state",
  },
  {
    schemaName: "machineSummarySchema",
    schema: S.machineSummarySchema,
    rule: "00 §4 — the five machines are 01→05; there is no Machine 06",
    value: withOverride(valid("machineSummarySchema") as object, { machineNumber: 6 }),
    expectPath: "machineNumber",
  },

  // -------------------------------------------------------- workflow ----
  {
    schemaName: "gatePolicySchema",
    schema: S.gatePolicySchema,
    rule: "11 §4 — a policy authorizing neither role nor capability can never be satisfied (fail closed, 00 §4)",
    value: { ...gatePolicy, authorizedRoles: [], authorizedCapabilities: [] },
    expectPath: "authorizedRoles",
    expectMessage: "GATE_POLICY_MUST_AUTHORIZE_A_ROLE_OR_CAPABILITY",
  },
  {
    schemaName: "workflowNodeDefinitionSchema",
    schema: S.workflowNodeDefinitionSchema,
    rule: "ADR-0012 D5 — skippable flags never appear on gates; gates cannot be manually skipped",
    value: {
      id: "node_gate_direction",
      nodeKey: "GATE_DIRECTION",
      kind: "HUMAN_APPROVAL_GATE",
      title: "تأیید جهت‌گیری",
      gatePolicy,
      skippable: true,
    },
    expectPath: "skippable",
    expectMessage: "GATE_NODE_MUST_NOT_BE_SKIPPABLE",
  },
  {
    schemaName: "workflowNodeDefinitionSchema",
    schema: S.workflowNodeDefinitionSchema,
    rule: "06 §9.1 — every gate references a real approval policy or rule set",
    value: {
      id: "node_gate_direction",
      nodeKey: "GATE_DIRECTION",
      kind: "HUMAN_APPROVAL_GATE",
      title: "تأیید جهت‌گیری",
    },
    expectPath: "gatePolicy",
    expectMessage: "HUMAN_APPROVAL_GATE_REQUIRES_A_GATE_POLICY",
  },
  {
    schemaName: "workflowEdgeDefinitionSchema",
    schema: S.workflowEdgeDefinitionSchema,
    rule: "07 §11 — edge type outside the allowed ten",
    value: { id: "edge_x", sourceNodeKey: "A", targetNodeKey: "B", edgeType: "MAYBE" },
    expectPath: "edgeType",
  },
  {
    schemaName: "workflowEdgeDefinitionSchema",
    schema: S.workflowEdgeDefinitionSchema,
    rule: "07 §11 — every loop edge defines a maximum-iterations budget",
    value: { id: "edge_x", sourceNodeKey: "A", targetNodeKey: "B", edgeType: "REVISION", isLoopBack: true },
    expectPath: "maxIterations",
    expectMessage: "LOOP_BACK_EDGE_REQUIRES_MAX_ITERATIONS",
  },
  {
    schemaName: "workflowDefinitionVersionSchema",
    schema: S.workflowDefinitionVersionSchema,
    rule: "06 §9.1 — node keys unique inside a version",
    value: {
      ...definitionVersion,
      nodes: [definitionVersion.nodes[0], definitionVersion.nodes[0], definitionVersion.nodes[3]],
      edges: [],
    },
    expectMessage: "NODE_KEYS_MUST_BE_UNIQUE_WITHIN_A_VERSION",
  },
  {
    schemaName: "workflowDefinitionVersionSchema",
    schema: S.workflowDefinitionVersionSchema,
    rule: "06 §9.1 — at least one start and one terminal node",
    value: { ...definitionVersion, nodes: [definitionVersion.nodes[1]], edges: [] },
    expectMessage: "VERSION_REQUIRES_A_START_NODE",
  },
  {
    schemaName: "workflowDefinitionSchema",
    schema: S.workflowDefinitionSchema,
    rule: "06 §9.1 — definition-version status outside DRAFT|VALIDATING|PUBLISHED|SUPERSEDED",
    value: {
      id: "wf_deep_program",
      workspaceId: "ws_drop",
      key: "DEEP_PROGRAM",
      title: "برنامهٔ عمیق",
      versions: [{ ...definitionVersion, status: "LIVE" }],
      rowVersion: 3,
    },
    expectPath: "versions.0.status",
  },

  // ------------------------------------------------------------- run ----
  {
    schemaName: "waitingReasonCodeSchema",
    schema: S.waitingReasonCodeSchema,
    rule: "10 §2 — reason codes are stable English identifiers",
    value: "provider configuration required",
    expectMessage: "CODE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE",
  },
  {
    schemaName: "stageAttemptSchema",
    schema: S.stageAttemptSchema,
    rule: "ADR-0012 — a stage state outside the recorded fourteen",
    value: { id: "att_x", attemptNumber: 1, status: "BLOCKED", startedAt: "2026-08-21T09:00:00Z" },
    expectPath: "status",
  },
  {
    schemaName: "stageRunSchema",
    schema: S.stageRunSchema,
    rule: "ADR-0012 D4 — WAITING_FOR_INPUT carries the reason code the UI derives its block label from",
    value: {
      id: "sr_x",
      nodeKey: "M01_CONCEPT_DISCOVERY",
      status: "WAITING_FOR_INPUT",
      attempts: [],
    },
    expectPath: "reasonCode",
    expectMessage: "WAITING_FOR_INPUT_REQUIRES_A_REASON_CODE",
  },
  {
    schemaName: "stageRunSchema",
    schema: S.stageRunSchema,
    rule: "18 §7.3 — retry preserves previous attempt history; numbering cannot skip",
    value: {
      ...stageRun,
      attempts: [{ id: "att_a", attemptNumber: 2, status: "SUCCEEDED", startedAt: "2026-08-21T09:00:00Z" }],
    },
    expectMessage: "ATTEMPT_HISTORY_MUST_BE_CONTIGUOUS_FROM_ONE",
  },
  {
    schemaName: "workflowRunSummarySchema",
    schema: S.workflowRunSummarySchema,
    rule: "ADR-0012 D2 — run enum uses WAITING_APPROVAL, not the stage name WAITING_FOR_APPROVAL",
    value: withOverride(runSummary, { status: "WAITING_FOR_APPROVAL" }),
    expectPath: "status",
  },
  {
    schemaName: "workflowRunSchema",
    schema: S.workflowRunSchema,
    rule: "ADR-0012 D3 — run status is derived from stage states; a snapshot may not contradict its stages",
    value: {
      summary: withOverride(runSummary, { status: "SUCCEEDED" }),
      stages: [stageRun, { ...stageRun, id: "sr_y", status: "FAILED_FINAL" }],
    },
    expectPath: "summary.status",
    expectMessage: "RUN_STATUS_CONTRADICTS_STAGE_AGGREGATION",
  },
  {
    schemaName: "runFiltersSchema",
    schema: S.runFiltersSchema,
    rule: "ADR-0012 D2 — filters may only name recorded run states",
    value: { status: ["BLOCKED"] },
    expectPath: "status.0",
  },

  // --------------------------------------------------------- command ----
  {
    schemaName: "runCommandVerbSchema",
    schema: S.runCommandVerbSchema,
    rule: "ADR-0013 D2 — APPROVE_GATE is removed from the runtime command set",
    value: "APPROVE_GATE",
    expectMessage: "GATE_VERB_IS_NOT_A_RUN_COMMAND_USE_THE_APPROVAL_WRITE_PATH",
  },
  {
    schemaName: "runCommandVerbSchema",
    schema: S.runCommandVerbSchema,
    rule: "ADR-0013 D2 — ESCALATE_GATE is removed from the runtime command set",
    value: "ESCALATE_GATE",
    expectMessage: "GATE_VERB_IS_NOT_A_RUN_COMMAND_USE_THE_APPROVAL_WRITE_PATH",
  },
  {
    schemaName: "runCommandSchema",
    schema: S.runCommandSchema,
    rule: "ADR-0013 D2 — REQUEST_CHANGES is rejected as a command name anywhere in the command surface",
    value: {
      verb: "REQUEST_CHANGES",
      runId: "run_01",
      actedAsRole: "DROP_GUARDIAN",
      idempotencyKey: "idem_0000000009",
    },
    expectPath: "verb",
    expectMessage: "GATE_VERB_IS_NOT_A_RUN_COMMAND_USE_THE_APPROVAL_WRITE_PATH",
  },
  {
    schemaName: "runCommandSchema",
    schema: S.runCommandSchema,
    rule: "ADR-0012 D5 — governed manual skip requires a mandatory reason",
    value: {
      verb: "SKIP_STAGE",
      runId: "run_01",
      stageId: "sr_01",
      actedAsRole: "PROJECT_LEAD",
      idempotencyKey: "idem_0000000010",
    },
    expectPath: "reason",
    expectMessage: "SKIP_STAGE_REQUIRES_A_REASON",
  },
  {
    schemaName: "startRunCommandSchema",
    schema: S.startRunCommandSchema,
    rule: "06 §9.2 — a run's subject is a Program or a Weekly Lens",
    value: {
      workflowDefinitionVersionId: "wfv_01",
      actedAsRole: "PROJECT_LEAD",
      idempotencyKey: "idem_0000000011",
    },
    expectPath: "programId",
    expectMessage: "START_RUN_REQUIRES_A_PROGRAM_OR_LENS_SUBJECT",
  },
  {
    schemaName: "approvalCommandSchema",
    schema: S.approvalCommandSchema,
    rule: "ADR-0013 D2 — the decision set is exactly APPROVED|CHANGES_REQUESTED|REJECTED|ESCALATED",
    value: {
      approvalRequestId: "apr_01",
      decision: "APPROVE_GATE",
      reason: "دلیل",
      subjectVersionId: "dirv_2",
      actedAsRole: "DROP_GUARDIAN",
      idempotencyKey: "idem_0000000012",
    },
    expectPath: "decision",
  },
  {
    schemaName: "approvalCommandSchema",
    schema: S.approvalCommandSchema,
    rule: "ADR-0013 D2 — the approval decision carries a mandatory reason",
    value: {
      approvalRequestId: "apr_01",
      decision: "REJECTED",
      subjectVersionId: "dirv_2",
      actedAsRole: "DROP_GUARDIAN",
      idempotencyKey: "idem_0000000013",
    },
    expectPath: "reason",
  },
  {
    schemaName: "commandReceiptSchema",
    schema: S.commandReceiptSchema,
    rule: "18 §12 — a rejected receipt states a stable rejection code the UI can show truthfully",
    value: {
      commandId: "cmd_02",
      accepted: false,
      occurredAt: "2026-08-21T09:10:00Z",
      origin: "MOCK",
      idempotencyKey: "idem_0000000014",
    },
    expectPath: "rejectionCode",
    expectMessage: "REJECTED_RECEIPT_REQUIRES_A_REJECTION_CODE",
  },
  {
    schemaName: "commandReceiptSchema",
    schema: S.commandReceiptSchema,
    rule: "18 §7.3 — a receipt must name its origin so mock actions can never imply real machine work",
    value: {
      commandId: "cmd_03",
      accepted: true,
      occurredAt: "2026-08-21T09:10:00Z",
      idempotencyKey: "idem_0000000015",
    },
    expectPath: "origin",
  },

  // -------------------------------------------------------- artifact ----
  {
    schemaName: "artifactVersionStatusSchema",
    schema: S.artifactVersionStatusSchema,
    rule: "10 §2 — status values are stable English identifiers",
    value: "تأییدشده",
    expectMessage: "CODE_MUST_BE_STABLE_ENGLISH_UPPER_SNAKE",
  },
  {
    schemaName: "artifactValidationSchema",
    schema: S.artifactValidationSchema,
    rule: "00 §4 — validators fail closed; a passed result cannot carry findings",
    value: {
      validatorKey: "FA_EDITORIAL_VALIDATOR",
      validatorCodeVersion: "1.2.0",
      validatorChecksum: "sha256-abc",
      passed: true,
      checkedAt: "2026-08-21T09:05:00Z",
      findings: [{ code: "MISSING_CITATION" }],
    },
    expectPath: "passed",
    expectMessage: "PASSED_VALIDATION_MUST_HAVE_NO_FINDINGS",
  },
  {
    schemaName: "artifactVersionSummarySchema",
    schema: S.artifactVersionSummarySchema,
    rule: "06 §2.2 — an approved version references the approval event that authorised it",
    value: { ...artifactVersion, approvedByEventId: undefined },
    expectPath: "approvedByEventId",
    expectMessage: "APPROVED_VERSION_REQUIRES_ITS_APPROVAL_EVENT",
  },
  {
    schemaName: "artifactSummarySchema",
    schema: S.artifactSummarySchema,
    rule: "06 §7 — the latest version pointer cannot exceed the artifact's version count",
    value: withOverride(valid("artifactSummarySchema") as object, { versionCount: 1 }),
    expectPath: "versionCount",
    expectMessage: "LATEST_VERSION_NUMBER_EXCEEDS_VERSION_COUNT",
  },

  // ----------------------------------------------------------- audit ----
  {
    schemaName: "eventOriginSchema",
    schema: S.eventOriginSchema,
    rule: "00 §4 — machine numbers are 1–5; there is no Machine 06",
    value: { machineNumber: 6, machineVersion: "0.4.0" },
    expectPath: "machineNumber",
  },
  {
    schemaName: "eventActorSchema",
    schema: S.eventActorSchema,
    rule: "11 §2 — the actor model is exactly HUMAN|MACHINE|SERVICE",
    value: { id: "actor_x", actorType: "ROBOT" },
    expectPath: "actorType",
  },
  {
    schemaName: "auditEventSchema",
    schema: S.auditEventSchema,
    rule: "ADR-0014 D1 — heartbeat is transport-only and never an AuditEvent name",
    value: withOverride(valid("auditEventSchema") as object, { name: "heartbeat" }),
    expectPath: "name",
  },
  {
    schemaName: "auditEventSchema",
    schema: S.auditEventSchema,
    rule: "ADR-0017 D4 — the 18 §9 sketch names are not the recorded taxonomy",
    value: withOverride(valid("auditEventSchema") as object, { name: "approval.resolved" }),
    expectPath: "name",
  },
  {
    schemaName: "auditEventSchema",
    schema: S.auditEventSchema,
    rule: "ADR-0013 D4 — only HUMAN actors may decide approvals",
    value: withOverride(valid("auditEventSchema") as object, {
      actor: { id: "actor_machine", actorType: "MACHINE" },
    }),
    expectPath: "actor.actorType",
    expectMessage: "APPROVAL_DECISIONS_REQUIRE_A_HUMAN_ACTOR",
  },
  {
    schemaName: "auditFiltersSchema",
    schema: S.auditFiltersSchema,
    rule: "ADR-0014 D1 — the taxonomy is closed; filters cannot name an event outside it",
    value: { names: ["workflow.run.created"] },
    expectPath: "names.0",
  },

  // --------------------------------------------------- panel entities ----
  {
    schemaName: "userSummarySchema",
    schema: S.userSummarySchema,
    rule: "11 §3 — roles are exactly the canonical seven",
    value: withOverride(valid("userSummarySchema") as object, { roles: ["ADMIN"] }),
    expectPath: "roles.0",
  },
  {
    schemaName: "programSummarySchema",
    schema: S.programSummarySchema,
    rule: "ADR-0015 D5 — IN_PIPELINE must be consistent with active_pipeline_run_id",
    value: { ...programSummary, activePipelineRunId: undefined },
    expectPath: "activePipelineRunId",
    expectMessage: "IN_PIPELINE_PROGRAM_REQUIRES_AN_ACTIVE_RUN",
  },
  {
    schemaName: "programSchema",
    schema: S.programSchema,
    rule: "ADR-0015 D5 — a Program status outside DRAFT|IN_PIPELINE|APPROVED|ARCHIVED",
    value: {
      summary: { ...programSummary, status: "PUBLISHED" },
      createdByActorId: "actor_lead",
      createdAt: "2026-08-21T09:00:00Z",
    },
    expectPath: "summary.status",
  },
  {
    schemaName: "weeklyLensSummarySchema",
    schema: S.weeklyLensSummarySchema,
    rule: "06 §3.4 — database check: end must be after start",
    value: { ...weeklyLensSummary, plannedStartAt: "2026-08-21T09:10:00Z", plannedEndAt: "2026-08-21T09:00:00Z" },
    expectPath: "plannedEndAt",
    expectMessage: "LENS_END_MUST_BE_AFTER_START",
  },
  {
    schemaName: "weeklyLensSchema",
    schema: S.weeklyLensSchema,
    rule: "06 §3.4 — a Lens cannot become APPROVED without a current context artifact and exact parent Bible version",
    value: { summary: weeklyLensSummary, conceptBibleVersionId: "cbv_01" },
    expectPath: "currentContextArtifactId",
    expectMessage: "APPROVED_LENS_REQUIRES_A_CURRENT_CONTEXT_ARTIFACT",
  },
  {
    schemaName: "approvalDecisionRecordSchema",
    schema: S.approvalDecisionRecordSchema,
    rule: "ADR-0013 D4 — a MACHINE identity cannot be recorded as an approval decider",
    value: { ...approvalRequest.decisions[0], actorType: "MACHINE" },
    expectPath: "actorType",
    expectMessage: "ONLY_HUMAN_ACTORS_MAY_DECIDE_APPROVALS",
  },
  {
    schemaName: "approvalRequestSummarySchema",
    schema: S.approvalRequestSummarySchema,
    rule: "ADR-0013 D3 — one decision per actor per request (UNIQUE approval_request_id, actor_id)",
    value: {
      ...approvalRequest,
      decisions: [approvalRequest.decisions[0], approvalRequest.decisions[0]],
    },
    expectMessage: "ONE_DECISION_PER_ACTOR_PER_REQUEST",
  },
  {
    schemaName: "approvalRequestSummarySchema",
    schema: S.approvalRequestSummarySchema,
    rule: "ADR-0013 D3 — N means N distinct human approvers; APPROVED below quorum is unrepresentable",
    value: { ...approvalRequest, state: "APPROVED" },
    expectPath: "state",
    expectMessage: "APPROVED_STATE_REQUIRES_MINIMUM_DISTINCT_APPROVALS",
  },
  {
    schemaName: "researchSourceSummarySchema",
    schema: S.researchSourceSummarySchema,
    rule: "06 §5 — source lifecycle outside CANDIDATE|VALIDATED|ACTIVE|DEACTIVATED|ARCHIVED",
    value: withOverride(valid("researchSourceSummarySchema") as object, { lifecycle: "PENDING" }),
    expectPath: "lifecycle",
  },
  {
    schemaName: "coverageGapSchema",
    schema: S.coverageGapSchema,
    rule: "06 §5 — blocked evidence slots stay in the denominator; counts cannot exceed the requirement",
    value: { id: "gap_x", coverageClass: "INTERNATIONAL", requiredSlots: 2, fulfilledSlots: 3, blockedSlots: 1 },
    expectPath: "fulfilledSlots",
    expectMessage: "FULFILLED_AND_BLOCKED_SLOTS_EXCEED_REQUIRED",
  },
  {
    schemaName: "retrievalRequestSummarySchema",
    schema: S.retrievalRequestSummarySchema,
    rule: "18 §4.1 — a blocked state must be understandable; BLOCKED carries its reason",
    value: withOverride(valid("retrievalRequestSummarySchema") as object, { blockedReasonCode: undefined }),
    expectPath: "blockedReasonCode",
    expectMessage: "BLOCKED_REQUEST_REQUIRES_A_REASON_CODE",
  },
  {
    schemaName: "panelListFiltersSchema",
    schema: S.panelListFiltersSchema,
    rule: "10 §10 — unknown filter keys are rejected rather than silently ignored",
    value: { programId: "prg_01", unknownFilter: true },
  },
  {
    schemaName: "notificationSummarySchema",
    schema: S.notificationSummarySchema,
    rule: "06 §2.3 — a notification references a durable source event",
    value: withOverride(valid("notificationSummarySchema") as object, { sourceEventId: "" }),
    expectPath: "sourceEventId",
  },
];
