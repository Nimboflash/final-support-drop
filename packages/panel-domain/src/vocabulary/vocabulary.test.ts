import { describe, expect, it } from "vitest";
import {
  ACTOR_ROLES,
  ACTOR_TYPES,
  APPROVAL_DECISIONS,
  AUDIT_EVENT_NAMES,
  BANNED_GATE_COMMAND_VERBS,
  CALENDAR_ITEM_STATUSES,
  CAPABILITIES,
  LENS_STATUSES,
  PROGRAM_STATUSES,
  PROJECT_STATUSES,
  REQUEST_STATUSES,
  RUN_COMMAND_VERBS,
  RUN_STATUSES,
  SELF_APPROVAL_MODES,
  SOURCE_LIFECYCLE_STATES,
  STAGE_STATUSES,
  TRANSPORT_ONLY_FRAMES,
  WAITING_REASON_CODES,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_KINDS,
  WORKFLOW_VERSION_STATUSES,
} from "./index";

/**
 * Seam A — exact-membership tests (AC-P2.2, AC-P2.3, AC-P2.4, AC-P2.5).
 *
 * Every expected value below is transcribed from the recorded decision named in
 * its describe block, never derived from the code under test (tautology ban,
 * testing-strategy §2.2). A rename, addition or omission fails here.
 */

describe("stage and run vocabulary (ADR-0012 D1/D2)", () => {
  it("the stage enum is exactly the 14 recorded states", () => {
    expect([...STAGE_STATUSES]).toEqual([
      "DRAFT",
      "READY",
      "QUEUED",
      "RUNNING",
      "WAITING_FOR_DEPENDENCY",
      "WAITING_FOR_INPUT",
      "WAITING_FOR_APPROVAL",
      "PAUSED",
      "FAILED_RETRYABLE",
      "FAILED_FINAL",
      "SUCCEEDED",
      "SKIPPED",
      "CANCELLED",
      "SUPERSEDED",
    ]);
    expect(STAGE_STATUSES).toHaveLength(14);
  });

  it("the run enum is exactly the 9 recorded states (ADR-0012 D2)", () => {
    expect([...RUN_STATUSES]).toEqual([
      "DRAFT",
      "QUEUED",
      "RUNNING",
      "WAITING_INPUT",
      "WAITING_APPROVAL",
      "PAUSED",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]);
    expect(RUN_STATUSES).toHaveLength(9);
  });

  it("no stage-state name leaks into the run enum and vice versa (ADR-0012 D2)", () => {
    // WAITING_FOR_INPUT / WAITING_FOR_APPROVAL are stage names; the run enum
    // uses the shorter WAITING_INPUT / WAITING_APPROVAL. Mixing them is the
    // single most likely transcription slip, so it is pinned explicitly.
    expect(RUN_STATUSES).not.toContain("WAITING_FOR_INPUT");
    expect(RUN_STATUSES).not.toContain("WAITING_FOR_APPROVAL");
    expect(STAGE_STATUSES).not.toContain("WAITING_INPUT");
    expect(STAGE_STATUSES).not.toContain("WAITING_APPROVAL");
    expect(STAGE_STATUSES).not.toContain("FAILED");
  });

  it("the waiting reason-code set includes PROVIDER_CONFIGURATION_REQUIRED (ADR-0012 D4)", () => {
    expect(WAITING_REASON_CODES).toContain("PROVIDER_CONFIGURATION_REQUIRED");
  });

  it("the runtime command set is exactly ADR-0013 D2's remaining eight verbs", () => {
    expect([...RUN_COMMAND_VERBS]).toEqual([
      "START_RUN",
      "PAUSE_RUN",
      "RESUME_RUN",
      "CANCEL_RUN",
      "RETRY_STAGE",
      "SUBMIT_INPUT",
      "SKIP_STAGE",
      "CREATE_RERUN",
    ]);
  });
});

describe("approval vocabulary (ADR-0013)", () => {
  it("the decision enum is exactly the four recorded decisions", () => {
    expect([...APPROVAL_DECISIONS]).toEqual([
      "APPROVED",
      "CHANGES_REQUESTED",
      "REJECTED",
      "ESCALATED",
    ]);
  });

  it("the self-approval modes are exactly the 11 §6.1 modes (ADR-0013 D5)", () => {
    expect([...SELF_APPROVAL_MODES]).toEqual([
      "AUTHORIZED_ROLE",
      "SELF_APPROVAL_ALLOWED",
      "DISTINCT_REVIEWER_REQUIRED",
    ]);
  });

  it("the gate verbs removed by ADR-0013 D2 are recorded as banned, not as commands", () => {
    expect([...BANNED_GATE_COMMAND_VERBS]).toEqual([
      "APPROVE_GATE",
      "REQUEST_CHANGES",
      "ESCALATE_GATE",
    ]);
    for (const verb of BANNED_GATE_COMMAND_VERBS) {
      expect(RUN_COMMAND_VERBS).not.toContain(verb);
    }
  });
});

describe("audit event vocabulary (10 §9 + ADR-0014 D1)", () => {
  // The 10 §9 taxonomy, transcribed in document order.
  const TAXONOMY_10_9 = [
    "project.created",
    "program.created",
    "workflow.version.published",
    "run.started",
    "stage.queued",
    "stage.started",
    "stage.waiting_for_input",
    "stage.waiting_for_approval",
    "stage.succeeded",
    "stage.failed_retryable",
    "stage.failed_final",
    "approval.requested",
    "approval.decided",
    "artifact.version.created",
    "artifact.validation.failed",
    "artifact.approved",
    "research.plan.frozen",
    "research.slot.blocked",
    "research.request.created",
    "concept.selected",
    "concept_bible.published",
    "lens.created",
    "output_manifest.published",
    "request.assigned",
    "request.blocked",
    "feedback.submitted",
    "revision.requested",
    "handoff.declared_complete",
  ];

  // The seven added by ADR-0014 D1.
  const ADDED_BY_ADR_0014 = [
    "run.completed",
    "run.failed",
    "run.cancelled",
    "run.paused",
    "run.resumed",
    "stage.skipped",
    "stage.cancelled",
  ];

  it("equals the 10 §9 taxonomy plus the seven ADR-0014 additions", () => {
    expect([...AUDIT_EVENT_NAMES].sort()).toEqual(
      [...TAXONOMY_10_9, ...ADDED_BY_ADR_0014].sort(),
    );
    expect(AUDIT_EVENT_NAMES).toHaveLength(35);
  });

  it("heartbeat is transport-only and is never an AuditEvent name (ADR-0014 D1)", () => {
    expect(AUDIT_EVENT_NAMES).not.toContain("heartbeat");
    expect([...TRANSPORT_ONLY_FRAMES]).toEqual(["heartbeat"]);
  });

  it("carries no doc 18 §9 event-family name as an AuditEvent name", () => {
    // 18 §9 sketches workflow.* families; ADR-0017 D4 rules the recorded
    // taxonomy is the presentation vocabulary. The mapping is documented, not
    // silently merged (P2 body, mechanic 4).
    for (const family of [
      "workflow.run.created",
      "workflow.run.started",
      "workflow.stage.started",
      "workflow.stage.progressed",
      "workflow.stage.blocked",
      "workflow.stage.failed",
      "workflow.stage.completed",
      "approval.resolved",
      "artifact.created",
      "workflow.run.completed",
      "workflow.run.failed",
    ]) {
      expect(AUDIT_EVENT_NAMES).not.toContain(family);
    }
  });
});

describe("ADR-0015 D5 canonical status enums", () => {
  it("projects", () => {
    expect([...PROJECT_STATUSES]).toEqual(["ACTIVE", "ARCHIVED"]);
  });

  it("programs", () => {
    expect([...PROGRAM_STATUSES]).toEqual(["DRAFT", "IN_PIPELINE", "APPROVED", "ARCHIVED"]);
  });

  it("weekly lenses", () => {
    expect([...LENS_STATUSES]).toEqual([
      "DRAFT",
      "IN_PIPELINE",
      "APPROVED",
      "COMMISSIONED",
      "ARCHIVED",
    ]);
  });

  it("requests", () => {
    expect([...REQUEST_STATUSES]).toEqual([
      "DRAFT",
      "OPEN",
      "BLOCKED",
      "IN_PROGRESS",
      "IN_REVIEW",
      "CHANGES_REQUESTED",
      "APPROVED",
      "COMPLETED",
      "CANCELLED",
    ]);
  });

  it("calendar items", () => {
    expect([...CALENDAR_ITEM_STATUSES]).toEqual(["PLANNED", "CONFIRMED", "DONE", "CANCELLED"]);
  });
});

describe("workflow vocabulary (06 §9.1, 07 §2, 07 §11)", () => {
  it("definition-version statuses are exactly the 06 §9.1 four", () => {
    expect([...WORKFLOW_VERSION_STATUSES]).toEqual([
      "DRAFT",
      "VALIDATING",
      "PUBLISHED",
      "SUPERSEDED",
    ]);
  });

  it("node kinds are exactly the 07 §2 canonical node categories", () => {
    expect([...WORKFLOW_NODE_KINDS]).toEqual([
      "START",
      "AUTOMATED_STAGE",
      "VALIDATION_GATE",
      "HUMAN_APPROVAL_GATE",
      "CONDITION",
      "SPECIALIZED_AGENT",
      "HUMAN_REQUEST",
      "SUBFLOW",
      "END",
    ]);
  });

  it("HUMAN_APPROVAL_GATE is a node kind of its own (18 §8)", () => {
    expect(WORKFLOW_NODE_KINDS).toContain("HUMAN_APPROVAL_GATE");
  });

  it("edge types are exactly the 07 §11 allowed ten", () => {
    expect([...WORKFLOW_EDGE_TYPES]).toEqual([
      "SUCCESS",
      "FAILURE_RETRY",
      "FAILURE_FINAL",
      "CONDITION_TRUE",
      "CONDITION_FALSE",
      "APPROVED",
      "CHANGES_REQUESTED",
      "REJECTED",
      "ESCALATED",
      "REVISION",
    ]);
    expect(WORKFLOW_EDGE_TYPES).toHaveLength(10);
  });
});

describe("identity vocabulary (11 §2, §3, §4)", () => {
  it("actor types are exactly the 11 §2 three", () => {
    expect([...ACTOR_TYPES]).toEqual(["HUMAN", "MACHINE", "SERVICE"]);
  });

  it("roles are exactly the 11 §3 canonical seven", () => {
    expect([...ACTOR_ROLES]).toEqual([
      "WORKSPACE_OWNER",
      "DROP_GUARDIAN",
      "PROJECT_LEAD",
      "REVIEWER_EDITOR",
      "CONTRIBUTOR",
      "VIEWER",
      "TECHNICAL_MAINTAINER",
    ]);
  });

  it("capabilities are the 11 §4 initial list plus the two ADR-recorded additions", () => {
    expect([...CAPABILITIES]).toEqual([
      "FA_EDITORIAL",
      "CULTURAL_REVIEW",
      "HISTORICAL_REVIEW",
      "RIGHTS_REVIEW",
      "SOURCE_REGISTRY_REVIEW",
      "WORKFLOW_TEMPLATE_EDIT",
      "WORKFLOW_TEMPLATE_PUBLISH",
      "PROMPT_CONFIGURE",
      "MODEL_CONFIGURE",
      "EXTERNAL_ARTIFACT_SUBMIT",
      "OPERATOR_GUIDE_ACCESS",
      // ADR-0012 D5 adds RUN_STAGE_SKIP to the 11 §4 list;
      // ADR-0013 D6 adds RAW_RESPONSE_READ.
      "RUN_STAGE_SKIP",
      "RAW_RESPONSE_READ",
    ]);
  });
});

describe("research vocabulary (06 §5)", () => {
  it("source registry lifecycle is exactly the 06 §5 five", () => {
    expect([...SOURCE_LIFECYCLE_STATES]).toEqual([
      "CANDIDATE",
      "VALIDATED",
      "ACTIVE",
      "DEACTIVATED",
      "ARCHIVED",
    ]);
  });
});
