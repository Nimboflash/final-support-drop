import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «برنامه» — زمان‌بندی در دامنهٔ پروژه، نقاط عطف و پیوند به تقویم اصلی.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-plan" className="space-y-3">
      <h2 id="tab-heading-plan" className="text-lg font-semibold">برنامه</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="پس از ساخته‌شدن بسته، یک آیتم برنامه ساخته می‌شود؛ اگر تاریخی نباشد به سینی «بدون تاریخ» می‌رود."
      />
    </section>
  );
}
