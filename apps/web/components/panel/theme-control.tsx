"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@drop/ui";

/**
 * Choosing the theme (ADR-0025).
 *
 * A segmented control of three, in the pattern every settings surface in the
 * reference set uses: the current choice is the FILLED one and the alternatives
 * are quiet. That is also the point being made — this panel had thirty-five
 * outline buttons and no filled one anywhere, so nothing on any screen read as
 * the thing you had chosen or the thing to press.
 *
 * Rendered only after mount. `next-themes` cannot know the stored choice on the
 * server, so anything drawn before hydration is a guess, and a guess here shows
 * the wrong option selected for a frame.
 */
/** Chrome, not content — hence `label`, not `labelFa` (see bidi-isolation). */
const CHOICES = [
  { value: "system", label: "مثل سیستم" },
  { value: "light", label: "روشن" },
  { value: "dark", label: "تیره" },
] as const;

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="theme-control">
      {CHOICES.map((choice) => {
        const active = mounted && (theme ?? "system") === choice.value;
        return (
          <Button
            key={choice.value}
            size="sm"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            data-testid={`theme-${choice.value}`}
            onClick={() => setTheme(choice.value)}
          >
            {choice.label}
          </Button>
        );
      })}
    </div>
  );
}
