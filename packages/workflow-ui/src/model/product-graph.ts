import {
  outputTypeLabelFa,
  type PanelProject,
  type PanelSnapshot,
  type ReviewStatus,
} from "@drop/panel-domain";

/** A concept whose active version has no title still gets a name, not an id. */
const UNTITLED_CONCEPT_FA = "کانسپت بی‌عنوان";

/**
 * The execution graph, derived from domain DTOs (ADR-0019 D18).
 *
 * This module is PURE: no React, no React Flow, no canvas. That separation is
 * the rule 18 §6 states and ADR-0019 D18 restates — "Visual state is derived
 * from domain DTOs and never stored as independent truth in React Flow nodes."
 * Because the whole derivation lives here, the accessible stage list and the
 * canvas render from ONE view model and cannot drift (AC-P5.10).
 *
 * The node set is the EIGHT PRODUCT CLASSES. It is deliberately not the five
 * machines: V2 02 §9 forbids equating product stages with machines by position,
 * and nothing here is named for, keyed by, or ordered against a machine.
 */
export const PRODUCT_NODE_CLASSES = [
  "INPUT",
  "CONCEPT_GENERATION",
  "CONCEPT_REVIEW",
  "RESEARCH",
  "CONTENT_GENERATION",
  "CONTENT_REVIEW",
  "PACKAGE",
  "CALENDAR",
] as const;
export type ProductNodeClass = (typeof PRODUCT_NODE_CLASSES)[number];

export type NodeState =
  | "PENDING"
  | "RUNNING"
  | "AWAITING_REVIEW"
  | "DONE"
  | "BLOCKED"
  | "REJECTED";

export interface ProductNode {
  readonly id: string;
  readonly nodeClass: ProductNodeClass;
  readonly labelFa: string;
  readonly state: NodeState;
  /** Which concept branch this node belongs to; null for shared spine nodes. */
  readonly groupId: string | null;
  /** The domain entity this node is a view of, for the inspector. */
  readonly subject: { readonly kind: "PROJECT" | "CONCEPT" | "CONTENT" | "PACKAGE" | "CALENDAR"; readonly id: string } | null;
  readonly attempts: number;
  readonly outputCount: number;
  /** Rejected and discarded branches END VISIBLY (V2 02 §9). */
  readonly terminal: boolean;
  /**
   * The definition's machine number, when it supplies one. Absent otherwise —
   * NEVER inferred from position (ADR-0019 D18).
   */
  readonly machineNumber: number | null;
  readonly reasonFa: string | null;
}

export interface ProductEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /**
   * A revision edge is RENDERED FROM VERSION LINEAGE in execution mode. It is
   * not a definition loop-back edge and carries no iteration cap: V2 01 §4
   * allows "targeted revisions without a fixed one-round limit", while
   * `workflowEdgeDefinitionSchema` requires `maxIterations` on a definition
   * loop-back. Conflating the two is the trap ADR-0019 D18 exists to close.
   */
  readonly kind: "FLOW" | "REVISION";
  readonly labelFa: string | null;
}

export interface ProductGraph {
  readonly nodes: readonly ProductNode[];
  readonly edges: readonly ProductEdge[];
  /** One group per approved concept (V2 02 §9). */
  readonly groups: readonly { readonly id: string; readonly labelFa: string }[];
}

function reviewState(status: ReviewStatus, blocked: boolean): NodeState {
  if (blocked) return "BLOCKED";
  switch (status) {
    case "APPROVED":
      return "DONE";
    case "REJECTED":
      return "REJECTED";
    case "IN_REVIEW":
    case "REVISION_REQUESTED":
      return "AWAITING_REVIEW";
    case "DRAFT":
      return "PENDING";
  }
}

export function buildProductGraph(world: PanelSnapshot, project: PanelProject): ProductGraph {
  const nodes: ProductNode[] = [];
  const edges: ProductEdge[] = [];
  const groups: { id: string; labelFa: string }[] = [];

  const concepts = world.concepts.filter((c) => c.projectId === project.id);
  const content = world.content.filter((c) => c.projectId === project.id);

  const push = (node: ProductNode) => nodes.push(node);
  const link = (source: string, target: string, kind: ProductEdge["kind"] = "FLOW", labelFa: string | null = null) =>
    edges.push({ id: `${source}->${target}${kind === "REVISION" ? ":rev" : ""}`, source, target, kind, labelFa });

  /* -------- the shared spine -------- */
  const inputId = "n:input";
  push({
    id: inputId,
    nodeClass: "INPUT",
    labelFa: project.input.mode === "BLANK" ? "ورودی — بدون ورودی" : "ورودی — با رفرنس",
    state: "DONE",
    groupId: null,
    subject: { kind: "PROJECT", id: project.id },
    attempts: 1,
    outputCount: project.input.mode === "BLANK" ? 0 : project.input.references.length,
    terminal: false,
    machineNumber: null,
    reasonFa: null,
  });

  const genId = "n:concept-generation";
  push({
    id: genId,
    nodeClass: "CONCEPT_GENERATION",
    labelFa: "تولید کانسپت",
    state: concepts.length === 0 ? "PENDING" : "DONE",
    groupId: null,
    subject: { kind: "PROJECT", id: project.id },
    attempts: 1,
    outputCount: concepts.length,
    terminal: false,
    machineNumber: null,
    reasonFa: null,
  });
  link(inputId, genId);

  /* -------- one review node per concept, one group per approved concept -------- */
  const selected = new Set(project.selectedConceptVersionIds);

  for (const concept of concepts) {
    const version = world.conceptVersions.find((v) => v.id === concept.activeVersionId);
    const reviewId = `n:concept-review:${concept.id}`;
    const rejected = concept.reviewStatus === "REJECTED";

    push({
      id: reviewId,
      nodeClass: "CONCEPT_REVIEW",
      labelFa: `بررسی کانسپت — ${version?.titleFa ?? UNTITLED_CONCEPT_FA}`,
      state: reviewState(concept.reviewStatus, false),
      groupId: null,
      subject: { kind: "CONCEPT", id: concept.id },
      attempts: world.conceptVersions.filter((v) => v.conceptId === concept.id).length,
      outputCount: 1,
      // A rejected branch ends visibly and grows no Research node beneath it.
      terminal: rejected,
      machineNumber: null,
      reasonFa: concept.rejectionReasonFa,
    });
    link(genId, reviewId);

    // Revision lineage: more than one version means the card went back for a
    // revision, so the loop edge is DERIVED rather than declared.
    if (world.conceptVersions.filter((v) => v.conceptId === concept.id).length > 1) {
      link(reviewId, genId, "REVISION", "بازنگری");
    }

    if (rejected) continue;

    const branchContent = content.filter((item) => item.conceptId === concept.id);
    const isSelected = selected.has(concept.activeVersionId);
    if (!isSelected && branchContent.length === 0) continue;

    groups.push({ id: concept.id, labelFa: version?.titleFa ?? UNTITLED_CONCEPT_FA });

    const researchId = `n:research:${concept.id}`;
    push({
      id: researchId,
      nodeClass: "RESEARCH",
      labelFa: "تحقیق",
      state: branchContent.length === 0 ? "PENDING" : "DONE",
      groupId: concept.id,
      subject: { kind: "CONCEPT", id: concept.id },
      attempts: 1,
      outputCount: branchContent.length,
      terminal: false,
      machineNumber: null,
      reasonFa: null,
    });
    link(reviewId, researchId);

    for (const item of branchContent) {
      const blocked = item.generationState === "BLOCKED";
      const itemGenId = `n:content-generation:${item.id}`;
      const itemReviewId = `n:content-review:${item.id}`;

      push({
        id: itemGenId,
        nodeClass: "CONTENT_GENERATION",
        labelFa: `تولید محتوا — ${outputTypeLabelFa(item.type)}`,
        state: blocked
          ? "BLOCKED"
          : item.generationState === "RUNNING"
            ? "RUNNING"
            : item.generationState === "FAILED"
              ? "BLOCKED"
              : "DONE",
        groupId: concept.id,
        subject: { kind: "CONTENT", id: item.id },
        attempts: world.contentVersions.filter((v) => v.contentId === item.id).length,
        outputCount: 1,
        terminal: false,
        machineNumber: null,
        reasonFa: item.blockedReasonFa,
      });
      link(researchId, itemGenId);

      push({
        id: itemReviewId,
        nodeClass: "CONTENT_REVIEW",
        labelFa: `بررسی محتوا — ${outputTypeLabelFa(item.type)}`,
        state: reviewState(item.reviewStatus, blocked),
        groupId: concept.id,
        subject: { kind: "CONTENT", id: item.id },
        attempts: 1,
        outputCount: 1,
        terminal: item.reviewStatus === "REJECTED",
        machineNumber: null,
        reasonFa: item.blockedReasonFa,
      });
      link(itemGenId, itemReviewId);

      // Localized revision loop: back to ITS OWN generation step, never to a
      // shared one (V2 02 §9).
      if (
        item.pendingRevisionId !== null ||
        world.contentVersions.filter((v) => v.contentId === item.id).length > 1
      ) {
        link(itemReviewId, itemGenId, "REVISION", "بازنگری");
      }
    }
  }

  /* -------- package join and calendar -------- */
  const packageId = "n:package";
  const required = project.outputPlan.requiredContentIds;
  const packageSnapshot = world.packages.find((p) => p.projectId === project.id);
  push({
    id: packageId,
    nodeClass: "PACKAGE",
    // «خروجی», never «بسته» — ADR-0020 D5 removed that noun from the interface,
    // and a graph node is as much interface as a card is.
    labelFa: "خروجی",
    state: packageSnapshot === undefined ? "PENDING" : "DONE",
    groupId: null,
    subject: packageSnapshot === undefined ? null : { kind: "PACKAGE", id: packageSnapshot.id },
    attempts: packageSnapshot === undefined ? 0 : 1,
    outputCount: packageSnapshot?.files.length ?? 0,
    terminal: false,
    machineNumber: null,
    reasonFa: null,
  });

  // The join waits only on REQUIRED content: optional outputs and unselected
  // candidates are excluded by construction (V2 02 §9).
  for (const contentId of required) {
    const reviewId = `n:content-review:${contentId}`;
    if (nodes.some((node) => node.id === reviewId)) link(reviewId, packageId);
  }

  const calendarEntry = world.calendar.find((entry) => entry.projectId === project.id);
  const calendarId = "n:calendar";
  push({
    id: calendarId,
    nodeClass: "CALENDAR",
    // The calendar edge means PLAN ENTRY CREATION, never publication.
    labelFa:
      calendarEntry === undefined
        ? "تقویم — هنوز ساخته نشده"
        : calendarEntry.date === null
          ? "تقویم — آماده برنامه‌ریزی"
          : "تقویم — برنامه‌ریزی‌شده",
    state: calendarEntry === undefined ? "PENDING" : "DONE",
    groupId: null,
    subject: calendarEntry === undefined ? null : { kind: "CALENDAR", id: calendarEntry.id },
    attempts: calendarEntry === undefined ? 0 : 1,
    outputCount: calendarEntry === undefined ? 0 : 1,
    terminal: false,
    machineNumber: null,
    reasonFa: null,
  });
  link(packageId, calendarId);

  return { nodes, edges, groups };
}
