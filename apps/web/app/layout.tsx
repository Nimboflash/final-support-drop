import type { ReactNode } from "react";

/**
 * Root layout — FA-first and RTL from the very first component (00 §4; ADR 0010 D6).
 * lang/dir are structural commitments, not styling; every later surface inherits them.
 * Fonts will be bundled locally under public/fonts (no remote fonts — ADR-0016),
 * wired in ticket 0.12.
 */
export const metadata = {
  title: "DROP OS",
  description: "سیستم‌عامل خلاقهٔ DROP — ماژول استودیو",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
