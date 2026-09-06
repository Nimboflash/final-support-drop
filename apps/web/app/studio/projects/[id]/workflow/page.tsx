import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «گردش کار» — نمودار عملیاتی و بازرس گره‌ها.
 * Shell only (P1-R); the surface arrives with ticket P5.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-workflow" className="space-y-3">
      <h2 id="tab-heading-workflow" className="text-lg font-semibold">گردش کار</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="نمودار اجرا پس از شروع نخستین اجرا در دسترس است."
      />
    </section>
  );
}
