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
  snapshot: (scenarioId: string) => ["panel", "snapshot", scenarioId] as const,
} as const;

export function usePanelSnapshot(): UseQueryResult<PanelSnapshot, Error> {
  const session = useDemoSession();
  return useQuery({
    queryKey: panelKeys.snapshot(session.scenarioId),
    queryFn: () => session.world.panelCommandGateway.getSnapshot(),
  });
}
