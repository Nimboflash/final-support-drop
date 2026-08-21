"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * App-wide theme mechanism (AC-P1.11): class-based dark theme over the single
 * theme file's `.dark` block. Light is the default; no system detection —
 * theme is an explicit choice (the visible toggle arrives with P4's settings
 * surface). e2e drives it through localStorage("theme").
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
