/**
 * @drop/workflow-ui — the execution graph (ticket P5).
 *
 * The DERIVATION lives in `model/` and is pure: no React, no React Flow, no
 * canvas. `canvas/` renders it. That split is what makes 18 §6's rule — React
 * Flow objects never become the integration contract — structural rather than a
 * convention, and it is why the accessible stage list and the canvas cannot
 * drift: both render the same `ProductGraph`.
 *
 * `@xyflow/react` is imported ONLY inside this package; an ESLint zone enforces
 * that boundary.
 */
export * from "./model/product-graph";
export * from "./model/layout";
export * from "./canvas/node-presentation";
export { StageList } from "./canvas/stage-list";
export { GraphCanvas } from "./canvas/graph-canvas";
