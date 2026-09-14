"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * App-wide theme mechanism (AC-P1.11; amended by ADR-0025).
 *
 * Dark is still the default — Charcoal is the workspace the brand is built on.
 * What changed is that it is no longer the ONLY usable one: V2 02 §1 called
 * light "for preview sheets", and the owner has asked for a panel that can sit
 * lighter. So light is a workspace now, `system` is honoured, and the choice is
 * reachable in Settings rather than existing only in `localStorage`.
 *
 * The comment this replaces promised "the visible toggle arrives with P4's
 * settings surface". P4 came and went; the toggle did not. e2e still drives it
 * through localStorage("theme").
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
