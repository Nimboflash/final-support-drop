"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PanelSnapshot } from "@drop/panel-domain";
import { useDemoSession } from "./providers";

/**
 * Query hooks over the gateway (AC-P4.1).
 *
 * Every read goes through `PanelCommandGateway.getSnapshot()` — the one seam.
 * Components never import fixtures, never reach for `@drop/mock-data`, and never
 * mutate query data directly (18 §6; the ESLint zone enforces the first two).
 *
 * TanStack Query holds gateway state. Transient selection, filters and canvas
 * state belong in Zustand or in URL query parameters, never here: a filter is
 * not something the gateway knows about.
 */
export const panelKeys = {
  /*
    Keyed by the machine session as well as the scenario. The two worlds must
    never share a cache entry: a snapshot of live machine data sitting under the
    demo world's key would be served to the demo world on the next read.
  */
  snapshot: (scenarioId: string, machineSessionId: string | null) =>
    ["panel", "snapshot", scenarioId, machineSessionId] as const,
} as const;

/**
 * How often REAL mode re-reads the machine.
 *
 * The client's defaults — `staleTime: Infinity`, `refetchOnWindowFocus: false`
 * — are right for a local deterministic world and silently fatal for a live
 * one: a machine job finishes and the panel never notices. `staleTime` does
 * NOT suppress an interval (the observer's interval timer calls fetch without
 * consulting staleness), so the interval alone is enough to poll — but the
 * interval PAUSES when the tab loses focus, and with focus refetching off the
 * panel would never catch up on return. Both are therefore set together, and
 * only for REAL mode.
 */
const REAL_REFETCH_MS = 10_000;

export function usePanelSnapshot(): UseQueryResult<PanelSnapshot, Error> {
  const session = useDemoSession();
  const live = session.mode === "REAL";
  return useQuery({
    queryKey: panelKeys.snapshot(session.scenarioId, session.machineSessionId),
    queryFn: () => session.world.panelCommandGateway.getSnapshot(),
    refetchInterval: live ? REAL_REFETCH_MS : false,
    refetchOnWindowFocus: live,
    staleTime: live ? REAL_REFETCH_MS : Infinity,
  });
}
