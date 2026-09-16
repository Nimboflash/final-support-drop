"use client";

import { DegradedModeBanner } from "@drop/ui";
import { useDemoSession } from "../../lib/demo/providers";

/**
 * What the scenario says about this world, said once, in the shell.
 *
 * Two policies were unreachable on any surface. A DISCONNECTED world kept
 * its snapshot readable — correctly, "do not erase it on disconnect" — but the
 * banner that is supposed to sit over stale content fires only on a failed
 * read, and the read never failed. A FORBIDDEN world disabled nothing; every
 * control stayed live and refused after the click. Both are now stated here,
 * above every destination, with the same component the read-failure path
 * uses so the two ways of being degraded look the same.
 */
export function PolicyNotice() {
  const { world, mode } = useDemoSession();
  if (mode !== "MOCK") return null;
  if (world.policy.disconnected === true) {
    return (
      <div className="px-6 pt-4" data-testid="policy-notice" data-policy="disconnected">
        <DegradedModeBanner detail="ارتباط با سامانهٔ ماشین برقرار نیست. آنچه می‌بینید آخرین وضعیت شناخته‌شده است و هیچ تغییری ثبت نمی‌شود." />
      </div>
    );
  }
  if (world.policy.forbidden === true) {
    return (
      <div className="px-6 pt-4" data-testid="policy-notice" data-policy="forbidden">
        <DegradedModeBanner
          title="فقط خواندن"
          detail="با نقش فعلی فقط می‌توانید ببینید. هیچ تصمیمی ثبت نمی‌شود و کنترل‌های ثبت غیرفعال‌اند."
        />
      </div>
    );
  }
  return null;
}
