/**
 * Positive dependency-direction fixture carried from ticket 0.1 (05 §4):
 * ui <- web, workflow-ui <- web and pipeline <- web are ALLOWED edges and must
 * always compile. @drop/pipeline stays a frozen placeholder (ADR-0018 D3), so
 * importing its typed placeholder export is the proof, not use. @drop/workflow-ui
 * was ACTIVATED by ticket P5 (ADR-0018 D3 names it a panel package), so the edge
 * is proven against a real export instead.
 */
import { allowedEdges } from "@drop/pipeline";
import { PRODUCT_NODE_CLASSES } from "@drop/workflow-ui";
import { cn } from "@drop/ui";

export const webAllowedEdges: readonly string[] = [
  ...allowedEdges,
  ...PRODUCT_NODE_CLASSES,
  cn("@drop/ui"),
];
