import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/**
 * Seam F — CI actually runs the checks it claims to.
 *
 * `docs/handoff/P8-frontend-to-machine-build.md` §6.1 recorded the absence of
 * CI as the repository's highest standing risk: every guard here was advisory
 * until a human ran it. This suite is the guard on the guard.
 *
 * The failure mode it exists for is quiet: someone comments out a slow step to
 * unblock a merge, or adds a seventh check command to `package.json` and never
 * wires it in. Either leaves a green tick that means less than it did, and
 * nothing else in the repository would notice.
 */
const ROOT = join(__dirname, "..", "..");
const WORKFLOW_PATH = join(ROOT, ".github", "workflows", "checks.yml");

interface WorkflowStep {
  readonly run?: string;
  readonly uses?: string;
  readonly with?: Record<string, unknown>;
  readonly if?: string;
}
interface WorkflowJob {
  readonly "runs-on": string;
  readonly steps: readonly WorkflowStep[];
  readonly "timeout-minutes"?: number;
}
interface Workflow {
  readonly on: Record<string, unknown>;
  readonly jobs: Record<string, WorkflowJob>;
  readonly concurrency?: Record<string, unknown>;
}

const workflow = parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;
const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
  packageManager: string;
  engines: { node: string };
};

/** The canonical set, from CLAUDE.md's "Build discipline". */
const CHECK_COMMANDS = [
  "pnpm typecheck",
  "pnpm lint",
  "pnpm test",
  "pnpm test:db",
  "pnpm test:e2e",
  "pnpm build",
] as const;

function everyRunStep(): string[] {
  return Object.values(workflow.jobs).flatMap((job) =>
    job.steps.filter((s) => typeof s.run === "string").map((s) => s.run!.trim()),
  );
}

describe("CI runs every canonical check (P8 §6.1)", () => {
  it.each(CHECK_COMMANDS)("runs `%s`", (command) => {
    const runs = everyRunStep();
    expect(
      runs.some((step) => step.split("\n").some((line) => line.trim() === command)),
      `no CI step runs \`${command}\`; the checks are advisory again`,
    ).toBe(true);
  });

  it("the canonical list is the whole of package.json's check scripts", () => {
    // If a seventh check is added to the manifest, this fails until it is
    // added above AND to the workflow — the list cannot rot into a subset.
    const NON_CHECK_SCRIPTS = new Set(["dev"]);
    const declared = Object.keys(manifest.scripts)
      .filter((name) => !NON_CHECK_SCRIPTS.has(name))
      .map((name) => `pnpm ${name}`)
      .sort();
    expect(declared).toEqual([...CHECK_COMMANDS].sort());
  });
});

describe("CI uses the same toolchain a developer does", () => {
  it("takes the Node version from .nvmrc rather than pinning a second one", () => {
    // Two pinned versions drift, and the one that drifts is always the one
    // nobody reads. `.nvmrc` is the single source.
    const nodeSteps = Object.values(workflow.jobs).flatMap((job) =>
      job.steps.filter((s) => s.uses?.startsWith("actions/setup-node")),
    );
    expect(nodeSteps.length).toBeGreaterThan(0);
    for (const step of nodeSteps) {
      expect(step.with?.["node-version-file"], "CI must read .nvmrc").toBe(".nvmrc");
      expect(step.with?.["node-version"], "a second pinned Node version will drift").toBeUndefined();
    }
  });

  it("the file the workflow points at actually exists, and is a version", () => {
    /*
      The first version of this guard checked only that the workflow NAMED
      `.nvmrc`. The file did not exist, the guard was green, and CI failed on
      its first run with "the specified node version file does not exist" —
      a guard asserting a reference without asserting the referent.
    */
    const nvmrc = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
    expect(nvmrc, ".nvmrc must hold a version").toMatch(/^v?\d+\.\d+\.\d+$/);

    // And it must satisfy what the manifest demands, or a developer following
    // `.nvmrc` installs a Node the repository refuses to run on.
    const floor = Number(/>=\s*(\d+)/.exec(manifest.engines.node)?.[1] ?? "0");
    const major = Number(nvmrc.replace(/^v/, "").split(".")[0]);
    expect(major, `.nvmrc pins Node ${String(major)}; engines requires >=${String(floor)}`)
      .toBeGreaterThanOrEqual(floor);
  });

  it("every file the workflow reads is committed", () => {
    // The same failure shape, generalised: a workflow that points at an
    // untracked file is green locally and red on a clean checkout.
    const referenced = [".nvmrc", "package.json", "pnpm-lock.yaml"];
    const tracked = execFileSync("git", ["ls-files", ...referenced], { cwd: ROOT })
      .toString()
      .split("\n")
      .filter(Boolean);
    for (const file of referenced) {
      expect(tracked, `${file} is referenced by CI but not committed`).toContain(file);
    }
  });

  it("takes pnpm from the packageManager field", () => {
    const pnpmSteps = Object.values(workflow.jobs).flatMap((job) =>
      job.steps.filter((s) => s.uses?.startsWith("pnpm/action-setup")),
    );
    expect(pnpmSteps.length).toBeGreaterThan(0);
    for (const step of pnpmSteps) {
      expect(step.with?.version, "pnpm's version belongs in packageManager").toBeUndefined();
    }
    expect(manifest.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
  });

  it("installs with a frozen lockfile", () => {
    // `check-pinned.mjs` requires exact versions; an install that is allowed to
    // resolve freely would make that check true of a tree nobody reviewed.
    const installs = everyRunStep().filter((step) => step.includes("pnpm install"));
    expect(installs.length).toBeGreaterThan(0);
    for (const step of installs) expect(step).toContain("--frozen-lockfile");
  });
});

describe("the visual gate runs where its baselines were made", () => {
  it("the e2e job is on macOS, because the baselines are darwin-pinned", () => {
    // Playwright names snapshots per platform. Committed baselines end in
    // `-chromium-darwin.png`, so a Linux runner would not find them — and if
    // it did, it would be comparing text rendered by a different stack.
    const e2eJobs = Object.entries(workflow.jobs).filter(([, job]) =>
      job.steps.some((s) => s.run?.includes("test:e2e")),
    );
    expect(e2eJobs.length).toBe(1);
    expect(e2eJobs[0]![1]["runs-on"]).toMatch(/^macos/);
  });

  it("failures upload the report, so a red run can be read", () => {
    const uploads = Object.values(workflow.jobs).flatMap((job) =>
      job.steps.filter((s) => s.uses?.startsWith("actions/upload-artifact")),
    );
    expect(uploads.length).toBeGreaterThan(0);
    expect(uploads.some((s) => s.if === "failure()")).toBe(true);
  });
});

describe("the workflow cannot hang or pile up", () => {
  it("every job has a timeout", () => {
    for (const [name, job] of Object.entries(workflow.jobs)) {
      expect(job["timeout-minutes"], `${name} has no timeout`).toBeGreaterThan(0);
    }
  });

  it("a superseded run is cancelled, except on an integration branch", () => {
    expect(workflow.concurrency).toBeDefined();
    const rule = String(workflow.concurrency?.["cancel-in-progress"]);
    for (const branch of ["main", "v2"]) {
      expect(rule, `a landed change on ${branch} can lose its run`).toContain(branch);
    }
  });

  it("runs on every branch and on pull requests to both integration branches", () => {
    /*
      `v2` is where work happens; `main` is frozen as v1. A workflow that only
      watched pull requests into `main` would let every v2 pull request merge
      unchecked — which is the shape of the risk CI was added to remove, just
      relocated to a different branch.
    */
    const on = workflow.on as {
      push?: { branches?: string[] };
      pull_request?: { branches?: string[] };
    };
    expect(on.push?.branches).toContain("**");
    for (const branch of ["main", "v2"]) {
      expect(on.pull_request?.branches, `pull requests into ${branch} are unchecked`).toContain(
        branch,
      );
    }
  });
});
