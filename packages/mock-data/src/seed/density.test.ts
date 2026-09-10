import { describe, expect, it } from "vitest";
import { idSchema } from "@drop/panel-domain";
import { baseWorld, resetBaseWorldCache } from "./base-world";
import { derivedId } from "./density";

/** Ticket P3, scenario seam — AC-P3.4 density and AC-P3.6 isolation. */
describe("base-world density (AC-P3.4)", () => {
  const world = baseWorld();

  it("holds seven projects", () => {
    expect(world.projects).toHaveLength(7);
  });

  it("covers every stage V2 04 §2 names", () => {
    const byId = new Map(world.projects.map((p) => [p.id, p]));
    // empty/new
    expect(byId.get("p4")?.stage).toBe("DRAFT");
    expect(byId.get("p4")?.input).toEqual({ mode: "BLANK" });
    // research, review and blocked all live in p1's branch
    expect(byId.get("p1")?.stage).toBe("RESEARCH_CONTENT");
    expect(world.concepts.some((c) => c.projectId === "p1" && c.reviewStatus === "IN_REVIEW")).toBe(true);
    expect(world.content.some((c) => c.projectId === "p1" && c.generationState === "BLOCKED")).toBe(true);
    // ready-package without a date, and scheduled
    expect(byId.get("p5")?.stage).toBe("PACKAGE");
    expect(byId.get("p5")?.targetDate).toBeNull();
    expect(byId.get("p6")?.targetDate).toBe("2026-09-15");
    // Weekly Lens
    expect(byId.get("p3")?.type).toBe("WEEKLY_LENS");
    // p1 covers BLOCKED (a missing source, which a person can supply); p7
    // covers FAILED (a build that did not finish, which no source fixes). The
    // two must both exist in the base world, because the surfaces say different
    // things about them and only a world carrying both exercises that.
    expect(world.content.some((c) => c.projectId === "p7" && c.generationState === "FAILED")).toBe(true);

    // The unscheduled tray needs something in it. ADR-0019 D7's «PLANNED with
    // a null date» was unreachable in every world until p5 carried one.
    expect(world.calendar.some((entry) => entry.date === null)).toBe(true);
  });

  it("carries at least three concept cards and four content items in the main journey", () => {
    expect(world.concepts.filter((c) => c.projectId === "p1").length).toBeGreaterThanOrEqual(3);
    expect(world.content.filter((c) => c.projectId === "p1").length).toBeGreaterThanOrEqual(4);
  });

  it("invents no id: every one is from the brief or the derived-id rule", () => {
    for (const project of world.projects) {
      expect(idSchema.safeParse(project.id).success, `${project.id} must parse`).toBe(true);
    }
    // The rule is mechanical and total, so a derived id is reconstructible.
    expect(derivedId("o5", "p5")).toBe("o5-p5");
    expect(world.content.some((c) => c.id === "o5-p5")).toBe(true);
  });

  it("keeps every cloned branch internally consistent", () => {
    for (const project of world.projects) {
      for (const contentId of project.outputPlan.requiredContentIds) {
        expect(
          world.content.some((c) => c.id === contentId),
          `${project.id} requires ${contentId}, which does not exist`,
        ).toBe(true);
      }
      for (const versionId of project.selectedConceptVersionIds) {
        expect(
          world.conceptVersions.some((v) => v.id === versionId),
          `${project.id} selected ${versionId}, which does not exist`,
        ).toBe(true);
      }
    }
  });
});

describe("the base world is handed out as a fresh copy (AC-P3.6)", () => {
  it("a mutation of one copy does not reach the next", () => {
    const first = baseWorld();
    first.projects[0]!.titleFa = "MUTATED";
    expect(baseWorld().projects[0]?.titleFa).not.toBe("MUTATED");
  });

  it("rebuilds identically from a cold cache", () => {
    const warm = baseWorld();
    resetBaseWorldCache();
    expect(JSON.stringify(baseWorld())).toBe(JSON.stringify(warm));
  });
});
