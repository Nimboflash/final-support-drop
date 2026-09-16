import { describe, expect, it } from "vitest";
import type { Concept, ContentItem, PanelSnapshot } from "@drop/panel-domain";
import { BASE_WORLD_ID, loadScenario } from "@drop/mock-data";
import { conceptStateOf, contentStateOf, outputsFor, projectMessageFa } from "./presentation";

/**
 * The state ladders, at the branches that used to be missing.
 *
 * Each of these was a state the domain recorded and the interface could not
 * show: a selected concept whose research was built from an older version, a
 * content item with a change request pending, and an output blocked by a
 * build that never finished. The recorded facts existed; the mapping fell
 * through to a neighbouring state and the surface said the wrong thing.
 */
function world(): PanelSnapshot {
  return structuredClone(loadScenario(BASE_WORLD_ID).snapshot);
}

describe("a selected concept that was refined since is not merely «انتخاب‌شده»", () => {
  it("reads outdated when the approval is STALE", () => {
    const concept = { ...world().concepts[0]!, reviewStatus: "APPROVED", freshness: "STALE" } as Concept;
    expect(conceptStateOf(concept)).toBe("outdated");
  });
  it("and selected when it is CURRENT", () => {
    const concept = { ...world().concepts[0]!, reviewStatus: "APPROVED", freshness: "CURRENT" } as Concept;
    expect(conceptStateOf(concept)).toBe("selected");
  });
});

describe("a change request leaves a visible trace on content", () => {
  it("reads improving, not ready for review", () => {
    const item = { ...world().content[0]!, reviewStatus: "REVISION_REQUESTED", generationState: "SUCCEEDED" } as ContentItem;
    expect(contentStateOf(item)).toBe("improving");
  });
});

describe("an output blocked by a failed build says so", () => {
  it("names the failure instead of claiming everything is approved", () => {
    const snapshot = world();
    const first = snapshot.content[0]!;
    const failed: ContentItem = {
      ...first,
      generationState: "FAILED",
      blockedReasonCode: "ASSEMBLY_FAILED_RETRYABLE",
      blockedReasonFa: "ساخت متوقف شد.",
    };
    const withFailure: PanelSnapshot = {
      ...snapshot,
      content: snapshot.content.map((c) => (c.id === first.id ? failed : c)),
    };
    const view = outputsFor(withFailure).find((o) => o.conceptId === first.conceptId);
    expect(view?.blockerFa).toMatch(/ناتمام ماند/);
    const project = withFailure.projects.find((p) => p.id === first.projectId)!;
    expect(projectMessageFa(withFailure, project)).toMatch(/ناتمام ماند/);
  });
});
