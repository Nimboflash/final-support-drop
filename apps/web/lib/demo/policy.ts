"use client";

import { useDemoSession } from "./providers";

/**
 * Whether the person may change anything, and if not, why — in one place.
 *
 * `world.policy.forbidden` was read exactly once in the app, to choose which
 * actor id went into a command envelope. No control read it. So in the
 * read-only scenario every button stayed enabled and failed AFTER the click
 * with «با نقش فعلی، اجازهٔ این کار را ندارید» — the requirement is the
 * opposite: "disable mutations with an explanation where a scenario disallows
 * them" (V2 02 §5, journey A16). Every mutation control asks this hook, so
 * the six surfaces cannot disagree about it.
 */
export function useCanAct(): { readonly allowed: boolean; readonly reason: string | null } {
  const session = useDemoSession();
  if (session.world.policy.forbidden === true) {
    return {
      allowed: false,
      reason: "با نقش فعلی فقط می‌توانید ببینید؛ هیچ تصمیمی ثبت نمی‌شود.",
    };
  }
  return { allowed: true, reason: null };
}
