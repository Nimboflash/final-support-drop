import { describe, expect, it } from "vitest";
import { loadScenario } from "@drop/mock-data";
import {
  attentionRows,
  openReviewCount,
  readinessFor,
  unscheduledEntries,
} from "./read-models";

/**
 * Ticket P4, component seam — the read models, exercised against real scenario
 * worlds rather than hand-built objects.
 *
 * Narrowed by ticket P9: ADR-0020 removed the four overview counters and the
 * five-stage strip, so `overviewCounters`, `blockedCount` and `stageSegments`
 * went with them. What survives is what a surface still reads — readiness, the
 * attention inbox, and the unscheduled tray.
 */
describe("readiness is counted against the frozen plan (AC-P4.8)", () => {
  it("reports approved-of-required rather than a global percentage", () => {
    const world = loadScenario("S11").snapshot;
    const p2 = world.projects.find((p) => p.id === "p2")!;
    const readiness = readinessFor(world, p2);
    expect(readiness.requiredTotal).toBe(p2.outputPlan.requiredContentIds.length);
    expect(readiness.approved + readiness.unresolved.length).toBe(readiness.requiredTotal);
  });

  it("fails closed: a blocked item outranks its review status", () => {
    const world = loadScenario("S08").snapshot;
    const p1 = world.projects.find((p) => p.id === "p1")!;
    const readiness = readinessFor(world, p1);
    expect(readiness.unresolved.some((u) => u.reason === "BLOCKED")).toBe(true);
    expect(readiness.ready).toBe(false);
  });

  it("does not count a stale approval as ready (V2 01 §6)", () => {
    const world = loadScenario("S21").snapshot;
    const p2 = world.projects.find((p) => p.id === "p2")!;
    const readiness = readinessFor(world, p2);
    // S21 marks the downstream stale after an upstream concept revision.
    expect(readiness.unresolved.some((u) => u.reason === "STALE")).toBe(true);
    expect(readiness.ready).toBe(false);
  });

  it("an empty plan is not ready — it has nothing to package", () => {
    const world = loadScenario("S24").snapshot;
    const p1 = world.projects.find((p) => p.id === "p1")!;
    expect(readinessFor(world, p1).ready).toBe(false);
  });
});

describe("review is derived, not stored (ADR-0019 D12)", () => {
  it("counts what is open per project", () => {
    const world = loadScenario("S05").snapshot;
    expect(openReviewCount(world, "p1")).toBeGreaterThan(0);
  });

  it("no project carries a stored review stage", () => {
    const world = loadScenario("S05").snapshot;
    for (const project of world.projects) {
      expect(project.stage).not.toBe("REVIEW");
    }
  });
});

describe("the overview inbox (AC-P4.3)", () => {
  it("orders blocked required work above review, and review above scheduling", () => {
    const world = loadScenario("S08").snapshot;
    const rows = attentionRows(world);
    const kinds = rows.map((r) => r.kind);
    const firstBlocked = kinds.indexOf("BLOCKED_REQUIRED");
    const firstReview = kinds.indexOf("AWAITING_REVIEW");
    if (firstBlocked >= 0 && firstReview >= 0) expect(firstBlocked).toBeLessThan(firstReview);
    // Every row carries one next action and its context.
    for (const row of rows) {
      expect(row.actionLabelFa.length).toBeGreaterThan(0);
      expect(row.href.startsWith("/studio")).toBe(true);
      expect(row.detailFa).toMatch(/[؀-ۿ]/);
    }
  });

  it("raises a row for every project with something open", () => {
    const world = loadScenario("S08").snapshot;
    const rows = attentionRows(world);
    for (const project of world.projects) {
      if (openReviewCount(world, project.id) === 0) continue;
      expect(
        rows.some((r) => r.projectId === project.id),
        `${project.id} has open reviews but raises no row`,
      ).toBe(true);
    }
  });

  it("an empty world produces an empty inbox, not a crash", () => {
    const world = loadScenario("S01").snapshot;
    expect(attentionRows(world)).toEqual([]);
  });
});

describe("the unscheduled tray is PLANNED with a null date (ADR-0019 D7)", () => {
  it("separates unscheduled from scheduled by date, not by status", () => {
    const world = loadScenario("S11").snapshot;
    for (const entry of world.calendar) {
      // ADR-0015 D5's set is not amended: there is no UNSCHEDULED member.
      expect(["PLANNED", "CONFIRMED", "DONE", "CANCELLED"]).toContain(entry.status);
    }
    for (const entry of unscheduledEntries(world)) expect(entry.date).toBeNull();
  });
});
