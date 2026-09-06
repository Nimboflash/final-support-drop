import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «خلاصه» — ورودی اولیه، دامنه، کانسپت‌های انتخاب‌شده، بازدارندهٔ فعلی و گام بعد.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-overview" className="space-y-3">
      <h2 id="tab-heading-overview" className="text-lg font-semibold">خلاصه</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="این تب همیشه در دسترس است."
      />
    </section>
  );
}
