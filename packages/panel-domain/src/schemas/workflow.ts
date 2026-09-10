import { z } from "zod";
import {
  ACTOR_ROLES,
  CAPABILITIES,
  MACHINE_NUMBERS,
  SELF_APPROVAL_MODES,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_KINDS,
  WORKFLOW_VERSION_STATUSES,
} from "../vocabulary/index";
import {
  displayTextSchema,
  idSchema,
  instantSchema,
  rowVersionSchema,
  stableCodeSchema,
} from "./common";

/**
 * Workflow definition DTOs — 06 §9.1 (tables and constraints), 07 §2 (node
 * categories), 07 §11 (edge types), 11 §6 (gate policy), 18 §8 (what the graph
 * must display).
 *
 * These are *semantic* definitions only. Canvas coordinates are deliberately
 * absent: 06 §9.1 keeps `studio.workflow_layouts` separate from semantics, and
 * (18 §6) forbids React Flow objects from becoming the integration contract.
 */

/** The node kinds ADR-0012 D5 calls gates: they can never be skipped. */
const GATE_NODE_KINDS = ["VALIDATION_GATE", "HUMAN_APPROVAL_GATE"] as const;

/** 11 §6 — the approval policy a HUMAN_APPROVAL_GATE references. */
export const gatePolicySchema = z
  .object({
    gateKey: stableCodeSchema,
    /** ADR-0013 D3 — N means N distinct HUMAN actors. */
    minimumApprovals: z.int().min(1, "MINIMUM_APPROVALS_MUST_BE_AT_LEAST_ONE"),
    selfApprovalMode: z.enum(SELF_APPROVAL_MODES),
    authorizedRoles: z.array(z.enum(ACTOR_ROLES)),
    authorizedCapabilities: z.array(z.enum(CAPABILITIES)),
  })
  .strict()
  .superRefine((policy, ctx) => {
    // 11 §4 — "An approval policy may require role, capability, or both."
    // A policy authorizing neither can never be satisfied: fail closed (00 §4).
    if (policy.authorizedRoles.length === 0 && policy.authorizedCapabilities.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["authorizedRoles"],
        message: "GATE_POLICY_MUST_AUTHORIZE_A_ROLE_OR_CAPABILITY",
      });
    }
  });
export type GatePolicy = z.infer<typeof gatePolicySchema>;

export const workflowNodeDefinitionSchema = z
  .object({
    id: idSchema,
    /** 06 §9.1 — stable node key, unique inside a version. */
    nodeKey: stableCodeSchema,
    kind: z.enum(WORKFLOW_NODE_KINDS),
    title: displayTextSchema,
    /**
     * 07 §2 — Machines 01–05 are group boundaries, not executable nodes; an
     * executable node names the machine group it belongs to.
     */
    machineNumber: z
      .union([
        z.literal(MACHINE_NUMBERS[0]),
        z.literal(MACHINE_NUMBERS[1]),
        z.literal(MACHINE_NUMBERS[2]),
        z.literal(MACHINE_NUMBERS[3]),
        z.literal(MACHINE_NUMBERS[4]),
      ])
      .optional(),
    stageKey: stableCodeSchema.optional(),
    /** ADR-0012 D6 — `SUBMIT_INPUT` may satisfy an automated stage only here. */
    manualFallbackAllowed: z.boolean().optional(),
    /** ADR-0012 D5 — the published definition marks a stage skippable. */
    skippable: z.boolean().optional(),
    /** 06 §9.1 — every gate references a real approval policy or rule set. */
    gatePolicy: gatePolicySchema.optional(),
  })
  .strict()
  .superRefine((node, ctx) => {
    const isGate = (GATE_NODE_KINDS as readonly string[]).includes(node.kind);

    // ADR-0012 D5 — "workflow validation (07 §13) must check that skippable
    // flags and manual-fallback flags never appear on gates". Gates cannot be
    // manually skipped: missing approvals and validators must block (00 §4).
    if (isGate && node.skippable === true) {
      ctx.addIssue({
        code: "custom",
        path: ["skippable"],
        message: "GATE_NODE_MUST_NOT_BE_SKIPPABLE",
      });
    }
    if (isGate && node.manualFallbackAllowed === true) {
      ctx.addIssue({
        code: "custom",
        path: ["manualFallbackAllowed"],
        message: "GATE_NODE_MUST_NOT_ALLOW_MANUAL_FALLBACK",
      });
    }
    // 06 §9.1 — "Every gate references a real approval policy or rule set."
    if (node.kind === "HUMAN_APPROVAL_GATE" && node.gatePolicy === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["gatePolicy"],
        message: "HUMAN_APPROVAL_GATE_REQUIRES_A_GATE_POLICY",
      });
    }
  });
export type WorkflowNodeDefinition = z.infer<typeof workflowNodeDefinitionSchema>;

export const workflowEdgeDefinitionSchema = z
  .object({
    id: idSchema,
    sourceNodeKey: stableCodeSchema,
    targetNodeKey: stableCodeSchema,
    /** 07 §11 — only the ten allowed edge types. */
    edgeType: z.enum(WORKFLOW_EDGE_TYPES),
    condition: z.string().max(500).optional(),
    priority: z.int().nonnegative().optional(),
    /** 07 §11 — every loop edge defines a maximum-iterations budget. */
    maxIterations: z.int().min(1, "MAX_ITERATIONS_MUST_BE_POSITIVE").optional(),
    /** 18 §8 — loop-back paths are drawn as edges. */
    isLoopBack: z.boolean().optional(),
  })
  .strict()
  .superRefine((edge, ctx) => {
    // 07 §11 — "Every loop edge defines ... Maximum iterations."
    if (edge.isLoopBack === true && edge.maxIterations === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["maxIterations"],
        message: "LOOP_BACK_EDGE_REQUIRES_MAX_ITERATIONS",
      });
    }
  });
export type WorkflowEdgeDefinition = z.infer<typeof workflowEdgeDefinitionSchema>;

export const workflowDefinitionVersionSchema = z
  .object({
    id: idSchema,
    workflowDefinitionId: idSchema,
    /** 06 §9.1 — unique `(workflow_definition_id, version_number)`. */
    versionNumber: z.int().min(1, "VERSION_NUMBER_MUST_BE_POSITIVE"),
    semanticVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "SEMANTIC_VERSION_MUST_BE_SEMVER"),
    checksum: z.string().min(1, "CHECKSUM_REQUIRED"),
    status: z.enum(WORKFLOW_VERSION_STATUSES),
    nodes: z.array(workflowNodeDefinitionSchema).min(1, "VERSION_REQUIRES_NODES"),
    edges: z.array(workflowEdgeDefinitionSchema),
    publishedAt: instantSchema.optional(),
    publishedByActorId: idSchema.optional(),
  })
  .strict()
  .superRefine((version, ctx) => {
    // 06 §9.1 — "Node keys unique inside a version."
    const seen = new Set<string>();
    version.nodes.forEach((node, index) => {
      if (seen.has(node.nodeKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "nodeKey"],
          message: "NODE_KEYS_MUST_BE_UNIQUE_WITHIN_A_VERSION",
        });
      }
      seen.add(node.nodeKey);
    });

    // 06 §9.1 — "At least one start and one terminal node."
    if (!version.nodes.some((n) => n.kind === "START")) {
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "VERSION_REQUIRES_A_START_NODE",
      });
    }
    if (!version.nodes.some((n) => n.kind === "END")) {
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "VERSION_REQUIRES_A_TERMINAL_NODE",
      });
    }

    // An edge that names a node the version does not contain cannot be drawn
    // (18 §8) and would break run inspection.
    version.edges.forEach((edge, index) => {
      if (!seen.has(edge.sourceNodeKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "sourceNodeKey"],
          message: "EDGE_REFERENCES_UNKNOWN_NODE_KEY",
        });
      }
      if (!seen.has(edge.targetNodeKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "targetNodeKey"],
          message: "EDGE_REFERENCES_UNKNOWN_NODE_KEY",
        });
      }
    });

    // 06 §9.1 / 00 §4 — published versions are immutable and must be complete:
    // a PUBLISHED version without its publication provenance is unusable for
    // the manifest freeze (07 §6) the machine build will inherit.
    if (version.status === "PUBLISHED" && version.publishedAt === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "PUBLISHED_VERSION_REQUIRES_PUBLISHED_AT",
      });
    }
  });
export type WorkflowDefinitionVersion = z.infer<typeof workflowDefinitionVersionSchema>;

export const workflowDefinitionSchema = z
  .object({
    id: idSchema,
    workspaceId: idSchema,
    /** 06 §9.1 — stable workflow identity, e.g. Deep Program or Weekly Lens. */
    key: stableCodeSchema,
    title: displayTextSchema,
    latestPublishedVersionId: idSchema.optional(),
    versions: z.array(workflowDefinitionVersionSchema),
    rowVersion: rowVersionSchema,
  })
  .strict();
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
