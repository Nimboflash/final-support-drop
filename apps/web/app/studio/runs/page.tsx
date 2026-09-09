import { redirect } from "next/navigation";

/**
 * Retired by ADR-0020 D2. اجراها در Engine دیده می‌شوند.
 *
 * The folder is kept deliberately: `app/studio/[...rest]/page.tsx` sits at the
 * same depth, so deleting it would render a bare empty state at HTTP 200 — a
 * dead end that looks like a working page — rather than a 404.
 */
export default function Page(): never {
  redirect("/studio/engine");
}
