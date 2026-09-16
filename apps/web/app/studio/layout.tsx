import { existsSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Badge, BrandMark, SidebarInset, SidebarProvider, SidebarTrigger, Toaster } from "@drop/ui";
import { StudioSidebar } from "./_shell/studio-sidebar";
import { MachineActivity } from "../../components/panel/machine-activity";
import { PolicyNotice } from "../../components/panel/policy-notice";
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
 *
 * `StudioSidebar` has no boundary either, and that is the same rule reaching a
 * different conclusion rather than an exception to it. It DOES call
 * `useSearchParams`, because the project filter has to be in the rail's hrefs
 * for the filter to survive a move between destinations (ADR-0020 D2). Wrapped
 * in `<Suspense fallback={null}>` it suspended on the client's first hydration
 * pass, so React threw away the server's sidebar and regenerated it — a
 * "Hydration failed" error on every single page load, and the primary
 * navigation getting no server render at all. Unwrapped there is nothing to
 * fall back TO, so the client hydrates the markup the server sent.
 *
 * What makes that safe here is the `force-dynamic` above: every `/studio` route
 * builds as Dynamic, and it is static prerendering — not layouts — that makes
 * `useSearchParams` demand a boundary. A page that is statically rendered still
 * needs one, which is why the page-level boundaries stay.
 */

// Request-time rendering, so the machine configuration below is read from the
// runtime environment rather than baked in at build time.
export const dynamic = "force-dynamic";

/** The machine's own id form, `uuid4().hex` truncated to twelve. */
const SESSION_ID = /^[a-f0-9]{12}$/;

/** The cookie the panel sets when a session is started from the UI. */
const MACHINE_SESSION_COOKIE = "drop_machine_session";

/**
 * Which world this render is showing, resolved on the server (ADR-0021 D5,
 * amended by slice 2).
 *
 * `DROP_MACHINE_BASE_URL` still decides the MODE, and still never reaches the
 * client: the address of the machine stays on the server (AC-P10.1).
 *
 * What changed is where the session id comes from. It used to be an
 * environment variable and nothing else, which meant the panel could only ever
 * show a session someone had configured by hand before starting the server —
 * fine for reading one, useless for starting one. A cookie set by
 * `/api/machine/current` now overrides it, with the variable as the default.
 *
 * A COOKIE rather than a query parameter, for the three reasons ADR-0021 D5
 * recorded against `?session=`: the sidebar's links carry no query, so the mode
 * vanished on the first click; this provider is mounted in the LAYOUT, which
 * does not remount on a client navigation, so the URL and the world disagreed;
 * and the server pass has no `window`, so SSR built a different world than the
 * client. A cookie is readable HERE, during this render, which is what makes
 * all three go away at once.
 */
async function machineSessionId(): Promise<string | null> {
  const base = process.env.DROP_MACHINE_BASE_URL;
  if (typeof base !== "string" || base.trim() === "") return null;

  const chosen = (await cookies()).get(MACHINE_SESSION_COOKIE)?.value;
  if (typeof chosen === "string" && SESSION_ID.test(chosen)) return chosen;

  const configured = process.env.DROP_MACHINE_SESSION_ID;
  if (typeof configured === "string" && SESSION_ID.test(configured.trim())) {
    return configured.trim();
  }
  return null;
}

/** Resolved once per render, on the server. */
function wordmarkPresent(): boolean {
  return existsSync(join(process.cwd(), "public", "brand", "drop-wordmark.svg"));
}

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const hasWordmark = wordmarkPresent();

  const machineSession = await machineSessionId();

  return (
    <DemoProviders machineSessionId={machineSession}>
      <SidebarProvider>
        <StudioSidebar hasWordmark={hasWordmark} />
        <SidebarInset>
          <header className="drop-material flex h-14 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger aria-label="نمایش یا پنهان‌کردن منو" />
            {/*
              The mark, then what this module is. Resolved on the SERVER — the
              wordmark either exists in `public/brand/` or it does not, and
              asking the browser to find that out means a 404 in every visitor's
              console (see `public/brand/README.md`).
            */}
            <BrandMark hasWordmark={hasWordmark} className="text-sm" />
            <span className="text-sm text-muted-foreground">ماژول استودیو</span>
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
            <div className="ms-auto flex items-center gap-2">
              {/*
                What the machine is doing, beside what world this is. The two
                belong together: the marker says whether anything real is on
                screen, and this says whether it is changing right now.
              */}
              <MachineActivity />
              <Badge variant="outline" data-testid="demo-marker">
                {machineSession === null ? "حالت نمایشی" : "دادهٔ زندهٔ ماشین"}
              </Badge>
            </div>
          </header>
          {/*
            A div, not a `<main>`: `SidebarInset` already renders the document's
            main landmark, and a second one nested inside it gives a screen
            reader two "main" regions to choose between.
          */}
          <PolicyNotice />
          <div className="p-6">{children}</div>
        </SidebarInset>
        {/*
          The ONE Toaster (ADR-0026 D5). The reference puts notices in the top
          corner opposite its rail; ours is on the right, so top-left. Close
          buttons, because a loading notice for a paid call persists until the
          call settles and a person may want it gone.
        */}
        <Toaster position="top-left" closeButton />
      </SidebarProvider>
    </DemoProviders>
  );
}
