"use client";

import { commandErrorFa, commandErrorTone, type CommandErrorTone } from "../../lib/demo/commands";

/**
 * The ONE way a failed command is shown, on every surface.
 *
 * Six surfaces each carried their own `<p role="alert" className="text-sm
 * text-destructive">` around `commandErrorFa`, which meant every failure —
 * including "the machine is still working on your last request, do not press
 * again" — arrived as a red alert. A red alert is what makes a person press
 * again. The tone comes from the same classification the sentence does, so a
 * wait is quiet and a failure is loud, and the two cannot drift apart.
 *
 * `role="status"` for a wait and a refusal, `role="alert"` for a conflict and
 * a failure: an alert interrupts a screen reader, and "nothing went wrong,
 * give it a moment" does not deserve an interruption.
 */
const TONE_CLASS: Record<CommandErrorTone, string> = {
  wait: "rounded-md border border-warning bg-warning/10 p-3 text-foreground",
  conflict: "rounded-md border border-warning bg-warning/10 p-3 text-foreground",
  refused: "rounded-md border border-border bg-muted p-3 text-foreground",
  failed: "rounded-md border border-destructive bg-destructive/10 p-3 text-foreground",
};

export function CommandError({
  error,
  className,
  testId = "command-error",
}: {
  error: unknown;
  className?: string;
  testId?: string;
}) {
  if (error === null || error === undefined) return null;
  const tone = commandErrorTone(error);
  return (
    <p
      role={tone === "failed" || tone === "conflict" ? "alert" : "status"}
      data-testid={testId}
      data-tone={tone}
      className={`text-sm leading-7 ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      {commandErrorFa(error)}
    </p>
  );
}
