import { describe, expect, it } from "vitest";
import { BASE_WORLD_ID, loadScenario } from "@drop/mock-data";
import {
  attentionRows,
  openReviewCount,
  readinessFor,
  unscheduledEntries,
} from "./read-models";
import { contentStateOf, outputsFor } from "./presentation";

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

describe("an output is the approved content, not all of it", () => {
  /*
    `OutputView`'s own docblock has always said an output is "the assembled set
    of one concept's APPROVED content". The code took every item under the
    concept regardless of its review state, so an output opened part-way through
    a review listed everything the machine had produced as though it were the
    deliverable — a set the person had not agreed to, presented as theirs.

    The counts are the deliberate exception and stay over the WHOLE set: "۲ از ۱۸"
    only means something against everything the concept produced.
  */
  const world = loadScenario(BASE_WORLD_ID).snapshot;

  it("lists only approved content as the output's materials", () => {
    for (const output of outputsFor(world)) {
      const items = world.content.filter((item) => output.contentIds.includes(item.id));
      expect(items.length, "an output must not be empty of the thing it counts").toBe(
        output.contentIds.length,
      );
      for (const item of items) {
        expect(
          contentStateOf(item),
          `${item.id} is in an output while it is ${contentStateOf(item)}`,
        ).toBe("approved");
      }
    }
  });

  it("still counts approved-of-total over every item, so the blocker reads true", () => {
    const withUnapproved = outputsFor(world).find(
      (output) => output.approvedCount < output.totalCount,
    );
    expect(
      withUnapproved,
      "the base world must contain a part-reviewed concept for this to mean anything",
    ).toBeDefined();
    // The materials shrink to the approved set; the denominator does not.
    expect(withUnapproved!.contentIds.length).toBe(withUnapproved!.approvedCount);
    expect(withUnapproved!.totalCount).toBeGreaterThan(withUnapproved!.approvedCount);
  });
});

describe("an output's state follows the review, not the assembly", () => {
  /*
    `snapshot !== undefined ? "approved"` was written when a package only ever
    appeared AFTER content was approved, so its existence implied the review.
    Projecting the machine's portfolio as a package broke that implication: the
    machine builds it in one call, before anyone has looked at anything. The
    card then read «تأییدشده» over a sheet saying «هنوز محتوایی تأیید نشده», and
    «ارسال به تقویم» went live on an output containing nothing at all.
  */
  it("never calls an output approved while nothing in it is", () => {
    const world = loadScenario(BASE_WORLD_ID).snapshot;
    for (const output of outputsFor(world)) {
      if (output.state === "approved" || output.state === "scheduled") {
        expect(
          output.contentIds.length,
          `${output.conceptId} reads ${output.state} with nothing approved in it`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("holds an unscheduled output with no approvals at «در حال تکمیل», so it cannot be sent", () => {
    /*
      `assembling` is what disables «ارسال به تقویم», so an output nobody has
      reviewed must land there.

      Already-SCHEDULED outputs are excluded, and that is not a loophole: a date
      is a fact about the calendar rather than about the review, and an entry
      that exists was necessarily created from an output that could be sent. An
      output cannot arrive at a date without passing through this rung.
    */
    const world = loadScenario(BASE_WORLD_ID).snapshot;
    const bare = outputsFor({
      ...world,
      content: world.content.map((item) => ({ ...item, reviewStatus: "IN_REVIEW" as const })),
    });
    const unscheduled = bare.filter((output) => output.scheduledDate === null);
    expect(unscheduled.length, "the base world must contain an unscheduled output").toBeGreaterThan(
      0,
    );
    for (const output of unscheduled) {
      expect(output.state, `${output.conceptId} is sendable with nothing approved`).toBe(
        "assembling",
      );
    }
  });
});

describe("a failed build is its own attention row, never a review row", () => {
  it("does not send the person to approve what cannot be approved", () => {
    const snapshot = structuredClone(loadScenario(BASE_WORLD_ID).snapshot);
    const first = snapshot.content[0]!;
    snapshot.content = snapshot.content.map((c) =>
      c.id === first.id
        ? {
            ...c,
            generationState: "FAILED" as const,
            reviewStatus: "IN_REVIEW" as const,
            blockedReasonCode: "ASSEMBLY_FAILED_RETRYABLE",
            blockedReasonFa: "ساخت متوقف شد.",
          }
        : c,
    );
    const rows = attentionRows(snapshot).filter((row) => row.projectId === first.projectId);
    expect(rows.some((row) => row.kind === "BUILD_FAILED")).toBe(true);
    // The failed item is not counted among what «به تأیید شما نیاز دارد».
    const review = rows.find((row) => row.kind === "AWAITING_REVIEW");
    if (review !== undefined) expect(review.detailFa).not.toMatch(/یک محتوا به تأیید/);
  });

  it("the unscheduled row carries its project like its siblings", () => {
    const rows = attentionRows(loadScenario(BASE_WORLD_ID).snapshot).filter((row) => row.kind === "MISSING_SCHEDULE");
    for (const row of rows) expect(row.href).toContain(`?project=${row.projectId}`);
  });
});
