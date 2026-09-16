import type { ReactNode } from "react";

/**
 * The reference's settings grammar: a section is a heading, an optional
 * sentence, and rows. A row is a label and a description on one side and the
 * control on the other, separated from the next by a hairline. No cards —
 * a settings page made of cards is a page of boxes with nothing between them
 * to say which one you are in.
 */
export function SettingsSection({
  id,
  title,
  description,
  children,
  testId,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section id={id} data-testid={testId} className="space-y-4 scroll-mt-6" aria-labelledby={`${id}-title`}>
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold">
          {title}
        </h2>
        {description === undefined ? null : (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

/** One setting: what it is, what it means, and the control that changes it. */
export function SettingsRow({
  label,
  description,
  children,
  testId,
}: {
  label: string;
  description?: ReactNode;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0"
    >
      <div className="min-w-0 max-w-prose flex-1 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {description === undefined ? null : (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {/* Wraps under the label when the column is narrow; never wider than it. */}
      {children === undefined ? null : <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
