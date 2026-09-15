import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The panel's notes about a machine session, and the properties that keep them
 * safe to write (ticket P10, slice 2).
 *
 * The machine records no per-item approval and no publication date, so the
 * panel keeps both. They lived in `localStorage` first, which made them
 * per-browser and per-device — a person's approvals did not survive a change of
 * machine, or a cleared browser. They live beside the session now, in its own
 * run directory, which means this route writes to the FILESYSTEM with a
 * caller-supplied path segment. Everything below exists because of that.
 *
 * Static, like `provider-key.test.ts`: these are properties of the source, so
 * they can be read off it, which means they can be kept.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const ROUTE = join(ROOT, "apps/web/app/api/machine/notes/[sessionId]/route.ts");
const STORE = join(ROOT, "apps/web/lib/machine/browser-review-store.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/** Strips comments, so prose about a rule is never mistaken for the rule. */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

describe("the session notes route", () => {
  const source = read(ROUTE);
  const code = codeOnly(source);

  it("validates the session id before it can become a path segment", () => {
    /*
      The id is interpolated into a filesystem path, so the pattern IS the
      traversal defence: twelve hex characters cannot contain a dot, a slash, a
      backslash, or a percent-encoded anything. Both verbs must check it.
    */
    expect(source).toContain("^[a-f0-9]{12}$");
    const guards = code.match(/SESSION_ID\.test\(/g) ?? [];
    expect(guards.length, "both GET and PUT must check the id").toBeGreaterThanOrEqual(2);
  });

  it("confines every resolved path inside the runs root", () => {
    // Belt to the id pattern's braces: if that pattern is ever loosened, this
    // is what stops the loosening from becoming an arbitrary file write.
    expect(code).toMatch(/resolve\(/);
    expect(code, "a resolved path must be checked against its root").toMatch(
      /startsWith\(\s*root/,
    );
  });

  it("applies the same four forgery checks as the write proxy", () => {
    /*
      It spends nothing, which is exactly why it is easy to think it needs less.
      It decides what the panel believes a person approved, and an output
      assembles from approvals — so a page that could write here could publish
      on someone's behalf.
    */
    expect(source).toContain("x-drop-machine-write");
    expect(source).toContain("sec-fetch-site");
    expect(source).toContain('headers.get("origin")');
    expect(source).toContain("application/json");
  });

  it("writes the notes file private to the owner", () => {
    expect(code, "notes are the person's decisions, not world-readable").toContain("0o600");
  });

  it("caps what it will read or write", () => {
    // Notes are decisions and dates, never content. An unbounded write here is
    // an unbounded write into the machine's own run directory.
    expect(code).toMatch(/MAX_BYTES/);
  });

  it("exports no verb that could delete a session's notes", () => {
    for (const verb of ["DELETE", "POST", "PATCH", "OPTIONS"]) {
      expect(code, `${verb} must not be exported from the notes route`).not.toMatch(
        new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`),
      );
    }
  });

  it("never opens the machine's own session file", () => {
    /*
      `session_state.json` is the machine's, `panel-notes.json` is the panel's,
      and the split is what makes "the vendored service is untouched"
      (ADR-0021 D2) true at runtime rather than only in the source tree.
    */
    expect(code).not.toContain("session_state");
  });
});

describe("the notes client", () => {
  const source = read(STORE);
  const code = codeOnly(source);

  it("carries forward decisions made before the notes were durable", () => {
    /*
      The old `localStorage` key is still read, once, and pushed up. Someone who
      reviewed content before this existed must not lose those decisions to an
      upgrade they never asked for.
    */
    expect(source).toContain("drop-machine-review-v1:");
    expect(code, "a migration that does not clear its source runs forever").toMatch(
      /removeItem/,
    );
  });

  it("fails loudly when a decision cannot be saved", () => {
    /*
      The failure this whole change exists to prevent is a decision going
      missing. A write that swallows its own error reproduces that with extra
      steps — the person sees the card turn approved and finds it unapproved
      on the next load.
    */
    expect(code).toMatch(/throw new Error/);
  });
});
