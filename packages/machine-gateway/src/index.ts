/**
 * @drop/machine-gateway — the seam between the panel and machine data.
 *
 * `MachineGateway` is the (18 §6) required rule, committed verbatim.
 * `PanelGateway` is the companion read-only contract of ADR-0018 D1.
 * Neither carries a transport: the mock adapter (P3) and a future
 * `RealMachineGateway` (P8, machine build) implement the same interfaces and
 * pass the same conformance suite.
 */
export type { MachineGateway } from "./machine-gateway";
export type { PanelGateway } from "./panel-gateway";
export * from "./errors";
export * from "./conformance/index";
