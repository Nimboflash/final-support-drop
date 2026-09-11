import type { ReactNode } from "react";
import { DirectionProvider } from "@drop/ui";
import { ThemeProvider } from "./theme-provider";
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
      <head>
        {/*
          Preload the interface font.

          It was declared and served, but never preloaded, so the browser only
          discovered it after parsing the stylesheet that references it. With
          `font-display: swap` that means every load painted Persian in whatever
          the operating system picked and then reflowed — which is how a panel
          that IS set in Vazirmatn can still look like it is not.

          `crossOrigin` is required even same-origin: fonts are fetched in CORS
          mode, and a preload whose mode does not match the real request is
          simply fetched twice.
        */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Vazirmatn-Variable.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ThemeProvider>
          <DirectionProvider dir="rtl">{children}</DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
