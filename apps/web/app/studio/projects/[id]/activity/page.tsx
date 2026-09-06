import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «تاریخچه» — نظرها، تصمیم‌ها، تلاش‌ها، تغییر برنامه و تاریخچهٔ بسته و زمان‌بندی.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-activity" className="space-y-3">
      <h2 id="tab-heading-activity" className="text-lg font-semibold">تاریخچه</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="این تب همیشه در دسترس است."
      />
    </section>
  );
}
