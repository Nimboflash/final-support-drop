import { EmptyState } from "@drop/ui";

/** Route scaffold (ticket P1) — the surface itself arrives with its owning ticket. */
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">درخواست‌ها</h1>
      <EmptyState detail="جریان درخواست‌ها در تیکت P4 ساخته می‌شود." />
    </div>
  );
}
