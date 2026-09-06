import type { ReactNode } from "react";
import { DirectionProvider } from "@drop/ui";
import { ThemeProvider } from "./theme-provider";
import { DemoProviders } from "../lib/demo/providers";
import "./globals.css";

/**
 * Root layout — FA-first, RTL-first from the first component (00 §4; ADR 0010 D6).
 * Vazirmatn is served from public/fonts only (09 §5; no remote font, 00 §4).
 */
export const metadata = {
  title: "DROP OS",
  description: "سیستم‌عامل خلاقهٔ DROP — ماژول استودیو",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <DirectionProvider dir="rtl">
            {/* Inside <body>: layout.test.tsx asserts the root element is html. */}
            <DemoProviders>{children}</DemoProviders>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
