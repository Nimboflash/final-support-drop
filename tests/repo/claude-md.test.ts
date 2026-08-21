import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Ticket 0.1 AC-6 — CLAUDE.md carries every 16 §2 required section,
// plus the ADR-0011 authority ruling with its pending-ratification flag.
const md = readFileSync(join(__dirname, "..", "..", "CLAUDE.md"), "utf8");

describe("root CLAUDE.md (AC-6)", () => {
  it.each([
    ["authority hierarchy section", /## Authority order \(ADR-0011/],
    ["ratified authority ruling (ADR-0018 D5)", /ratified.*(ADR-0018|owner)|ADR-0018 D5/i],
    ["doc 18 scope tier in the order", /18_.*build scope|doc 18/i],
    ["non-negotiables from 00 §4", /## Non-negotiables/],
    ["package dependency rules", /## Package dependency rules/],
    ["release-gate stop rule", /Stop at every release gate/i],
    ["pointer to Master Build Spec v1.0", /DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1\.0/],
    ["pointer to Brand DNA v3.0", /DROP_BRAND_DNA_v3\.0/],
    ["pointer to the implementation pack", /docs\/implementation\//],
    ["pointer to ADR 0010", /ADR[ _]?0010/i],
    ["pointer to spec-v0 / master document / execution plan", /spec-v0.*project-master-document|project-master-document.*spec-v0/s],
  ])("contains %s", (_label, pattern) => {
    expect(md).toMatch(pattern);
  });
});
