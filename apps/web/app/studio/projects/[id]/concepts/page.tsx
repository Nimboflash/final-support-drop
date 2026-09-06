import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «کانسپت‌ها» — شبکهٔ کاندیداها، فیلترهای وضعیت و دکمهٔ ادامه با کانسپت‌های تأییدشده.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-concepts" className="space-y-3">
      <h2 id="tab-heading-concepts" className="text-lg font-semibold">کانسپت‌ها</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="برای دیدن کانسپت‌ها، ابتدا مسیر را با ورودی خالی یا رفرنس شروع کنید."
      />
    </section>
  );
}
