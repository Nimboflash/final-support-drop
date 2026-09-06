import { EmptyState } from "@drop/ui";

/** V2 02 §2 destination (ADR-0019 D13). The surface arrives with ticket P4. */
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">خروجی‌ها</h1>
      <EmptyState detail="محتوای تأییدشده و آرشیو بسته‌ها در تیکت P4 ساخته می‌شود." />
    </div>
  );
}
