import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@drop/ui";
import { StudioSidebar } from "./_shell/studio-sidebar";

/**
 * /studio shell (04 §2; 18 §4.1): responsive RTL layout, right-side Persian
 * navigation. Scaffold only — surfaces beneath belong to P4/P5.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <StudioSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger aria-label="باز و بسته کردن منو" />
          <p className="text-sm text-muted-foreground">دراپ او اس — ماژول استودیو</p>
        </header>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
