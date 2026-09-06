import { describe, expect, it } from "vitest";
import { normalizeSeed } from "./normalize";
import { roleForDemoRoleString } from "./demo-profiles";

describe("the V2 seed materializes through the P2 schemas (AC-P3.1)", () => {
  it("loads without throwing", () => {
    expect(() => normalizeSeed(roleForDemoRoleString)).not.toThrow();
  });

  it("carries the seeded world", () => {
    const world = normalizeSeed(roleForDemoRoleString);
    expect(world.projects.length).toBeGreaterThanOrEqual(3);
    expect(world.concepts.length).toBeGreaterThanOrEqual(4);
    expect(world.content.length).toBeGreaterThanOrEqual(6);
  });

  it("normalizes every wire literal to a stored code", () => {
    const world = normalizeSeed(roleForDemoRoleString);
    for (const concept of world.concepts) {
      expect(concept.reviewStatus).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
    for (const project of world.projects) {
      expect(project.stage).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});
