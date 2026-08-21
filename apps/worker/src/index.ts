/**
 * apps/worker — dispatch worker entry. Safe placeholder (ticket 0.1 AC-5):
 * proves the pipeline <- worker-adapter edge compiles. BullMQ wiring is ticket 0.10;
 * jobs will carry stable IDs only (05 §4).
 */
import { packageInfo as pipelineInfo } from "@drop/pipeline";
import { packageInfo as configInfo } from "@drop/config";
import { packageInfo as observabilityInfo } from "@drop/observability";

export const workerBoundary: readonly string[] = [
  pipelineInfo.name,
  configInfo.name,
  observabilityInfo.name,
];
