/**
 * @drop/panel-domain — the panel contract freeze (ticket P2).
 *
 * Panel-facing domain DTOs and their Zod validation schemas (18 §10, §11.2).
 * Pure TypeScript plus Zod: no framework, no transport, no React, no Next.js
 * and no React Flow (18 §6; enforced by the P2 ESLint zone).
 *
 * Every enumeration here is transcribed from a recorded decision and pinned by
 * exact-membership tests (ADR-0017 D4). Where no authority document enumerates
 * a set, the schema stays open and the gap is labelled PROVISIONAL / OPEN for
 * P8 coordination rather than closed by invention (18 §9 last paragraph).
 */

export * from "./vocabulary/index";
export * from "./schemas/common";
export * from "./schemas/machine";
export * from "./schemas/workflow";
export * from "./schemas/run";
export * from "./schemas/command";
export * from "./schemas/artifact";
export * from "./schemas/audit";
export * from "./schemas/panel-entities";
export * from "./schemas/panel-product";
export * from "./schemas/panel-event";

/**
 * The projection layer (ADR-0019 D5, D6, D12) — the only place the V2 product
 * vocabularies meet the recorded ADR vocabularies. Nothing else translates.
 */
export * from "./projection/review-status";
export * from "./projection/product-stage";
export * from "./projection/wire-codec";
export * from "./projection/output-type-label";
