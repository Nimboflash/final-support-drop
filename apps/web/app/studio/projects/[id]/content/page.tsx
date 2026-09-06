import { EmptyState } from "@drop/ui";

/**
 * V2 02 §5 tab «محتوا و تحقیق» — انتخابگر کانسپت، فیلترها، خلاصهٔ تحقیق و کارت‌های محتوا.
 * Shell only (P1-R); the surface arrives with ticket P4.
 *
 * A not-yet-available stage states its prerequisite plainly rather than hiding
 * the tab or disabling it without explanation (V2 02 §5).
 */
export default function Page() {
  return (
    <section aria-labelledby="tab-heading-content" className="space-y-3">
      <h2 id="tab-heading-content" className="text-lg font-semibold">محتوا و تحقیق</h2>
      <EmptyState
        title="هنوز چیزی برای نمایش نیست"
        detail="پس از تأیید دست‌کم یک کانسپت و ادامه دادن با آن، تحقیق و محتوا اینجا دیده می‌شود."
      />
    </section>
  );
}
