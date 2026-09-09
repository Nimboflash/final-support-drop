import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@drop/ui";
import { StudioSidebar } from "./_shell/studio-sidebar";
import { DemoProviders } from "../../lib/demo/providers";

/**
 * /studio shell (V2 02 §2; 18 §4.1): responsive RTL layout, right-side Persian
 * navigation.
 *
 * The demo session is mounted HERE rather than in the root layout because it
 * belongs to the panel, not to the whole app — `/dev/gallery` has no use for a
 * gateway.
 *
 * There is deliberately no Suspense boundary around it. `DemoProviders` reads
 * the scenario from `window.location` rather than `useSearchParams`, because a
 * client component calling `useSearchParams` at LAYOUT level suspends and never
 * resolves in dev — the panel sat on its loading fallback forever while
 * production rendered fine. A boundary here would only hide that again.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProviders>
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
    </DemoProviders>
  );
}
