"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  /*
    `transition-all` with nothing to transition: a press produced no feedback at
    all, so the only confirmation that a button had been pressed was whatever
    happened afterwards — which for a machine call is tens of seconds later.

    `active:scale-[0.97]` and the shared motion timing fix that. The scale is
    small on purpose: this is a dense operational panel, and a button that
    visibly squashes reads as a toy. It is enough to feel and not enough to see.

    `duration-[--motion-fast]` rather than a number, so a press here and a press
    on a card are the same press — and so `prefers-reduced-motion` turns both
    off in one place (theme.css).
  */
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-[--motion-fast] ease-[--ease-out] active:scale-[0.97] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * `pending` is the one way a button says "I heard you, and it is not done".
 *
 * Every mutation in the panel used to say it differently: some swapped the
 * label for «در حال ارسال…», most only greyed out, and a greyed-out button is
 * indistinguishable from one that is unavailable. A pending button keeps its
 * label, gains a spinner, disables itself and announces `aria-busy`, so a
 * paid machine call that takes forty seconds looks like exactly that on the
 * control that started it.
 *
 * Not injected under `asChild`: a Slot needs one child, and a link is never
 * pending.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** A request this button started is still running. Disables and shows a spinner. */
    pending?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-pending={pending ? "true" : undefined}
      aria-busy={pending ? true : undefined}
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/*
        A Slot needs EXACTLY one element child. `{null}{children}` is two
        children as far as React.Children is concerned, and Radix's SlotClone
        throws on it — which took down every overlay that rendered a link
        through `<Button asChild>` the moment it opened. The spinner is only
        ever composed for a real button.
      */}
      {asChild ? (
        children
      ) : (
        <>
          {pending ? (
            <Loader2Icon aria-hidden="true" className="animate-spin [animation-duration:650ms]" />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
