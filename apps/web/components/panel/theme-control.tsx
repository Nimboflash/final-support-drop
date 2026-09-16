"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Choosing the theme (ADR-0025), in the reference's form.
 *
 * Three cards, each a miniature of what it produces — a pale ground, a dark
 * one, and a split for «مثل سیستم» — with the chosen one outlined in the
 * accent. The reference's colour-mode picker does exactly this, and it is
 * better than three labelled buttons for the reason a swatch is better than
 * a colour's name: the person sees the answer before they press.
 *
 * Rendered only after mount. `next-themes` cannot know the stored choice on the
 * server, so anything drawn before hydration is a guess, and a guess here shows
 * the wrong option selected for a frame.
 */
/** Chrome, not content — hence `label`, not `labelFa` (see bidi-isolation). */
const CHOICES = [
  { value: "light", label: "روشن", preview: "light" },
  { value: "system", label: "مثل سیستم", preview: "split" },
  { value: "dark", label: "تیره", preview: "dark" },
] as const;

function Preview({ kind }: { kind: "light" | "dark" | "split" }) {
  const pane = (dark: boolean) => (
    <div
      aria-hidden="true"
      className={`flex h-full w-full flex-col gap-1 p-2 ${dark ? "bg-(--drop-logo-charcoal)" : "bg-(--drop-paper)"}`}
    >
      <div className={`h-1.5 w-2/3 rounded-full ${dark ? "bg-(--drop-aluminium)/60" : "bg-(--drop-charcoal)/50"}`} />
      <div className={`h-1.5 w-1/2 rounded-full ${dark ? "bg-(--drop-aluminium)/30" : "bg-(--drop-charcoal)/25"}`} />
      <div className={`mt-auto h-3 w-8 rounded-sm ${dark ? "bg-(--drop-paper)/80" : "bg-(--drop-charcoal)/80"}`} />
    </div>
  );
  if (kind === "split") {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="h-full w-1/2">{pane(false)}</div>
        <div className="h-full w-1/2">{pane(true)}</div>
      </div>
    );
  }
  return pane(kind === "dark");
}

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-wrap items-start gap-3" data-testid="theme-control" role="group" aria-label="ظاهر">
      {CHOICES.map((choice) => {
        const active = mounted && (theme ?? "system") === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={active}
            data-testid={`theme-${choice.value}`}
            onClick={() => setTheme(choice.value)}
            className="drop-interactive group flex w-28 flex-col items-stretch gap-1.5 rounded-md text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <span
              className={`block h-16 overflow-hidden rounded-md border-2 transition-colors duration-[--motion-fast] ${
                active ? "border-selected" : "border-border group-hover:border-input"
              }`}
            >
              <Preview kind={choice.preview} />
            </span>
            <span className={`text-xs ${active ? "font-medium" : "text-muted-foreground"}`}>
              {choice.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
