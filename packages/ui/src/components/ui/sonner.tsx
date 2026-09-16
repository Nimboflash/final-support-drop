"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

/**
 * The one notification surface (ADR-0026 D5).
 *
 * Mounted ONCE, in the studio layout. `toast` is re-exported from here so the
 * app never depends on `sonner` directly and there is exactly one place the
 * theme, direction, icons and position are decided. Two Toasters is how a
 * toast appears twice.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // ADR-0025 turned `enableSystem` on, so "system" is a real value here and
  // Sonner resolves it itself; dark is the default workspace theme.
  const { theme = "dark" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      // Sonner's region is labelled "Notifications alt+T" in English; the
      // interface ships fa-IR only, and the e2e sweep reads accessible names.
      containerAriaLabel="اعلان‌ها"
      // Sonner appends its focus hotkey's name — "alt+T" — to that label, in
      // Latin. No hotkey, no Latin: the region is reachable by Tab like every
      // other landmark, and the interface stays fa-IR only.
      hotkey={[]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        // Faster than the default spin: a quick spinner makes the wait feel
        // shorter for the same wait (design-engineering skill, perceived
        // performance).
        loading: <Loader2Icon className="size-4 animate-spin [animation-duration:650ms]" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster, toast }
