// Ticket 0.1 AC-7 (05 §2): every registry dependency is an exact pinned version.
// workspace:* is the internal-edge protocol and is allowed; engines/packageManager
// are runtime declarations, not registry ranges.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifests = ["package.json"];
for (const kind of ["apps", "packages"]) {
  for (const dir of readdirSync(join(root, kind))) {
    const p = join(kind, dir, "package.json");
    if (existsSync(join(root, p))) manifests.push(p);
  }
}

let bad = 0;
for (const m of manifests) {
  const pkg = JSON.parse(readFileSync(join(root, m), "utf8"));
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (range.startsWith("workspace:")) continue;
      if (!/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(range)) {
        console.error(`${m}: ${field}.${name}="${range}" is not an exact semver version`);
        bad++;
      }
    }
  }
}
if (bad > 0) process.exit(1);
console.log(`check-pinned: ${manifests.length} manifests, all registry deps exact`);
