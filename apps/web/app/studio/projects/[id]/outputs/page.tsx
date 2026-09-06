import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «خروجی نهایی» — چک‌لیست آیتم‌های الزامی، آمادگی، پیش‌نمایش بسته و بارگیری.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-outputs" className="space-y-3">
      <h2 id="tab-heading-outputs" className="text-lg font-semibold">خروجی نهایی</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="وقتی همهٔ محتواهای الزامی تأیید شوند، بسته به‌صورت خودکار ساخته می‌شود."
      />
    </section>
  );
}
