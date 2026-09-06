import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Ticket P2, Seam F — the V2 delta's structural invariants (AC-P2.19, AC-P2.21,
 * AC-P2.22).
 *
 * These are the claims ADR-0019 makes that a type checker cannot enforce: that
 * an interface stayed read-only, that a package stayed transport-free, and that
 * a fixture layer stayed deterministic. Each is asserted against the source
 * text, because each fails silently at runtime if it ever stops being true.
 */
const ROOT = join(__dirname, "..", "..");
const MG = join(ROOT, "packages", "machine-gateway", "src");
const PD = join(ROOT, "packages", "panel-domain", "src");

function read(...parts: string[]): string {
  return readFileSync(join(...parts), "utf8");
}

/**
 * Strip comments and string literals before scanning for code.
 *
 * Without this the scans read their own documentation: a comment explaining the
 * clock re-base contains the old epoch, and a Persian rule string containing the
 * words "Request changes" matches a DOM-type regex. Both would be false
 * positives that make the guard useless — or worse, make someone weaken it.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("PanelGateway stays read-only (AC-P2.19; ADR-0018 D1, ADR-0019 D3)", () => {
  const source = read(MG, "panel-gateway.ts");

  it("declares exactly its seven recorded members", () => {
    const members = [...source.matchAll(/^\s{2}(\w+)\(/gm)].map((m) => m[1]);
    expect(members).toEqual([
      "listPrograms",
      "getProgram",
      "listWeeklyLenses",
      "getWeeklyLens",
      "listApprovalRequests",
      "listRetrievalRequests",
      "listNotifications",
    ]);
  });

  it("carries no mutating verb", () => {
    // The owner condition is that this interface is READ-ONLY. A write here
    // would open the second decision path ADR-0013 D1 exists to remove — so the
    // V2 mutations live on PanelCommandGateway instead (ADR-0019 D3).
    const members = [...source.matchAll(/^\s{2}(\w+)\(/gm)].map((m) => m[1] ?? "");
    const MUTATING = /^(create|update|delete|set|add|remove|submit|amend|select|export|subscribe|request|start|pause|retry)/;
    for (const member of members) {
      expect(member, `PanelGateway.${member} looks like a mutation`).not.toMatch(MUTATING);
    }
  });

  it("the write surface exists elsewhere, so nothing was merely dropped", () => {
    const command = read(MG, "panel-command-gateway.ts");
    for (const method of [
      "createProject", "addComment", "selectConcepts", "amendOutputPlan",
      "updateCalendar", "updateCalendarPackage", "exportPackage", "subscribe",
    ]) {
      expect(command, `PanelCommandGateway must declare ${method}`).toContain(`${method}(`);
    }
    expect(read(MG, "revision-gateway.ts")).toContain("requestRevision(");
  });

  it("the review facade belongs to no gateway interface (ADR-0019 D4)", () => {
    for (const file of ["machine-gateway.ts", "panel-gateway.ts", "panel-command-gateway.ts"]) {
      expect(read(MG, file), `${file} must not declare reviewItem`).not.toContain("reviewItem(");
    }
    expect(read(MG, "review-application-service.ts")).toContain("reviewItem(");
  });
});

describe("the contract packages stay transport-free (AC-P2.21; ADR-0019 D17)", () => {
  it("tsconfig.base.json still pins lib to ES2023 only", () => {
    const base = JSON.parse(read(ROOT, "tsconfig.base.json")) as {
      compilerOptions: { lib: string[] };
    };
    // Widening this to include DOM would let Blob, File and fetch into every
    // contract module — which is exactly why exportPackage returns bytes.
    expect(base.compilerOptions.lib).toEqual(["ES2023"]);
  });

  it("no DOM type appears in either package", () => {
    const DOM = /\b(Blob|FormData|XMLHttpRequest|localStorage|sessionStorage|window|document|HTMLElement)\b/;
    for (const file of [...walk(MG), ...walk(PD)]) {
      const offenders = codeOnly(readFileSync(file, "utf8"))
        .split("\n")
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => DOM.test(line));
      expect(
        offenders,
        `${file.slice(ROOT.length + 1)} uses a DOM type: ${offenders.map((o) => o.line).join(" | ")}`,
      ).toEqual([]);
    }
  });
});

describe("one clock, no entropy (AC-P2.22; ADR-0019 D16)", () => {
  const fixtureFiles = [...walk(join(PD, "fixtures")), ...walk(join(MG, "conformance"))];

  it("no pre-V2 clock literal survives in fixtures or conformance", () => {
    for (const file of fixtureFiles) {
      // Comments are stripped: valid.ts documents the re-base by naming the old
      // epoch, which is exactly the sort of note this guard should not punish.
      expect(
        codeOnly(readFileSync(file, "utf8")),
        `${file.slice(ROOT.length + 1)} still carries the old 2026-08-21 epoch`,
      ).not.toContain("2026-08-21");
    }
  });

  it("the +03:30 rejection fixture survives the re-base", () => {
    // This one is load-bearing: it is the fixture proving
    // INSTANT_MUST_BE_UTC_ISO_8601, so a careless clock sweep that "fixed" its
    // offset would delete the only proof that offsets are rejected.
    const invalid = read(PD, "fixtures", "invalid.ts");
    expect(invalid).toContain("+03:30");
    expect(invalid).toContain("INSTANT_MUST_BE_UTC_ISO_8601");
  });

  it("Date.now and Math.random are unreachable from fixture and adapter code", () => {
    for (const file of fixtureFiles) {
      const offenders = codeOnly(readFileSync(file, "utf8"))
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /\bDate\.now\b|\bMath\.random\b|new Date\(\s*\)/.test(line));
      expect(
        offenders,
        `${file.slice(ROOT.length + 1)} reintroduces entropy: ${offenders.join(" | ")}`,
      ).toEqual([]);
    }
  });
});

describe("ApprovalCommand has exactly one construction site (AC-P6.2)", () => {
  /**
   * ADR-0013 D1 says the approval endpoint is the only write path. An interface
   * shape cannot enforce that on its own: any module could assemble an
   * ApprovalCommand and hand it to the gateway, and the result would still
   * type-check. What keeps the rule true is that exactly ONE module builds one.
   *
   * Counted structurally rather than by grep for a name, so a rename cannot
   * quietly satisfy it.
   */
  function sourceFiles(): string[] {
    return [
      ...walk(join(ROOT, "packages", "machine-gateway", "src")),
      ...walk(join(ROOT, "packages", "mock-data", "src")),
      ...walk(join(ROOT, "apps", "web", "lib")),
      ...walk(join(ROOT, "apps", "web", "components")),
    ].filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));
  }

  /**
   * The two modules permitted to construct one, named explicitly rather than
   * excluded by a pattern — a blanket exclusion would let a third slip in.
   *
   *  - the mock adapter's review facade: the single write path itself;
   *  - the conformance reference world: the deliberately minimal implementation
   *    that exists to prove the suite can run AND fail, and which the suite
   *    severs to demonstrate no second path exists.
   */
  const PERMITTED_BUILDERS = [
    "packages/machine-gateway/src/conformance/review-reference-world.ts",
    "packages/machine-gateway/src/mock/mock-world.ts",
  ];

  it("only the review facade and its conformance reference build an approval command", () => {
    // The tell of a construction: an object literal carrying the two fields
    // only an ApprovalCommand has together.
    const builders = sourceFiles().filter((file) => {
      const source = readFileSync(file, "utf8");
      return /approvalRequestId\s*:/.test(source) && /subjectVersionId\s*:/.test(source);
    });
    expect(
      builders.map((f) => f.slice(ROOT.length + 1)).sort(),
      "no module outside the recorded two may construct an ApprovalCommand",
    ).toEqual(PERMITTED_BUILDERS);
  });

  it("no surface calls submitApproval directly", () => {
    for (const file of [
      ...walk(join(ROOT, "apps", "web", "components")),
      ...walk(join(ROOT, "apps", "web", "app")),
    ]) {
      expect(
        codeOnly(readFileSync(file, "utf8")),
        `${file.slice(ROOT.length + 1)} must reach the write path through reviewItem`,
      ).not.toContain("submitApproval");
    }
  });

  it("no gate verb exists as a run command anywhere", () => {
    // ADR-0013 D2 removed these from the runtime command set; they must not
    // reappear as strings a caller could send.
    for (const file of sourceFiles()) {
      const code = codeOnly(readFileSync(file, "utf8"));
      for (const verb of ["APPROVE_GATE", "REQUEST_CHANGES_GATE", "ESCALATE_GATE"]) {
        expect(code, `${file.slice(ROOT.length + 1)} names ${verb}`).not.toContain(verb);
      }
    }
  });
});
