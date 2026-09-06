import { redirect } from "next/navigation";

/** A bare project URL opens its first tab (V2 02 §4 — "opens the last active project tab"). */
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<never> {
  const { id } = await params;
  redirect(`/studio/projects/${id}/overview`);
}
