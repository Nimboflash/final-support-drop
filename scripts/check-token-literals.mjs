// P1 AC-P1.4 (09 §3): all colors live in the ONE theme file. This scan fails
// on any color literal (#hex / rgb() / hsl() / oklch()) in UI or app source
// outside packages/ui/src/theme.css.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SCAN_ROOTS = ["packages/ui/src", "packages/workflow-ui/src", "apps/web/app"];
const THEME_FILE = join("packages", "ui", "src", "theme.css");
const COLOR = /#[0-9a-fA-F]{3,8}\b|(?:\brgba?|\bhsla?|\boklch)\(/;

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
    });
  }
}
if (bad > 0) process.exit(1);
console.log("check-token-literals: no color literal outside packages/ui/src/theme.css");
