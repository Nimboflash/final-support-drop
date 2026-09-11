import { cn } from "../../lib/utils"

/**
 * Card — the surface the whole V2 journey is built on: concept cards, content
 * cards, project cards, counter tiles, package cards (V2 02 §6).
 *
 * Padding is 24px (`px-6`, `py-6`), inside the 20–24px the brief asks for, with
 * a modest consistent radius. Logical properties only — the lint rule forbids
 * physical direction classes here.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // `drop-material` (ADR-0022): the aluminium sheen and lit top edge that
        // make a raised surface legible on a Charcoal ground. Six points of
        // grey between `--background` and `--card` is not enough on its own,
        // and pushing the card lighter instead would have flattened the whole
        // dark workspace toward mid-grey.
        "drop-material flex flex-col gap-6 rounded-lg border bg-card py-6 text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      // `min-w-0`: CardTitle is a grid item of CardHeader, and a grid item's
      // default `min-width: auto` means it can never shrink below its content.
      // One unbreakable title therefore widens the column and pushes the card
      // off the side of the screen instead of ellipsising inside it.
      className={cn("min-w-0 leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
