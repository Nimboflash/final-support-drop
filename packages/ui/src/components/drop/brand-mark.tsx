import { cn } from "../../lib/utils";

/**
 * The DROP wordmark, when there is one.
 *
 * Brand DNA v3.0 §538 makes the approved horizontal wordmark the primary
 * identifier, and doc 03 §3.11 forbids substituting an exploratory mark for it.
 * The only artwork in this repository is the concept PDF, whose every page is
 * labelled CONCEPT 01 or CONCEPT 02 — so until the approved asset is supplied,
 * the honest thing on screen is the name set in type, not a mark somebody chose.
 *
 * This is the slot. `hasWordmark` is resolved once on the server (the file
 * either exists in `public/brand/` or it does not), which keeps a missing asset
 * from becoming a 404 in every visitor's console.
 */
export function BrandMark({
  hasWordmark,
  className,
}: {
  readonly hasWordmark: boolean;
  /** Sizing belongs to the caller: the sidebar and the header want different. */
  readonly className?: string;
}) {
  if (!hasWordmark) {
    // Latin, set as Latin. `dir="ltr"` so the name cannot be reordered by the
    // RTL paragraph it sits in — the same rule as every other run of Latin here.
    return (
      <span
        data-testid="brand-mark"
        data-kind="text"
        lang="en"
        dir="ltr"
        className={cn("font-bold tracking-tight", className)}
      >
        DROP
      </span>
    );
  }

  return (
    <img
      data-testid="brand-mark"
      data-kind="image"
      src="/brand/drop-wordmark.svg"
      // The mark IS the name, so it is not decorative — but it is also not new
      // information beside a heading that already says it, hence the empty alt
      // wherever a caller pairs it with text.
      alt="DROP"
      className={cn("h-5 w-auto", className)}
    />
  );
}
