"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { GatewayError } from "@drop/machine-gateway";
import { createDemoSession, DEFAULT_SCENARIO_ID, type DemoSession } from "./session";

/**
 * Query and session providers (AC-P4.1).
 *
 * Mounted INSIDE `<body>` deliberately: `apps/web/app/layout.test.tsx` asserts
 * the root layout's element is `html`, so wrapping `<html>` — or making
 * `RootLayout` async to build the client — turns that guard red.
 */
const SessionContext = createContext<DemoSession | null>(null);

export function useDemoSession(): DemoSession {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useDemoSession must be used inside <DemoProviders>");
  }
  return session;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The demo world is local and deterministic: refetching on focus or at
        // an interval would produce churn with no new information, and the
        // clock is injected anyway (ADR-0019 D16).
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        retry: (failureCount, error) => {
          // A GatewayError already knows whether retrying could help.
          // REVISION_CONFLICT and UNAUTHORIZED are deliberately not retryable —
          // blindly replaying a conflicting command would be stale again, and
          // retrying a permission denial is a loop against a wall.
          if (error instanceof GatewayError) return error.retryable && failureCount < 2;
          return false;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function DemoProviders({
  children,
  scenarioId = DEFAULT_SCENARIO_ID,
}: {
  children: ReactNode;
  scenarioId?: string;
}) {
  // useState, not useMemo: the client and the session must survive re-renders,
  // and useMemo is a caching hint React may discard.
  const [queryClient] = useState(createQueryClient);
  const session = useMemo(() => createDemoSession(scenarioId), [scenarioId]);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </QueryClientProvider>
  );
}
