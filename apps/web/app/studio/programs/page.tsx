import { redirect } from "next/navigation";

/**
 * ADR-0019 D13 — this destination was removed when the eleven studio
 * destinations collapsed to five plus settings (V2 02 §2).
 *
 * برنامه‌ها اکنون با فیلتر نوع در «پروژه‌ها» دیده می‌شوند (ADR-0019 D13).
 *
 * The folder is KEPT deliberately. Deleting it would not produce a 404:
 * `app/studio/[...rest]/page.tsx` sits at the same depth, would match the
 * missing segment, and would render a bare empty state at HTTP 200 — a dead end
 * that looks like a working page with nothing in it.
 */
export default function Page(): never {
  redirect("/studio/projects?type=program");
}
