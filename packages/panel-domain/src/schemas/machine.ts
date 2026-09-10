import { z } from "zod";
import { MACHINE_NUMBERS } from "../vocabulary/index";
import { displayTextSchema, idSchema, instantSchema, stableCodeSchema } from "./common";

/**
 * MachineSummary — the panel's view of Machines 01–05 (18 §7.1).
 *
 * The machines themselves are a separate build (18 §2). This DTO carries only
 * what the panel displays: identity, capability advertisement and connection
 * health, including the disconnected representation scenario 13 needs
 * (18 §7.2.13).
 */

/**
 * PROVISIONAL (18 §9 "health, version, and compatibility reporting").
 *
 * No authority document enumerates machine connection states, so this set is a
 * panel-side provisional contract, reported as an open coordination point in
 * the P8 handoff. It is NOT presented as recorded vocabulary.
 */
export const MACHINE_CONNECTION_STATES = [
  "CONNECTED",
  "DEGRADED",
  "DISCONNECTED",
  "UNKNOWN",
] as const;
export type MachineConnectionState = (typeof MACHINE_CONNECTION_STATES)[number];

export const machineConnectionSchema = z.object({
  state: z.enum(MACHINE_CONNECTION_STATES),
  /** When the panel last observed this state — drives "stale" marking (18 §7.3). */
  checkedAt: instantSchema,
  /** 18 §9 — version and compatibility reporting, absent when disconnected. */
  machineVersion: z.string().min(1).optional(),
  /** Stable English code explaining a non-CONNECTED state (10 §2). */
  reasonCode: stableCodeSchema.optional(),
});
export type MachineConnection = z.infer<typeof machineConnectionSchema>;

export const machineSummarySchema = z
  .object({
    id: idSchema,
    /** 00 §4 — the five machines are 01→05. There is no Machine 06. */
    machineNumber: z.union([
      z.literal(MACHINE_NUMBERS[0]),
      z.literal(MACHINE_NUMBERS[1]),
      z.literal(MACHINE_NUMBERS[2]),
      z.literal(MACHINE_NUMBERS[3]),
      z.literal(MACHINE_NUMBERS[4]),
    ]),
    /** Stable English key; the Persian label resolves through 09 §9's mapping. */
    nameKey: stableCodeSchema,
    /** Human-authored Persian name, when the machine advertises one. */
    displayName: displayTextSchema.optional(),
    /**
     * 18 §9 — capability discovery. Stable English capability keys; the set is
     * machine-owned and therefore open here (PROVISIONAL, P8 coordination).
     */
    capabilities: z.array(stableCodeSchema),
    connection: machineConnectionSchema,
  })
  .strict();
export type MachineSummary = z.infer<typeof machineSummarySchema>;
