import { redirect } from "next/navigation";

/** A bare project link now opens the concepts of that project (ADR-0020 D2). */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<never> {
  const { id } = await params;
  redirect(`/studio/concepts?project=${id}`);
}
