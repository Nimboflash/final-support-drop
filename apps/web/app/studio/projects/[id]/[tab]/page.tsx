import { redirect } from "next/navigation";
import { PROJECT_TAB_REDIRECTS } from "../../../_shell/studio-nav";

/**
 * The seven project tabs are retired (ADR-0020 D2). Each one maps to the
 * work-unit destination that now owns it, carrying the project forward as
 * context so an old deep link lands on the same work, filtered.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}): Promise<never> {
  const { id, tab } = await params;
  const target =
    PROJECT_TAB_REDIRECTS[tab as keyof typeof PROJECT_TAB_REDIRECTS] ?? "/studio/concepts";
  redirect(target === "/studio" ? "/studio" : `${target}?project=${id}`);
}
