/**
 * Workflow definition vocabulary — 06 §9.1 (version status), 07 §2 (canonical
 * node categories) and 07 §11 (allowed edge types). Transcribed, not derived.
 */

/** 06 §9.1 — `studio.workflow_definition_versions` status. */
export const WORKFLOW_VERSION_STATUSES = [
  "DRAFT",
  "VALIDATING",
  "PUBLISHED",
  "SUPERSEDED",
] as const;
export type WorkflowVersionStatus = (typeof WORKFLOW_VERSION_STATUSES)[number];

/**
 * 07 §2 — canonical node categories. `HUMAN_APPROVAL_GATE` is a node kind of
 * its own, which is what (18 §8) requires the graph to draw as a separate node.
 * Machines 01–05 are group boundaries, not executable nodes (07 §2).
 */
export const WORKFLOW_NODE_KINDS = [
  "START",
  "AUTOMATED_STAGE",
  "VALIDATION_GATE",
  "HUMAN_APPROVAL_GATE",
  "CONDITION",
  "SPECIALIZED_AGENT",
  "HUMAN_REQUEST",
  "SUBFLOW",
  "END",
] as const;
export type WorkflowNodeKind = (typeof WORKFLOW_NODE_KINDS)[number];

/** 07 §11 — the ten allowed edge types. Arbitrary graph cycles are invalid. */
export const WORKFLOW_EDGE_TYPES = [
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
] as const;
export type WorkflowEdgeType = (typeof WORKFLOW_EDGE_TYPES)[number];

/**
 * 07 §11 — the loop-back edge types (18 §8 requires loop-back paths as edges).
 * Derived membership is avoided: each name is transcribed from the edge list
 * above and its 07 §11 loop semantics.
 */
export const LOOP_BACK_EDGE_TYPES = [
  "FAILURE_RETRY",
  "CHANGES_REQUESTED",
  "REVISION",
] as const;
export type LoopBackEdgeType = (typeof LOOP_BACK_EDGE_TYPES)[number];

/** The five machines (01–05). Machine 06 does not exist (00 §4). */
export const MACHINE_NUMBERS = [1, 2, 3, 4, 5] as const;
export type MachineNumber = (typeof MACHINE_NUMBERS)[number];
