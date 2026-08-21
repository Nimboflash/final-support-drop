/**
 * Positive dependency-direction fixture carried from ticket 0.1 (05 §4):
 * ui <- web, workflow-ui <- web and pipeline <- web are ALLOWED edges and must
 * always compile. @drop/pipeline and @drop/workflow-ui stay frozen placeholders
 * (ADR-0018 D3) — importing their typed placeholder exports is the proof, not use.
 */
import { allowedEdges } from "@drop/pipeline";
import { packageInfo as workflowUiInfo } from "@drop/workflow-ui";
import { cn } from "@drop/ui";

export const webAllowedEdges: readonly string[] = [
  ...allowedEdges,
  workflowUiInfo.name,
  cn("@drop/ui"),
];
