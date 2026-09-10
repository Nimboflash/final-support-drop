import { Suspense, type ReactNode } from "react";
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

// Request-time rendering, so the machine configuration below is read from the
// runtime environment rather than baked in at build time.
export const dynamic = "force-dynamic";

/** The machine's own id form, `uuid4().hex` truncated to twelve. */
const SESSION_ID = /^[a-f0-9]{12}$/;

/**
 * Which world this render is showing, resolved on the server (ADR-0021 D5).
 *
 * BOTH variables are required. A session id with no base URL would enter a mode
 * whose every read fails, and a base URL with no session id has nothing to
 * show; either alone is a misconfiguration rather than an intention. Neither
 * value reaches the client: only the session id is passed down, and the address
 * of the machine stays on the server (AC-P10.1).
 */
function machineSessionId(): string | null {
  const base = process.env.DROP_MACHINE_BASE_URL;
  const session = process.env.DROP_MACHINE_SESSION_ID;
  if (typeof base !== "string" || base.trim() === "") return null;
  if (typeof session !== "string" || !SESSION_ID.test(session.trim())) return null;
  return session.trim();
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  const machineSession = machineSessionId();

  return (
    <DemoProviders machineSessionId={machineSession}>
      <SidebarProvider>
        <Suspense fallback={null}>
          <StudioSidebar />
        </Suspense>
        <SidebarInset>
          <header className="drop-material flex h-14 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger aria-label="نمایش یا پنهان‌کردن منو" />
            <p className="text-sm text-muted-foreground">دراپ او اس — ماژول استودیو</p>
            {/*
              The ONE demo marker (ADR-0020 D6). The brief removed the repeated
              per-surface simulation notices; this is what keeps 18 §12 true
              without narrating it on every card — nothing in this panel may
              imply that real machine work, research or publication happened.

              Which is exactly why it cannot be a constant any more. When the
              panel is reading a live machine session, «حالت نمایشی» is itself
              the false claim the marker exists to prevent. One marker, one
              testid, and the sentence changes with the world.
            */}
            <Badge variant="outline" className="ms-auto" data-testid="demo-marker">
              {machineSession === null ? "حالت نمایشی" : "دادهٔ زندهٔ ماشین"}
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
