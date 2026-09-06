import { RUN_STATUSES, STAGE_STATUSES, type RunStatus } from "../vocabulary/stage-and-run";
import { PRODUCT_STAGES, type ProductStage } from "../vocabulary/product";

/**
 * The run/stage ↔ product-stage mapping (ADR-0019 D12).
 *
 * PROVISIONAL and OPEN. The machine build owns the real mapping; this table is
 * the panel's provisional reading and is a named P8 coordination item. It is
 * deliberately `null`-TOLERANT: a run status that does not imply a product
 * stage returns `null` rather than being forced into one, because guessing here
 * is exactly the "newly inferred mapping" V2 01 §5 forbids.
 *
 * Note what this is NOT: it does not renumber Machines 01–05, it does not claim
 * the five product stages correspond to five machines, and there is no
 * Machine 06.
 */

/**
 * Every `null` below is an open question for the machine team, listed verbatim
 * in the P8 handoff. They are `null` because the run status says something about
 * EXECUTION and nothing about which product phase the work item is in:
 * a DRAFT run can belong to a project already at CALENDAR, and a FAILED run does
 * not move the work item backwards.
 */
export const RUN_STATUS_TO_PRODUCT_STAGE: Readonly<Record<RunStatus, ProductStage | null>> = {
  DRAFT: "DRAFT",
  QUEUED: null,
  RUNNING: null,
  WAITING_INPUT: null,
  WAITING_APPROVAL: null,
  PAUSED: null,
  SUCCEEDED: null,
  FAILED: null,
  CANCELLED: null,
};

/** The open items this table hands to P8, in the order they appear above. */
export const PRODUCT_STAGE_OPEN_QUESTIONS: readonly string[] = [
  "QUEUED/RUNNING: which product stage a running machine job implies, if any",
  "WAITING_INPUT: whether a missing input blocks the product stage or only the run",
  "WAITING_APPROVAL: which review gate the wait belongs to, per stage identity",
  "PAUSED: whether a paused run freezes the product stage or leaves it unchanged",
  "SUCCEEDED: which product stage a completed run advances the work item to",
  "FAILED/CANCELLED: whether a terminal run moves the product stage at all",
];

export function toProductStage(runStatus: RunStatus): ProductStage | null {
  return RUN_STATUS_TO_PRODUCT_STAGE[runStatus];
}

/**
 * Proof the table stays exhaustive as vocabularies change: if ADR-0012 ever
 * gains a run status, this constant stops matching and the vocabulary test fails
 * rather than the mapping silently returning `undefined` at runtime.
 */
export const MAPPED_RUN_STATUS_COUNT = Object.keys(RUN_STATUS_TO_PRODUCT_STAGE).length;
export const RECORDED_RUN_STATUS_COUNT = RUN_STATUSES.length;
export const RECORDED_STAGE_STATUS_COUNT = STAGE_STATUSES.length;
export const RECORDED_PRODUCT_STAGE_COUNT = PRODUCT_STAGES.length;
