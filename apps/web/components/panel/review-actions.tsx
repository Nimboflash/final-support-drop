"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from "@drop/ui";
import type { RevisionRoute, Target } from "@drop/panel-domain";
import {
  commandErrorFa,
  isRevisionConflict,
  useRequestRevision,
  useReviewItem,
} from "../../lib/demo/commands";

/**
 * The review action controls (ticket P6; AC-P6.1, AC-P6.3, AC-P6.6).
 *
 * ONE component, mounted by every door onto a review: the card, the sheet
 * footer, the global queue and the graph shortcut. Five call sites each
 * assembling their own approve button is exactly how "the same action from the
 * inbox, the card and the graph" (journey A14) quietly stops being the same
 * action.
 *
 * Failure never discards the reviewer's words. A conflict prompts a refresh with
 * the typed feedback still in the box (V2 03 §4) — losing a paragraph of Persian
 * review because a row version moved is the worst possible response to a
 * recoverable error.
 */
export function ReviewActions({
  target,
  expectedRowVersion,
  disabledReasonFa,
  onDone,
}: {
  target: Target;
  expectedRowVersion?: number;
  /** Set when a policy or a blocker forbids acting; the control explains why. */
  disabledReasonFa?: string | null;
  onDone?: () => void;
}) {
  const review = useReviewItem();
  const [dialog, setDialog] = useState<"NONE" | "CHANGES" | "REJECT">("NONE");

  const blocked = disabledReasonFa != null;
  const pending = review.isPending;

  return (
    <div className="space-y-2" data-testid="review-actions">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          data-testid="approve-action"
          disabled={blocked || pending}
          title={disabledReasonFa ?? undefined}
          onClick={() => {
            review.mutate(
              // V2 01 §4 — approve binds exactly the current reviewable version,
              // which the target already names.
              { target, outcome: "APPROVED", reasonFa: "با معیارهای DROP هم‌خوان است.", expectedRowVersion },
              { onSuccess: () => onDone?.() },
            );
          }}
        >
          {pending ? "در حال ثبت…" : "تأیید"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          data-testid="request-changes-action"
          disabled={blocked || pending}
          title={disabledReasonFa ?? undefined}
          onClick={() => setDialog("CHANGES")}
        >
          درخواست اصلاح
        </Button>

        <Button
          size="sm"
          variant="ghost"
          data-testid="reject-action"
          disabled={blocked || pending}
          title={disabledReasonFa ?? undefined}
          onClick={() => setDialog("REJECT")}
        >
          رد کردن
        </Button>
      </div>

      {disabledReasonFa == null ? null : (
        <p className="text-xs text-muted-foreground" data-testid="review-disabled-reason">
          {disabledReasonFa}
        </p>
      )}

      {review.isError ? (
        <p
          role="alert"
          data-testid="review-error"
          className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm"
        >
          {commandErrorFa(review.error)}
        </p>
      ) : null}

      <FeedbackDialog
        mode={dialog}
        target={target}
        expectedRowVersion={expectedRowVersion}
        onClose={() => setDialog("NONE")}
        onDone={onDone}
      />
    </div>
  );
}

/**
 * Request-changes and reject share a dialog because they share a requirement:
 * V2 01 §4 makes a reason mandatory for both, and the difference is the ROUTE
 * the rejection takes afterwards.
 */
function FeedbackDialog({
  mode,
  target,
  expectedRowVersion,
  onClose,
  onDone,
}: {
  mode: "NONE" | "CHANGES" | "REJECT";
  target: Target;
  expectedRowVersion?: number;
  onClose: () => void;
  onDone?: () => void;
}) {
  const review = useReviewItem();
  const revision = useRequestRevision();
  const [reason, setReason] = useState("");
  const [route, setRoute] = useState<"REJECT_ONLY" | "REVISE" | "REPLACE">("REJECT_ONLY");

  if (mode === "NONE") return null;

  const isReject = mode === "REJECT";
  const failed = review.isError || revision.isError;
  const conflict = isRevisionConflict(review.error) || isRevisionConflict(revision.error);
  const pending = review.isPending || revision.isPending;

  async function submit() {
    const outcome = isReject ? "REJECTED" : "CHANGES_REQUESTED";
    // The DECISION is recorded first and durably (ADR-0019 D4, AC-P6.5): if the
    // regeneration below fails, the rejection must still stand, and retrying
    // must not duplicate it.
    await review.mutateAsync({ target, outcome, reasonFa: reason, expectedRowVersion });

    const revisionRoute: RevisionRoute | null = isReject
      ? route === "REVISE"
        ? "CONCEPT_REVISION"
        : route === "REPLACE"
          ? "CONCEPT_REPLACEMENT"
          : null
      : target.type === "CONCEPT"
        ? "CONCEPT_REVISION"
        : "CONTENT_REWRITE";

    if (revisionRoute !== null) {
      await revision.mutateAsync({ target, feedbackFa: reason, route: revisionRoute });
    }
    setReason("");
    onClose();
    onDone?.();
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent data-testid={isReject ? "reject-dialog" : "request-changes-dialog"}>
        <DialogHeader>
          <DialogTitle>{isReject ? "رد کردن" : "درخواست اصلاح"}</DialogTitle>
          <DialogDescription>
            تصمیم روی نسخهٔ <bdi dir="ltr">{target.versionId}</bdi> ثبت می‌شود. دلیل الزامی است.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="review-reason">دلیل و بازخورد اجراپذیر</Label>
            <Textarea
              id="review-reason"
              data-testid="review-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="چه چیزی باید تغییر کند؟"
            />
          </div>

          {isReject ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">پس از رد کردن</legend>
              {/* Rejection never deletes: the card stays visible in history and
                  the user chooses explicitly what happens next (V2 01 §4). */}
              <RadioGroup
                value={route}
                onValueChange={(value) => setRoute(value as typeof route)}
                data-testid="reject-route"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="REJECT_ONLY" id="route-reject-only" />
                  <Label htmlFor="route-reject-only">فقط رد شود</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="REVISE" id="route-revise" />
                  <Label htmlFor="route-revise">رد و بازنگری همین ایده (شناسه حفظ می‌شود)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="REPLACE" id="route-replace" />
                  <Label htmlFor="route-replace">رد و ساخت جایگزین (شناسهٔ تازه)</Label>
                </div>
              </RadioGroup>
            </fieldset>
          ) : null}

          {failed ? (
            <p
              role="alert"
              data-testid="dialog-error"
              className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm"
            >
              {commandErrorFa(review.error ?? revision.error)}
              {conflict ? " متن شما حفظ شده است." : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            size="sm"
            data-testid="submit-feedback"
            // A reason is mandatory for both routes (V2 01 §4).
            disabled={reason.trim() === "" || pending}
            onClick={() => void submit()}
          >
            {pending ? "در حال ثبت…" : "ثبت"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
