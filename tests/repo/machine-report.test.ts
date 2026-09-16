import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The report route reads ONE file from the machine's run directory and nothing
 * else. It sits beside the notes route and must keep the same discipline:
 * the id is validated before it can become a path segment, the resolved path
 * is confined to the runs root, it serves — never writes — and it never opens
 * the machine's own session file.
 */
const ROOT = join(__dirname, "..", "..");
const ROUTE = join(ROOT, "apps", "web", "app", "api", "machine", "report", "[sessionId]", "route.ts");

function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
}

describe("the report route (ADR-0028)", () => {
  const source = readFileSync(ROUTE, "utf8");
  const code = codeOnly(source);

  it("validates the session id before it can become a path segment", () => {
    expect(source).toContain("^[a-f0-9]{12}$");
    expect(code).toMatch(/SESSION_ID\.test\(sessionId\)/);
  });

  it("confines every resolved path inside the runs root", () => {
    expect(code).toMatch(/resolve\(/);
    expect(code).toMatch(/startsWith\(root \+ "\/"\)/);
  });

  it("serves exactly one named file and never the session state", () => {
    expect(code).toContain("final_report.md");
    expect(code).not.toContain("session_state");
    expect(code).not.toContain("panel-notes");
  });

  it("exports GET and no verb that could write", () => {
    expect(code).toMatch(/export async function GET/);
    for (const verb of ["PUT", "POST", "DELETE", "PATCH"]) {
      expect(code).not.toMatch(new RegExp(`export (async )?function ${verb}\\b`));
    }
    expect(code).not.toMatch(/writeFileSync|mkdirSync|unlinkSync|rmSync/);
  });

  it("caps what it will serve", () => {
    expect(code).toMatch(/MAX_BYTES/);
  });

  it("is absent unless the machine is configured", () => {
    expect(code).toContain("DROP_MACHINE_BASE_URL");
  });
});
