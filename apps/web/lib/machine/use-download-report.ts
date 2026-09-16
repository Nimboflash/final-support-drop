"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { GatewayError } from "@drop/machine-gateway";

/**
 * Downloads the machine's final report for a session.
 *
 * The same shape as `useDownloadPackage` in the demo command layer — a
 * mutation that resolves to the filename it handed the browser — so the
 * outputs sheet renders both through the same button and the same
 * `CommandError`. The failure is a GatewayError for the same reason every
 * other machine failure is: only a GatewayError carries a reason the
 * interface can turn into a true sentence.
 */
export function useDownloadMachineReport(): UseMutationResult<string, Error, string> {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      let response: Response;
      try {
        response = await fetch("/api/machine/report/" + encodeURIComponent(sessionId), {
          cache: "no-store",
          redirect: "error",
        });
      } catch {
        throw new GatewayError(
          "MACHINE_SYSTEM_DISCONNECTED",
          "MACHINE_SYSTEM_DISCONNECTED: could not reach the report",
          { retryable: false },
        );
      }
      if (response.status === 404) {
        // Not an error about the person: the research has not been built, or
        // the machine has not written its report yet.
        throw new GatewayError("UNKNOWN_ID", "UNKNOWN_ID: no report for this session yet", {
          retryable: false,
        });
      }
      if (!response.ok) {
        throw new GatewayError(
          "MACHINE_SYSTEM_DISCONNECTED",
          `MACHINE_SYSTEM_DISCONNECTED: the report answered ${String(response.status)}`,
          { retryable: false },
        );
      }
      const blob = await response.blob();
      const filename = `${sessionId}-final_report.md`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      // Revoked on the next tick so the click has taken the URL.
      queueMicrotask(() => {
        URL.revokeObjectURL(url);
      });
      return filename;
    },
  });
}
