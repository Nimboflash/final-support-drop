import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Ticket P9, Seam F — no control on a panel surface may do nothing.
 *
 * This guard exists because the restructure shipped one: «افزودن منبع» sat
 * beside a message saying a source was missing, looked enabled, and had no
 * handler at all. Every check was green. Typecheck cannot see it — a `<Button>`
 * with no `onClick` is perfectly well typed. Lint cannot see it. The e2e that
 * covered the surface asserted the button was VISIBLE and ENABLED, which it
 * was, so the test certified the defect rather than catching it.
 *
 * The owner's report of the previous panel was "click is not working". A dead
 * affordance is exactly that, and it is worse than an absent one: the person
 * concludes the product is broken, and on that evidence they are right.
 *
 * A button on a panel surface must therefore do one of four things, all of them
 * visible in its own opening tag:
 *   - `onClick`      — it acts
 *   - `asChild`      — it delegates to the link or trigger it wraps
 *   - `type="submit"`— the form around it acts
 *   - `disabled`     — it is deliberately unavailable, and says so on screen
 */
const ROOT = join(__dirname, "..", "..");
const SURFACE_DIRS = [
  join(ROOT, "apps", "web", "app", "studio"),
  join(ROOT, "apps", "web", "components", "panel"),
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

/**
 * A `<Button>` can be given its behaviour by the component WRAPPING it —
 * `DropdownMenuTrigger asChild`, `SheetTrigger asChild`, `PopoverTrigger
 * asChild` all clone their child and attach the handler. Those are live, so
 * only a bare `<Button>` counts.
 */
const DELEGATING_PARENT = /asChild\s*>$/;

interface Control {
  readonly file: string;
  readonly line: number;
  readonly tag: string;
}

function inertButtons(source: string, file: string): Control[] {
  const found: Control[] = [];
  for (const match of source.matchAll(/<Button\b[^>]*?>/gs)) {
    const tag = match[0];
    if (/\bonClick\b|\basChild\b|type="submit"|\bdisabled\b/.test(tag)) continue;

    const before = source.slice(0, match.index);
    // The immediately-enclosing element, whatever it is called: whitespace is
    // all that may separate a delegating trigger from the button it clones.
    if (DELEGATING_PARENT.test(before.trimEnd())) continue;

    found.push({ file, line: before.split("\n").length, tag: tag.replace(/\s+/g, " ") });
  }
  return found;
}

describe("no panel control is inert (ticket P9)", () => {
  it("every button acts, delegates, submits, or is explicitly disabled", () => {
    const inert = SURFACE_DIRS.flatMap((dir) => walk(dir)).flatMap((file) =>
      inertButtons(readFileSync(file, "utf8"), file.slice(ROOT.length + 1)),
    );

    expect(
      inert,
      inert.map((c) => `${c.file}:${String(c.line)} — ${c.tag}`).join("\n"),
    ).toEqual([]);
  });

  it("recognises a delegating trigger as live, and a bare button as inert", () => {
    // The guard is only worth having if it can tell these two apart, so both
    // halves are asserted here rather than assumed.
    const delegating = `
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">تاریخچه</Button>
      </DropdownMenuTrigger>`;
    expect(inertButtons(delegating, "fixture.tsx")).toEqual([]);

    const bare = `
      <div>
        <Button size="sm" variant="outline" data-testid="add-source">افزودن منبع</Button>
      </div>`;
    expect(inertButtons(bare, "fixture.tsx")).toHaveLength(1);
  });
});
