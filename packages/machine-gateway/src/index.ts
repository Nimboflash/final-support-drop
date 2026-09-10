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
// ADR-0019 D3 — the V2 write surface, kept OFF the read-only PanelGateway.
export type { PanelCommandGateway } from "./panel-command-gateway";
export type { RevisionGateway } from "./revision-gateway";
// ADR-0019 D4 — the facade above the gateways; a member of none of them.
export type { ReviewApplicationService } from "./review-application-service";
export * from "./errors";
export * from "./conformance/index";
export * from "./conformance/review-path";

// The P3 mock world: all four adapters over ONE shared demo repository.
export * from "./mock/mock-world";

// ADR-0021 D4 — the real adapter, alongside the mock and behind the same seam.
export * from "./real/index";
