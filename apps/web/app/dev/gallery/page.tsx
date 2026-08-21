import { notFound } from "next/navigation";
import { GalleryContent } from "./gallery-content";

/**
 * Non-production component gallery (ticket P1) — the visual-QA target, snapshot
 * baseline and accessibility surface in one route. Not linked from the shell;
 * dev/demo use only (permission_requirements, ticket P1).
 * `?theme=dark` renders the dark theme for snapshots and axe runs.
 */
// Request-time rendering so the dev/demo gate reads the runtime environment.
export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Non-production route (ticket P1 permission_requirements): absent outside dev/demo.
  if (process.env.NODE_ENV === "production" && process.env.DROP_DEMO !== "1") {
    notFound();
  }
  const sp = await searchParams;
  const dark = sp.theme === "dark";
  return <GalleryContent dark={dark} />;
}
