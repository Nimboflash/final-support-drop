// P1 AC-P1.4 (09 §3): all colors live in the ONE theme file. This scan fails
// on any color literal in UI or app source outside packages/ui/src/theme.css.
//
// Two blind spots, both found by an audit rather than by this scan, both now
// closed. It scanned `apps/web/app` but not `apps/web/components`, where
// thirteen of the fourteen panel surfaces actually live. And it looked only for
// CSS literals, so `text-white` and `bg-black/50` walked straight past it —
// Tailwind's own palette is a colour the theme file has never heard of, which
// is exactly what this rule exists to prevent. The destructive button carried a
// hardcoded white label for as long as it did because of the second one.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SCAN_ROOTS = [
  "packages/ui/src",
  "packages/workflow-ui/src",
  "apps/web/app",
  "apps/web/components",
];
const THEME_FILE = join("packages", "ui", "src", "theme.css");
const COLOR = /#[0-9a-fA-F]{3,8}\b|(?:\brgba?|\bhsla?|\boklch)\(/;

// Tailwind's built-in palette, reachable as a utility and therefore never
// caught by the literal pattern above. `current`, `transparent` and `inherit`
// are NOT colours — they defer to something else — so they stay allowed.
const TAILWIND_PALETTE =
  "black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|" +
  "teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PALETTE_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|placeholder|caret|shadow|accent|decoration)` +
    String.raw`-(?:${TAILWIND_PALETTE})(?:-\d{2,3})?(?:\/\d{1,3})?\b`,
  "",
);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|css)$/.test(name)) yield p;
  }
}

let bad = 0;
for (const scanRoot of SCAN_ROOTS) {
  for (const file of walk(join(root, scanRoot))) {
    const rel = relative(root, file);
    if (rel === THEME_FILE) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (COLOR.test(line)) {
        console.error(`${rel}:${i + 1}: color literal outside the theme file: ${line.trim().slice(0, 80)}`);
        bad++;
      }
      const palette = PALETTE_UTILITY.exec(line);
      if (palette !== null) {
        console.error(
          `${rel}:${i + 1}: Tailwind palette color "${palette[0]}" — use a theme token: ${line.trim().slice(0, 80)}`,
        );
        bad++;
      }
    });
  }
}
if (bad > 0) process.exit(1);
console.log(
  "check-token-literals: no color literal and no Tailwind palette color outside packages/ui/src/theme.css",
);
