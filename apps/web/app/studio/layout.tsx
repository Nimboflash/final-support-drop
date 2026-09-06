import { Suspense, type ReactNode } from "react";
import { LoadingState, SidebarInset, SidebarProvider, SidebarTrigger } from "@drop/ui";
import { StudioSidebar } from "./_shell/studio-sidebar";
import { DemoProviders } from "../../lib/demo/providers";

/**
 * /studio shell (V2 02 §2; 18 §4.1): responsive RTL layout, right-side Persian
 * navigation.
 *
 * The demo session is mounted HERE rather than in the root layout because it
 * belongs to the panel, not to the whole app — `/dev/gallery` has no use for a
 * gateway. Mounting it here also lets it read the selected scenario from the
 * URL, which a root layout cannot do.
 *
 * `useSearchParams` needs a Suspense boundary in the app router; without it the
 * whole route opts out of static rendering.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
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
    </Suspense>
  );
}
