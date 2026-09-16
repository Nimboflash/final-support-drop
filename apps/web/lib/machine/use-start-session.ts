"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { beginMachineWork, type MachineWorkNotice } from "../demo/notify";
import { rememberStartedSession } from "./session-history";
import { startMachineSession, type StartedSession } from "./start-session";

/**
 * The composer's start, as a MUTATION.
 *
 * It was a bare promise chain, which meant `useIsMutating()` never rose and
 * the shell's activity badge read «زنده» for the whole of session creation and
 * the first generate — the two longest paid calls the panel makes, and the
 * ones during which a second press costs the most. Going through TanStack
 * puts it on the same counter as every other write, so the badge, the elapsed
 * seconds and the "do not press again" signal all come on together.
 */
export function useStartMachineSession(): UseMutationResult<StartedSession, Error, string> {
  return useMutation({
    mutationFn: (brief: string) => startMachineSession(brief),
    onMutate: (): { notice: MachineWorkNotice } => ({ notice: beginMachineWork("generate") }),
    onError: (error, _brief, context) => context?.notice.fail(error),
    onSuccess: (started, brief, context) => {
      context?.notice.done();
      rememberStartedSession({
        id: started.sessionId,
        briefFa: brief.split("\n")[0]?.slice(0, 120) ?? "",
        startedAt: new Date().toISOString(),
      });
    },
  });
}
