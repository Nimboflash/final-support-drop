// Ticket P10 slice 1 — the real adapter, alongside the mock (ADR-0021 D4).
export type {
  MachineApproveInput,
  MachineBuildInput,
  MachineHttpPort,
  MachineHttpResult,
  MachineRespondInput,
  MachineWritePrecondition,
} from "./machine-http-port";
export {
  createMachineClient,
  isMachineSessionId,
  machineWriteError,
  MACHINE_SESSION_ID,
  type MachineClient,
} from "./machine-client";
export type { PanelWorld, PanelWorldPolicy } from "./panel-world";
export { createRealWorld, type RealWorld, type RealWorldOptions } from "./real-world";
export type {
  MachineReviewPort,
  MachineReviewDecision,
  MachineReviewOutcome,
  MachineReviewLog,
  MachineSessionNotes,
  MachineConceptDecision,
  MachineConceptRequest,
} from "./review-store";
