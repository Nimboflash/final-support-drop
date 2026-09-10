#!/usr/bin/env node
/**
 * Runs the machine service's own test suite.
 *
 * A node script rather than a one-line shell command because the right Python
 * interpreter differs by environment, and getting it wrong is a confusing
 * failure rather than an obvious one:
 *
 *   - locally, the dependencies live in `services/concept-portfolio/.venv`,
 *     created by `pnpm machine:install`. The system `python3` on a Mac is
 *     3.9 with none of them, so calling it produces a ModuleNotFoundError that
 *     looks like broken code rather than a missing venv.
 *   - in CI there is no venv: `actions/setup-python` provides the interpreter
 *     and the dependencies are installed into it directly.
 *
 * So: prefer the venv when it exists, fall back to whatever `python3` is, and
 * say which one was used.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SERVICE = join("services", "concept-portfolio");
const VENV_PYTHON = join(SERVICE, ".venv", "bin", "python");

const python = existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";
console.log(`machine tests: using ${python}`);

const result = spawnSync(python, ["-m", "pytest", join(SERVICE, "tests"), "-q"], {
  stdio: "inherit",
  env: {
    ...process.env,
    // The package is not installed; it is imported from source, so the tests
    // run against exactly the files in the tree.
    PYTHONPATH: join(SERVICE, "src"),
    // Session runs are written to disk. Keep them out of the working tree.
    DROP_RUNS_DIR: join(SERVICE, "drop_runs"),
    DROP_BACKEND: "mock",
  },
});

if (result.error) {
  console.error(
    `\ncould not run ${python}. If this is a local checkout, run: pnpm machine:install\n`,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
