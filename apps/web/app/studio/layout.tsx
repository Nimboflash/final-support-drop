import type { ReactNode } from "react";
import { Badge, SidebarInset, SidebarProvider, SidebarTrigger } from "@drop/ui";
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
            <SidebarTrigger aria-label="نمایش یا پنهان‌کردن منو" />
            <p className="text-sm text-muted-foreground">دراپ او اس — ماژول استودیو</p>
            {/*
              The ONE demo marker (ADR-0020 D6). The brief removed the repeated
              per-surface simulation notices; this is what keeps 18 §12 true
              without narrating it on every card — nothing in this panel may
              imply that real machine work, research or publication happened.
            */}
            <Badge variant="outline" className="ms-auto" data-testid="demo-marker">
              حالت نمایشی
            </Badge>
          </header>
          {/*
            A div, not a `<main>`: `SidebarInset` already renders the document's
            main landmark, and a second one nested inside it gives a screen
            reader two "main" regions to choose between.
          */}
          <div className="p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DemoProviders>
  );
}
