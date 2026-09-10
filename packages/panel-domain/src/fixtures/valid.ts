import type { z } from "zod";
import * as S from "../index";

/**
 * Accepting fixtures — one canonical valid instance per exported schema
 * (AC-P2.1). Values are deterministic: stable IDs, fixed UTC timestamps, seeded
 * numbers (18 §7 — "Do not use uncontrolled random data in screenshots or
 * tests"). P3's scenarios build on these shapes; they are not scenarios
 * themselves.
 */

/**
 * ADR-0019 D16 — the single demo epoch. Re-based from 2026-08-21T09:00:00Z when
 * the V2 pack landed: its seed, its scenario `fixedClock` and doc 04 §2 all
 * anchor at 2026-09-06T09:00:00Z, and two clocks in one world make "sort by
 * recent activity" (V2 02 §4) meaningless.
 */
const T0 = "2026-09-06T09:00:00Z";
const T1 = "2026-09-06T09:05:00Z";
const T2 = "2026-09-06T09:10:00Z";

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

/** The full Program, reused by both `programSchema` and `panelProjectSchema`'s
 * PROGRAM arm — the arm EMBEDS this schema so its refines keep firing. */
export const program: S.Program = {
  summary: programSummary,
  constitutionVersionId: "cv_01",
  sourceBriefId: "brief_01",
  createdByActorId: "actor_lead",
  createdAt: T0,
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

/* ------------------------------------------------- machine wire (0021) -- */

/**
 * The machine's wire shapes (ADR-0021 D6).
 *
 * Transcribed from a REAL captured session —
 * `services/concept-portfolio/demo_runs/c18c18e12aea/session_state.json`,
 * committed by the machine's own authors — and trimmed to two concepts and two
 * recommendations so it stays readable. It is deliberately a demanding shape:
 * two rounds, the SAME concept ids repeated in both (which is what the machine
 * really does), and an approval made in round 1 that the machine never cleared
 * when round 2 arrived.
 *
 * The English strings are not an oversight. The machine returns English, into a
 * Persian-only interface, and a fixture that quietly said otherwise would hide
 * the open decision (ADR-0021 D7) this repository is supposed to keep visible.
 */
export const machineConceptCard: S.MachineConceptCard = {
  concept_id: "concept_02",
  title: "The second meaning",
  one_line: "A concept about returning with changed perception.",
  human_truth: "People often return to the same thing with a changed self.",
  central_idea: "Meaning changes because we change.",
  guest_takeaway: "Returning can reveal who we are now.",
  territory: "TEMPORAL",
  anchor_score: 5,
  portfolio_score: 4.4,
  why_it_fits: "It directly extends the brief about renewed meaning in return.",
};

export const machineRecommendation: S.MachineRecommendation = {
  rank: 1,
  title: "Music Track 1",
  creator: "Artist 1",
  why_related: "Track 1 matches the concept through reflective return.",
  source_notes: "Mock source note.",
  links: ["https://example.com/music/1"],
};

export const machineConceptBatch: S.MachineConceptBatch = {
  round_index: 1,
  concepts: [machineConceptCard],
  notes: "Mock concept generation.",
};

export const machinePortfolio: S.MachinePortfolio = {
  concept_id: "concept_02",
  concept_title: "The second meaning",
  music: [machineRecommendation],
  films_and_series: [{ ...machineRecommendation, title: "Film or Series 1" }],
  artworks: [{ ...machineRecommendation, title: "Artwork 1" }],
  scientific_readings: [{ ...machineRecommendation, title: "Scientific Reading 1" }],
  artistic_readings: [{ ...machineRecommendation, title: "Artistic Reading 1" }],
};

export const machineConceptRequest = {
  project_brief: "A gathering about things that become meaningful when we return to them.",
  initial_context: "small intimate cultural gathering",
  desired_feeling: "reflective, warm",
  seed: "returning changes us",
  previous_ideas: [],
};

export const machineSession: S.MachineSession = {
  session_id: "c18c18e12aea",
  status: "PORTFOLIO_READY",
  input: machineConceptRequest,
  concept_rounds: [
    machineConceptBatch,
    {
      // Round two repeats the same concept id — the machine's own behaviour,
      // not a copy-paste. Nothing downstream may key on it alone.
      round_index: 2,
      concepts: [{ ...machineConceptCard, title: "The second meaning refined" }],
      notes: "Mock concept refinement.",
    },
  ],
  approved_concept_id: "concept_02",
  approved_concept: machineConceptCard,
  portfolio: machinePortfolio,
  run_dir: "/mnt/data/drop_concept_portfolio_project/demo_runs/c18c18e12aea",
};

export const VALID_FIXTURES: Readonly<
  Record<string, { schema: z.ZodType; value: unknown }>
> = {
  // ---- machine wire (ADR-0021) ----
  machineConceptCardSchema: { schema: S.machineConceptCardSchema, value: machineConceptCard },
  machineConceptBatchSchema: { schema: S.machineConceptBatchSchema, value: machineConceptBatch },
  machineRecommendationSchema: {
    schema: S.machineRecommendationSchema,
    value: machineRecommendation,
  },
  machinePortfolioSchema: { schema: S.machinePortfolioSchema, value: machinePortfolio },
  machineConceptRequestSchema: {
    schema: S.machineConceptRequestSchema,
    value: machineConceptRequest,
  },
  machineSessionSchema: { schema: S.machineSessionSchema, value: machineSession },

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
      commandId: "cmd_start_01",
      workspaceId: "drop-demo",
      actorId: "actor_lead",
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
      commandId: "cmd_retry_01",
      workspaceId: "drop-demo",
      actorId: "actor_lead",
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
      commandId: "cmd_approve_01",
      workspaceId: "drop-demo",
      actorId: "actor_guardian",
      actedAsRole: "DROP_GUARDIAN",
      idempotencyKey: "idem_0000000003",
      expectedRowVersion: 1,
    },
  },
  commandEnvelopeSchema: {
    schema: S.commandEnvelopeSchema,
    value: {
      commandId: "cmd_env_01",
      workspaceId: "drop-demo",
      actorId: "actor_lead",
      actedAsRole: "PROJECT_LEAD",
      idempotencyKey: "idem_0000000004",
      expectedRowVersion: 3,
    },
  },
  commandReceiptSchema: {
    schema: S.commandReceiptSchema,
    value: {
      commandId: "cmd_01",
      accepted: true,
      status: "SUCCEEDED",
      correlationId: "corr_01",
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
  programSchema: { schema: S.programSchema, value: program },
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

  // ---- ticket P2, V2 product entities (ADR-0019 D11, D12) ----
  // Shapes and Persian content are transcribed from docs/frontend-v2/mock/seed.json
  // (project p1, "زیبایی ناتمام"), normalized to the stored UPPER_SNAKE form.
  referenceInputSchema: {
    schema: S.referenceInputSchema,
    value: { kind: "URL", url: "https://example.invalid/imperfection-essay" },
  },
  startInputSchema: {
    schema: S.startInputSchema,
    // The blank-discovery mode — V2's `input: null`, made explicit.
    value: { mode: "BLANK" },
  },
  outputPlanSchema: {
    schema: S.outputPlanSchema,
    value: {
      revision: 1,
      includedConceptIds: ["c1"],
      requiredContentIds: ["o1", "o2", "o3", "o4"],
      optionalContentIds: [],
    },
  },
  panelProjectSchema: {
    schema: S.panelProjectSchema,
    value: {
      id: "p1",
      workspaceId: "drop-demo",
      rowVersion: 1,
      titleFa: "زیبایی ناتمام",
      type: "PROGRAM",
      program,
      stage: "RESEARCH_CONTENT",
      input: { mode: "BLANK" },
      ownerId: "actor-editor",
      selectedConceptVersionIds: ["c1-v1"],
      outputPlan: {
        revision: 1,
        includedConceptIds: ["c1"],
        requiredContentIds: ["o1", "o2", "o3", "o4"],
        optionalContentIds: [],
      },
      targetDate: null,
      createdAt: T0,
      updatedAt: T2,
    },
  },
  conceptVersionSchema: {
    schema: S.conceptVersionSchema,
    value: {
      id: "c1-v1",
      conceptId: "c1",
      number: 1,
      titleFa: "زیبایی ناتمام",
      titleEn: "Beautiful Imperfection",
      thesisFa:
        "نقص کوچک می‌تواند رد حضور انسان باشد؛ چیزی که تجربه را از یک محصول بی‌نام جدا می‌کند.",
      dropRationaleFa: "توجه به شخصیت ماده و انتخاب آگاهانه، پیوند این ایده با Taste است.",
      directions: ["EDITORIAL", "FILM", "MUSIC", "LANDING"],
      feedbackAppliedFa: null,
      createdAt: T0,
    },
  },
  conceptSchema: {
    schema: S.conceptSchema,
    value: {
      id: "c1",
      projectId: "p1",
      batchId: "batch-p1-1",
      activeVersionId: "c1-v1",
      reviewStatus: "APPROVED",
      freshness: "CURRENT",
      pendingRevisionId: null,
      replacesConceptId: null,
      rejectionReasonFa: null,
      rowVersion: 2,
      updatedAt: T1,
    },
  },
  contentVersionSchema: {
    schema: S.contentVersionSchema,
    value: {
      id: "o1-v1",
      contentId: "o1",
      conceptVersionId: "c1-v1",
      number: 1,
      titleFa: "روایت سردبیری: رد انگشت روی لعاب",
      bodyFa: "متن نمونهٔ فارسی برای نمایش؛ این محتوا واقعی نیست و ادعای پژوهش ندارد.",
      sourceIds: ["s1", "s2"],
      createdAt: T1,
    },
  },
  contentItemSchema: {
    schema: S.contentItemSchema,
    value: {
      id: "o1",
      projectId: "p1",
      conceptId: "c1",
      type: "EDITORIAL",
      activeVersionId: "o1-v1",
      reviewStatus: "IN_REVIEW",
      freshness: "CURRENT",
      editorialStatus: "PENDING",
      generationState: "SUCCEEDED",
      blockedReasonCode: null,
      blockedReasonFa: null,
      pendingRevisionId: null,
      rowVersion: 1,
      updatedAt: T1,
      // AC-P2.24 — the graph join travels as a complete pair or not at all.
      workflowDefinitionVersionId: "wfv_01",
      nodeKey: "CONTENT_GENERATION",
    },
  },
  panelCommentSchema: {
    schema: S.panelCommentSchema,
    value: {
      id: "cm1",
      target: { type: "CONCEPT", id: "c1", versionId: "c1-v1" },
      actorId: "actor-editor",
      bodyFa: "زاویهٔ روایی خوب است؛ لطفاً پیوند با Taste را صریح‌تر کنید.",
      createdAt: T1,
    },
  },
  panelDecisionSchema: {
    schema: S.panelDecisionSchema,
    value: {
      id: "d1",
      target: { type: "CONCEPT", id: "c1", versionId: "c1-v1" },
      actorId: "actor-editor",
      activeRole: "REVIEWER_EDITOR",
      outcome: "APPROVED",
      // The seed ships approvals with a null reason; the READ model tolerates
      // it and the write path rejects it (ADR-0019 D5).
      reasonFa: null,
      createdAt: T1,
    },
  },
  packageFileSchema: {
    schema: S.packageFileSchema,
    value: {
      path: "content/o5-v1.md",
      contentVersionId: "o5-v1",
      body: "# روایت سردبیری\n\nمتن نمونه.",
    },
  },
  packageSnapshotSchema: {
    schema: S.packageSnapshotSchema,
    value: {
      id: "pkg-p2-v1",
      familyId: "fam-p2",
      projectId: "p2",
      version: 1,
      planRevision: 1,
      status: "CURRENT",
      conceptVersionIds: ["c5-v1"],
      contentVersionIds: ["o5-v1", "o6-v1"],
      files: [
        { path: "README.md", contentVersionId: null, body: "# بستهٔ نمایشی" },
        { path: "content/o5-v1.md", contentVersionId: "o5-v1", body: "متن نمونه." },
      ],
      createdAt: T2,
      isMock: true,
    },
  },
  panelCalendarEntrySchema: {
    schema: S.panelCalendarEntrySchema,
    value: {
      id: "cal-p2",
      projectId: "p2",
      packageFamilyId: "fam-p2",
      packageVersionId: "pkg-p2-v1",
      titleFa: "انتشار بستهٔ زیبایی ناتمام",
      // ADR-0019 D7 — V2's "planned" is PLANNED with a date; "unscheduled" is
      // PLANNED with date === null. ADR-0015 D5's set is not amended.
      status: "PLANNED",
      date: "2026-09-12",
      endDate: null,
      startsAt: null,
      timezone: "Asia/Tehran",
      ownerId: "actor-editor",
      noteFa: "",
      rowVersion: 1,
    },
  },
  panelSnapshotSchema: {
    schema: S.panelSnapshotSchema,
    value: {
      schemaVersion: S.PANEL_SCHEMA_VERSION,
      snapshotKind: "drop.panel.mock.v2",
      revision: 1,
      clock: T0,
      discoverySeed: 1,
      projects: [],
      concepts: [],
      conceptVersions: [],
      content: [],
      contentVersions: [],
      comments: [],
      decisions: [],
      packages: [],
      calendar: [],
    },
  },

  // ---- ticket P2, V2 delta (ADR-0019 D8, D11, D17) ----
  panelEventSchema: {
    schema: S.panelEventSchema,
    value: {
      eventId: "evt_panel_01",
      schemaVersion: S.PANEL_SCHEMA_VERSION,
      workspaceId: "drop-demo",
      aggregateId: "c1",
      aggregateRevision: 2,
      correlationId: "corr_01",
      occurredAt: T1,
      type: "panel.concept.reviewed",
      data: { conceptId: "c1", versionId: "c1-v1" },
    },
  },
  calendarDateSchema: {
    schema: S.calendarDateSchema,
    // V2 seed: project p2 carries targetDate "2026-09-12".
    value: "2026-09-12",
  },
  subjectRefSchema: {
    schema: S.subjectRefSchema,
    // Whole-aggregate subject: an audit event need not name a version.
    value: { type: "PROGRAM", id: "prg_01" },
  },
  versionedSubjectRefSchema: {
    schema: S.versionedSubjectRefSchema,
    value: { type: "ARTIFACT", id: "art_01", versionId: "artv_01" },
  },
  targetSchema: {
    schema: S.targetSchema,
    value: { type: "CONCEPT", id: "cpt_01", versionId: "cptv_01" },
  },
  packageExportSchema: {
    schema: S.packageExportSchema,
    value: {
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // "PK\x03\x04" — a ZIP local file header
      filename: "DEMO_PACKAGE_p2_v1.zip",
      mediaType: "application/zip",
    },
  },
};
