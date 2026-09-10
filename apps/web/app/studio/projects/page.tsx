import { redirect } from "next/navigation";
import { STUDIO_REDIRECTS } from "../_shell/studio-nav";

/**
 * Retired by ADR-0020 D2.
 *
 * The target comes from `STUDIO_REDIRECTS`, not from a literal here. When each
 * page hard-coded its own destination the table became decoration: a wrong
 * target could not be caught by the test that reads the table, because the page
 * never read it.
 *
 * The folder is kept deliberately: `app/studio/[...rest]/page.tsx` sits at the
 * same depth, so deleting it would render a bare empty state at HTTP 200 — a
 * dead end that looks like a working page — rather than a 404.
 */
export default function Page(): never {
  redirect(STUDIO_REDIRECTS["/studio/projects"]);
}
