"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * App-wide theme mechanism (AC-P1.11): class-based dark theme over the single
 * theme file's `.dark` block. Dark is the default: Charcoal is the main
 * workspace (ADR-0019 D14; V2 02 §1), and light is for preview sheets. No
 * system detection — theme is an explicit choice (the visible toggle arrives
 * with P4's settings surface). e2e drives it through localStorage("theme").
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
