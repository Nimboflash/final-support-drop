import { describe, expect, it } from "vitest";
import {
  APPROVAL_DECISIONS,
  AUDIT_EVENT_NAMES,
  CAPABILITIES,
  ACTOR_ROLES,
  PANEL_EVENT_AUDIT_MAPPING,
  PRODUCT_STAGES,
  RECORDED_RUN_STATUS_COUNT,
  REVIEW_STATUSES,
  RUN_STATUSES,
  RUN_STATUS_TO_PRODUCT_STAGE,
  MAPPED_RUN_STATUS_COUNT,
  UNMAPPED_DEMO_CAPABILITIES,
  UNMAPPED_PANEL_EVENT_TYPES,
  decodeCoverageClass,
  decodeDemoCapability,
  decodeDemoRole,
  decodeOutputType,
  decodeReviewStatus,
  decodeSourceStatus,
  decodeTarget,
  escalatedCardPresentation,
  toApprovalDecision,
  toReviewStatus,
  toStoredCode,
} from "../index";

/**
 * Ticket P2, Seam A — the V2/ADR reconciliation (AC-P2.15, AC-P2.16, AC-P2.23).
 *
 * These are the tests that make ADR-0019's "projection, not replacement" claim
 * checkable. If someone later "simplifies" by renaming a recorded enum member to
 * match the V2 wire spelling, the exact-membership assertions below fail before
 * the rename can reach a surface.
 */

describe("the review projection (AC-P2.16; ADR-0019 D5)", () => {
  it("maps each decision-bearing card status onto its ADR-0013 decision", () => {
    expect(toApprovalDecision("REVISION_REQUESTED")).toBe("CHANGES_REQUESTED");
    expect(toApprovalDecision("APPROVED")).toBe("APPROVED");
    expect(toApprovalDecision("REJECTED")).toBe("REJECTED");
  });

  it("returns null for pre-decision states rather than inventing one", () => {
    // A card nobody has judged has no decision to submit. Returning PENDING here
    // would put a non-decision into the ADR-0013 set.
    expect(toApprovalDecision("DRAFT")).toBeNull();
    expect(toApprovalDecision("IN_REVIEW")).toBeNull();
  });

  it("round-trips every decision except ESCALATED, which has no card status", () => {
    for (const decision of APPROVAL_DECISIONS) {
      const card = toReviewStatus(decision);
      if (decision === "ESCALATED") {
        expect(card).toBe("IN_REVIEW");
        continue;
      }
      expect(toApprovalDecision(card), `${decision} must survive a round trip`).toBe(decision);
    }
  });

  it("keeps ESCALATED visible instead of dropping it (ADR-0019 D5)", () => {
    expect(escalatedCardPresentation.escalated).toBe(true);
    expect(escalatedCardPresentation.reviewStatus).toBe("IN_REVIEW");
  });

  it("leaves both recorded vocabularies untouched", () => {
    expect(APPROVAL_DECISIONS).toEqual([
      "APPROVED", "CHANGES_REQUESTED", "REJECTED", "ESCALATED",
    ]);
    expect(REVIEW_STATUSES).toEqual([
      "DRAFT", "IN_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED",
    ]);
    // The two axes must never merge: CHANGES_REQUESTED is submitted,
    // REVISION_REQUESTED is displayed.
    expect(REVIEW_STATUSES).not.toContain("CHANGES_REQUESTED");
    expect(APPROVAL_DECISIONS).not.toContain("REVISION_REQUESTED");
  });
});

describe("the product-stage axis (AC-P2.15; ADR-0019 D12)", () => {
  it("is exactly the five V2 members and contains no review stage", () => {
    expect(PRODUCT_STAGES).toEqual([
      "DRAFT", "CONCEPTS", "RESEARCH_CONTENT", "PACKAGE", "CALENDAR",
    ]);
    // The stage strip shows a Review segment, but it is a display grouping
    // derived from open review counts — never a stored stage.
    expect(PRODUCT_STAGES).not.toContain("REVIEW");
  });

  it("maps every recorded run status, tolerating null", () => {
    expect(MAPPED_RUN_STATUS_COUNT).toBe(RECORDED_RUN_STATUS_COUNT);
    for (const status of RUN_STATUSES) {
      expect(RUN_STATUS_TO_PRODUCT_STAGE, `${status} must be mapped or explicitly null`)
        .toHaveProperty(status);
    }
  });

  it("leaves the genuinely open cases null rather than guessing", () => {
    // V2 01 §5: product stages must not claim "a newly inferred mapping".
    expect(RUN_STATUS_TO_PRODUCT_STAGE.SUCCEEDED).toBeNull();
    expect(RUN_STATUS_TO_PRODUCT_STAGE.RUNNING).toBeNull();
  });
});

describe("the wire codec is the only boundary (AC-P2.23; ADR-0019 D6)", () => {
  it("normalizes V2 lowercase literals to stored codes", () => {
    expect(toStoredCode("research_content")).toBe("RESEARCH_CONTENT");
    expect(decodeReviewStatus("revision_requested")).toBe("REVISION_REQUESTED");
    expect(decodeOutputType("production_brief")).toBe("PRODUCTION_BRIEF");
  });

  it("returns null for an unknown wire value rather than minting a code", () => {
    expect(decodeReviewStatus("escalated")).toBeNull();
    expect(decodeOutputType("podcast")).toBeNull();
  });

  it("bridges the one irregular coverage pair", () => {
    // Mechanical upper-casing turns "iran" into "IRAN", which is not a recorded
    // coverage class — hence the explicit pair.
    expect(decodeCoverageClass("iran")).toBe("IRANIAN_PERSIAN");
    expect(decodeCoverageClass("international")).toBe("INTERNATIONAL");
  });

  it("splits V2's single source status back onto the three recorded facts (06 §5)", () => {
    expect(decodeSourceStatus("available_demo")).toEqual({
      lifecycle: "ACTIVE", networkReachable: true, contentRetrievable: true,
    });
    const blocked = decodeSourceStatus("blocked");
    expect(blocked?.contentRetrievable).toBe(false);
    // A blocked source produces a retrieval request, never a fake verified
    // citation — so it must not read as simply "gone".
    expect(blocked?.lifecycle).not.toBe("DEACTIVATED");
  });

  it("translates the wire field name kind onto the stored field type", () => {
    expect(decodeTarget({ kind: "concept", id: "c1", versionId: "c1-v1" })).toEqual({
      type: "CONCEPT", id: "c1", versionId: "c1-v1",
    });
    expect(decodeTarget({ kind: "program", id: "p1", versionId: "v1" })).toBeNull();
  });

  it("maps demo profiles onto the closed sets without extending them", () => {
    expect(decodeDemoRole("demo_concept_reviewer")).toBe("REVIEWER_EDITOR");
    expect(decodeDemoCapability("fa.editorial")).toBe("FA_EDITORIAL");
    // The closed sets gain nothing.
    expect(ACTOR_ROLES).toHaveLength(7);
    expect(CAPABILITIES).toHaveLength(13);
  });

  it("resolves an unmapped V2 capability to null and reports it to P8", () => {
    expect(decodeDemoCapability("concept.review")).toBeNull();
    expect(UNMAPPED_DEMO_CAPABILITIES).toContain("concept.review");
    expect(UNMAPPED_DEMO_CAPABILITIES).toContain("calendar.edit");
  });
});

describe("PanelEvent never extends the closed audit taxonomy (ADR-0019 D9)", () => {
  it("keeps AUDIT_EVENT_NAMES at its recorded 35", () => {
    expect(AUDIT_EVENT_NAMES).toHaveLength(35);
  });

  it("maps only to recorded audit names, and null otherwise", () => {
    for (const [type, audit] of Object.entries(PANEL_EVENT_AUDIT_MAPPING)) {
      if (audit === null) continue;
      expect(AUDIT_EVENT_NAMES, `${type} maps to an unrecorded audit name`).toContain(audit);
    }
  });

  it("reports its unresolved half as P8 coordination items", () => {
    expect(UNMAPPED_PANEL_EVENT_TYPES.length).toBeGreaterThan(0);
    expect(UNMAPPED_PANEL_EVENT_TYPES).toContain("panel.package.assembled");
  });
});
