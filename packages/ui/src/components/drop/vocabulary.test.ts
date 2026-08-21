import { describe, expect, it } from "vitest";
import {
  ACTOR_ROLES,
  APPROVAL_STATES,
  CALENDAR_ITEM_STATUSES,
  LENS_STATUSES,
  PROGRAM_STATUSES,
  PROJECT_STATUSES,
  REQUEST_STATUSES,
  RUN_STATUSES,
  STAGE_STATUSES,
  faLabel,
} from "../../index";

// AC-P1.8 (vocabulary half) — the presentation vocabulary is EXACTLY the recorded
// enums: ADR-0012 stage/run states, ADR-0015 status enums, doc 11 §3 roles.
// Expected lists are transcribed from the ADRs (independent source), never derived.

describe("presentation vocabulary (ADR-0012, ADR-0015, 11 §3)", () => {
  it("stage states are exactly the 14 ADR-0012 names in recorded order", () => {
    expect(STAGE_STATUSES).toEqual([
      "DRAFT", "READY", "QUEUED", "RUNNING",
      "WAITING_FOR_DEPENDENCY", "WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL",
      "PAUSED", "FAILED_RETRYABLE", "FAILED_FINAL",
      "SUCCEEDED", "SKIPPED", "CANCELLED", "SUPERSEDED",
    ]);
  });

  it("run states are exactly the 9 ADR-0012 names", () => {
    expect(RUN_STATUSES).toEqual([
      "DRAFT", "QUEUED", "RUNNING", "WAITING_INPUT", "WAITING_APPROVAL",
      "PAUSED", "SUCCEEDED", "FAILED", "CANCELLED",
    ]);
  });

  it("ADR-0015 status enums are exact", () => {
    expect(PROJECT_STATUSES).toEqual(["ACTIVE", "ARCHIVED"]);
    expect(PROGRAM_STATUSES).toEqual(["DRAFT", "IN_PIPELINE", "APPROVED", "ARCHIVED"]);
    expect(LENS_STATUSES).toEqual(["DRAFT", "IN_PIPELINE", "APPROVED", "COMMISSIONED", "ARCHIVED"]);
    expect(REQUEST_STATUSES).toEqual([
      "DRAFT", "OPEN", "BLOCKED", "IN_PROGRESS", "IN_REVIEW",
      "CHANGES_REQUESTED", "APPROVED", "COMPLETED", "CANCELLED",
    ]);
    expect(CALENDAR_ITEM_STATUSES).toEqual(["PLANNED", "CONFIRMED", "DONE", "CANCELLED"]);
  });

  it("actor roles are the 11 §3 canonical seven", () => {
    expect(ACTOR_ROLES).toEqual([
      "WORKSPACE_OWNER", "DROP_GUARDIAN", "PROJECT_LEAD", "REVIEWER_EDITOR",
      "CONTRIBUTOR", "VIEWER", "TECHNICAL_MAINTAINER",
    ]);
  });

  it("approval presentation states cover the ADR-0013 decision set plus pending", () => {
    expect(APPROVAL_STATES).toEqual(["PENDING", "APPROVED", "CHANGES_REQUESTED", "ESCALATED"]);
  });
});

describe("central Persian label mapping (09 §9; ADR-0015 via P1 adr_constraints)", () => {
  const allVocabularies: Record<string, readonly string[]> = {
    stage: STAGE_STATUSES,
    run: RUN_STATUSES,
    project: PROJECT_STATUSES,
    program: PROGRAM_STATUSES,
    lens: LENS_STATUSES,
    request: REQUEST_STATUSES,
    calendarItem: CALENDAR_ITEM_STATUSES,
    approval: APPROVAL_STATES,
    role: ACTOR_ROLES,
  };

  it("every enum value in every vocabulary has a non-empty Persian label", () => {
    for (const [domain, values] of Object.entries(allVocabularies)) {
      for (const value of values) {
        const label = faLabel(domain as never, value);
        expect(label, `${domain}.${value} must have a Persian label`).toBeTruthy();
        // Persian text, not the raw enum echoed back
        expect(label).not.toBe(value);
        expect(label, `${domain}.${value} label must contain Persian script`).toMatch(/[؀-ۿ]/);
        expect(label, `${domain}.${value} must have a REAL label, not the unknown fallback`).not.toContain("ناشناخته");
      }
    }
  });

  it("an unknown value yields the safe fallback marker, never a crash or silent English", () => {
    const label = faLabel("stage", "NOT_A_REAL_STATE");
    expect(label).toMatch(/[؀-ۿ]/); // fallback is Persian
    expect(label).toContain("ناشناخته");
  });

  it("prototype keys hit the fallback, never Object.prototype (F6)", () => {
    expect(faLabel("stage", "toString")).toContain("ناشناخته");
    expect(faLabel("run", "constructor")).toContain("ناشناخته");
  });
});
