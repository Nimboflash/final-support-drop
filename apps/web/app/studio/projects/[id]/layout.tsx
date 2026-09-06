import type { ReactNode } from "react";
import { Badge, StageStrip } from "@drop/ui";
import { ProjectTabNav } from "./_shell/project-tab-nav";

/**
 * Project detail shell (V2 02 §5): a sticky header carrying title, type, owner,
 * stage badge and the single appropriate next-step CTA, a compact five-stage
 * indicator beneath it, then one stable tab row.
 *
 * P1-R builds the shell only. The header still reads placeholder values and the
 * stage strip a placeholder state; P4 wires both to the gateway. The strip's
 * Review segment is a display grouping derived from open review counts, not a
 * stored stage (ADR-0019 D12).
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-10 -mx-6 space-y-3 border-b border-border bg-background px-6 pb-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">
              پروژه <bdi dir="ltr" className="font-mono text-base">{id}</bdi>
            </h1>
            <p className="text-sm text-muted-foreground">
              عنوان، نوع، مالک و مرحله در تیکت P4 از گیت‌وی خوانده می‌شوند.
            </p>
          </div>
          <Badge variant="outline">حالت نمایشی</Badge>
        </div>
        <StageStrip states={{ concepts: "current" }} />
      </header>
      <ProjectTabNav projectId={id} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
