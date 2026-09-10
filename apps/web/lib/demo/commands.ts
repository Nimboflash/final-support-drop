"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { GatewayError } from "@drop/machine-gateway";
import type { PanelCalendarEntry, RevisionRoute, Target } from "@drop/panel-domain";
import { useDemoSession } from "./providers";
import { panelKeys } from "./queries";

/**
 * The command layer (ticket P6).
 *
 * Every review decision in the panel goes through `useReviewItem`, which calls
 * `ReviewApplicationService.reviewItem` and nothing else. The card, the sheet
 * footer, the global review queue, the inbox row and the graph shortcut all use
 * THIS hook — journey A14 requires the same action from any door to produce one
 * audit event and identical results, and five call sites reaching for the
 * gateway independently is how that stops being true.
 *
 * `ApprovalCommand` is never constructed here. The facade owns that, which is
 * what keeps ADR-0013 D1's single write path to exactly one construction site.
 */
let commandCounter = 0;

/**
 * Deterministic command ids (ADR-0019 D16). `crypto.randomUUID` would break the
 * demo's reproducibility guarantee and put entropy back into a world built
 * specifically without it — a replayed session must issue the same ids.
 */
function nextCommandId(prefix: string): string {
  commandCounter += 1;
  return `cmd-${prefix}-${String(commandCounter).padStart(4, "0")}`;
}

/** Exposed so a test can replay a session from a known point. */
export function resetCommandCounter(): void {
  commandCounter = 0;
}

export interface ReviewInput {
  readonly target: Target;
  readonly outcome: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  readonly reasonFa: string | null;
  readonly expectedRowVersion?: number;
  /** Reuse a previous id to prove idempotency; otherwise one is minted. */
  readonly commandId?: string;
}

function useEnvelope() {
  const session = useDemoSession();
  return (commandId: string, expectedRowVersion?: number) => ({
    commandId,
    workspaceId: "drop-demo",
    actorId: session.world.policy.forbidden === true ? "actor-viewer" : "actor-guardian",
    actedAsRole: (session.world.policy.forbidden === true ? "VIEWER" : "DROP_GUARDIAN") as
      | "VIEWER"
      | "DROP_GUARDIAN",
    idempotencyKey: `idem-${commandId}`,
    expectedRowVersion,
  });
}

function useInvalidateWorld() {
  const session = useDemoSession();
  const client = useQueryClient();
  return async () => {
    // Persist BEFORE invalidating. The write is what makes a decision survive a
    // reload (ADR-0019 D2); without it every command was lost on refresh, and
    // the brief's own QA scenario asks for exactly that to hold.
    try {
      session.persistence.save(session.scenarioId, await session.world.panelCommandGateway.getSnapshot());
    } catch {
      // A full or unavailable storage must never lose the command that just
      // succeeded. The world stays correct in memory; only the resume is lost.
    }
    // One invalidation, so every view of the same entity refreshes together:
    // card, inbox, graph, output readiness and history (V2 01 §8).
    await client.invalidateQueries({ queryKey: panelKeys.snapshot(session.scenarioId) });
  };
}

export function useReviewItem(): UseMutationResult<unknown, Error, ReviewInput> {
  const session = useDemoSession();
  const envelope = useEnvelope();
  const invalidate = useInvalidateWorld();

  return useMutation({
    mutationFn: (input: ReviewInput) => {
      const commandId = input.commandId ?? nextCommandId("review");
      // The ONE call. No component constructs an ApprovalCommand.
      return Promise.resolve(
        session.world.review.reviewItem({
          ...envelope(commandId, input.expectedRowVersion),
          target: input.target,
          outcome: input.outcome,
          reasonFa: input.reasonFa,
        }),
      );
    },
    onSuccess: invalidate,
  });
}

export interface RevisionInput {
  readonly target: Target;
  readonly feedbackFa: string;
  readonly route: RevisionRoute;
  readonly expectedRowVersion?: number;
  readonly commandId?: string;
}

export function useRequestRevision(): UseMutationResult<unknown, Error, RevisionInput> {
  const session = useDemoSession();
  const envelope = useEnvelope();
  const invalidate = useInvalidateWorld();

  return useMutation({
    mutationFn: (input: RevisionInput) => {
      const commandId = input.commandId ?? nextCommandId("revision");
      // Never retryStage: a retry repeats a failed attempt with the same input,
      // a revision applies new feedback and creates a version (ADR-0019 D4).
      return Promise.resolve(
        session.world.revisionGateway.requestRevision({
          ...envelope(commandId, input.expectedRowVersion),
          target: input.target,
          feedbackFa: input.feedbackFa,
          route: input.route,
        }),
      );
    },
    onSuccess: invalidate,
  });
}

export function useAddComment(): UseMutationResult<
  unknown,
  Error,
  { target: Target; bodyFa: string }
> {
  const session = useDemoSession();
  const envelope = useEnvelope();
  const invalidate = useInvalidateWorld();

  return useMutation({
    mutationFn: (input: { target: Target; bodyFa: string }) =>
      // A comment changes no approval status (V2 01 §4, journey A05). The DTO
      // cannot carry an outcome, and this path touches no review field.
      Promise.resolve(
        session.world.panelCommandGateway.addComment({
          ...envelope(nextCommandId("comment")),
          target: input.target,
          bodyFa: input.bodyFa,
        }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * Moves a plan item to a date, or clears it back to the tray.
 *
 * The calendar's date picker routes here. There is no drag affordance — the
 * keyboard-reachable picker is the only way to move an item, which is also why
 * a pointer is never required (ADR-0020 D9, journey A20).
 */
export function useUpdateCalendarEntry(): UseMutationResult<
  unknown,
  Error,
  { entry: PanelCalendarEntry; date: string | null }
> {
  const session = useDemoSession();
  const envelope = useEnvelope();
  const invalidate = useInvalidateWorld();

  return useMutation({
    mutationFn: (input: { entry: PanelCalendarEntry; date: string | null }) =>
      Promise.resolve(
        session.world.panelCommandGateway.updateCalendar({
          ...envelope(nextCommandId("calendar"), input.entry.rowVersion),
          // The entry is replaced wholesale rather than patched, so the schema
          // validates the WHOLE record — a partial update could smuggle an
          // inconsistent pair of date fields past it.
          entry: { ...input.entry, date: input.date },
        }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * Puts an approved output into the calendar's undated tray (brief §14.11).
 *
 * `updateCalendar` upserts by package family — "a second create for the same
 * family updates the entry rather than duplicating it" (ADR-0019 D7) — so no
 * gateway member has to be added to create one, and pressing the button twice
 * schedules nothing twice.
 *
 * The entry is created with `date: null` deliberately. That IS the tray: an
 * output that is ready but has no date yet. Choosing the date is a separate,
 * explicit act on the calendar.
 */
export function useSendToCalendar(): UseMutationResult<
  unknown,
  Error,
  {
    projectId: string;
    titleFa: string;
    packageFamilyId: string;
    packageVersionId: string;
  }
> {
  const session = useDemoSession();
  const envelope = useEnvelope();
  const invalidate = useInvalidateWorld();

  return useMutation({
    mutationFn: (input: {
      projectId: string;
      titleFa: string;
      packageFamilyId: string;
      packageVersionId: string;
    }) => {
      const env = envelope(nextCommandId("calendar"));
      return Promise.resolve(
        session.world.panelCommandGateway.updateCalendar({
          ...env,
          entry: {
            id: `cal-${input.packageFamilyId}`,
            projectId: input.projectId,
            packageFamilyId: input.packageFamilyId,
            packageVersionId: input.packageVersionId,
            titleFa: input.titleFa,
            status: "PLANNED",
            date: null,
            endDate: null,
            startsAt: null,
            timezone: "Asia/Tehran",
            ownerId: env.actorId,
            noteFa: "",
            rowVersion: 0,
          },
        }),
      );
    },
    onSuccess: invalidate,
  });
}

/**
 * Downloads a package export.
 *
 * `Blob` is constructed HERE and only here: `exportPackage` returns
 * `PackageExport { bytes, filename, mediaType }` because the contract packages
 * are transport-free (ADR-0019 D17), and `apps/web` is the edge that turns
 * bytes into a browser download.
 */
export function useDownloadPackage(): UseMutationResult<string, Error, string> {
  const session = useDemoSession();
  return useMutation({
    mutationFn: async (packageVersionId: string) => {
      const exported = await session.world.panelCommandGateway.exportPackage(packageVersionId);
      const blob = new Blob([exported.bytes as unknown as BlobPart], { type: exported.mediaType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exported.filename;
      anchor.click();
      // Revoked on the next tick so the click has taken the URL.
      queueMicrotask(() => {
        URL.revokeObjectURL(url);
      });
      return exported.filename;
    },
  });
}

/** True when a failure is a stale-revision conflict the UI should refresh from. */
export function isRevisionConflict(error: unknown): boolean {
  return error instanceof GatewayError && error.reason === "REVISION_CONFLICT";
}

export function isForbidden(error: unknown): boolean {
  return error instanceof GatewayError && error.reason === "UNAUTHORIZED";
}

/** The Persian explanation for a failed command, by reason. */
export function commandErrorFa(error: unknown): string {
  if (!(error instanceof GatewayError)) return "خطای ناشناخته‌ای رخ داد.";
  switch (error.reason) {
    case "REVISION_CONFLICT":
      return "این مورد در جای دیگری تغییر کرده است. صفحه را تازه کنید و دوباره ثبت کنید؛ متن شما حفظ شده است.";
    case "UNAUTHORIZED":
      return "با نقش فعلی، اجازهٔ این کار را ندارید.";
    case "MACHINE_SYSTEM_DISCONNECTED":
      return "ارتباط با سامانهٔ ماشین برقرار نیست. داده‌های نمایش‌داده‌شده ممکن است قدیمی باشند.";
    case "SCHEMA_VALIDATION_FAILED":
      return "ثبت این تصمیم بدون دلیل ممکن نیست.";
    default:
      return "ثبت این فرمان ممکن نشد.";
  }
}
