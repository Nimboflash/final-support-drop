import { panelSnapshotSchema, type PanelSnapshot } from "@drop/panel-domain";
import { DEMO_EPOCH } from "../ports";
import { deepClone } from "../repository/deep-clone";

/**
 * Base-world density (AC-P3.4).
 *
 * The V2 seed ships three projects; V2 04 §2 requires "6–8 project summaries
 * distributed over meaningful stages, including empty/new, review, research,
 * blocked, ready-package, scheduled and Weekly Lens". The gap is closed by
 * promoting the ids the scenario recipes already name — p4, p5, p6, p7 — so no
 * id the brief does not use is invented.
 *
 * Coverage after promotion:
 *
 * | project | stage            | covers                               |
 * |---------|------------------|--------------------------------------|
 * | p1      | RESEARCH_CONTENT | review (c2 in review), research, blocked (o2) |
 * | p2      | CALENDAR         | ready-package, scheduled             |
 * | p3      | DRAFT            | Weekly Lens                          |
 * | p4      | DRAFT            | empty/new                            |
 * | p5      | PACKAGE          | ready-package with no date           |
 * | p6      | CALENDAR         | scheduled at a different week        |
 * | p7      | PACKAGE          | blocked assembly                     |
 *
 * p4 takes S02's definition — `input: null`, no selected concepts, empty output
 * plan — because S02 is one of the fourteen (18 §7.2) scenarios ADR-0018 D4
 * makes untrimmable. S03 defines the SAME id incompatibly, with a text
 * reference; that variant stays scenario-local. The collision is real and is
 * what proves scenario isolation is not decorative (AC-P3.6).
 */

/**
 * The derived-id rule, applied to every child of a cloned project.
 *
 * Mechanical and total: `<original>-<projectId>`. `idSchema` allows only
 * `[A-Za-z0-9_-]`, which rules out a namespacing separator like `:` or `/`, so
 * the suffix is the one shape that stays parseable. Reported to P8 as authored
 * demo data, not a contract.
 */
export function derivedId(originalId: string, projectId: string): string {
  return `${originalId}-${projectId}`;
}

type Draft = {
  -readonly [K in keyof PanelSnapshot]: PanelSnapshot[K] extends readonly (infer T)[]
    ? T[]
    : PanelSnapshot[K];
};

/** Clones p2's whole branch under a new project id, rewriting every reference. */
function cloneProjectBranch(
  world: Draft,
  sourceProjectId: string,
  targetProjectId: string,
  titleFa: string,
  overrides: { stage: PanelSnapshot["projects"][number]["stage"]; targetDate: string | null },
): void {
  const source = world.projects.find((p) => p.id === sourceProjectId);
  if (source === undefined) throw new Error(`DENSITY_SOURCE_MISSING: ${sourceProjectId}`);
  const id = (original: string) => derivedId(original, targetProjectId);

  const concepts = world.concepts.filter((c) => c.projectId === sourceProjectId);
  const conceptVersions = world.conceptVersions.filter((v) =>
    concepts.some((c) => c.id === v.conceptId),
  );
  const content = world.content.filter((c) => c.projectId === sourceProjectId);
  const contentVersions = world.contentVersions.filter((v) =>
    content.some((c) => c.id === v.contentId),
  );

  world.projects.push({
    ...deepClone(source),
    id: targetProjectId,
    titleFa,
    stage: overrides.stage,
    targetDate: overrides.targetDate,
    rowVersion: 1,
    selectedConceptVersionIds: source.selectedConceptVersionIds.map(id),
    outputPlan: {
      ...source.outputPlan,
      includedConceptIds: source.outputPlan.includedConceptIds.map(id),
      requiredContentIds: source.outputPlan.requiredContentIds.map(id),
      optionalContentIds: source.outputPlan.optionalContentIds.map(id),
    },
  } as PanelSnapshot["projects"][number]);

  for (const concept of concepts) {
    world.concepts.push({
      ...deepClone(concept),
      id: id(concept.id),
      projectId: targetProjectId,
      batchId: id(concept.batchId),
      activeVersionId: id(concept.activeVersionId),
    });
  }
  for (const version of conceptVersions) {
    world.conceptVersions.push({
      ...deepClone(version),
      id: id(version.id),
      conceptId: id(version.conceptId),
    });
  }
  for (const item of content) {
    world.content.push({
      ...deepClone(item),
      id: id(item.id),
      projectId: targetProjectId,
      conceptId: id(item.conceptId),
      activeVersionId: id(item.activeVersionId),
    });
  }
  for (const version of contentVersions) {
    world.contentVersions.push({
      ...deepClone(version),
      id: id(version.id),
      contentId: id(version.contentId),
      conceptVersionId: id(version.conceptVersionId),
    });
  }
}

export function expandDensity(base: PanelSnapshot): PanelSnapshot {
  const world = deepClone(base) as Draft;

  // p4 — empty/new. S02's definition, deliberately, not S03's.
  const template = world.projects.find((p) => p.id === "p1");
  if (template === undefined) throw new Error("DENSITY_SOURCE_MISSING: p1");
  world.projects.push({
    ...deepClone(template),
    id: "p4",
    titleFa: "پیش‌نویس بدون اجرا",
    stage: "DRAFT",
    input: { mode: "BLANK" },
    targetDate: null,
    rowVersion: 1,
    selectedConceptVersionIds: [],
    outputPlan: { revision: 1, includedConceptIds: [], requiredContentIds: [], optionalContentIds: [] },
    createdAt: DEMO_EPOCH,
    updatedAt: DEMO_EPOCH,
  } as PanelSnapshot["projects"][number]);

  cloneProjectBranch(world, "p2", "p5", "خروجی آماده بدون تاریخ", {
    stage: "PACKAGE",
    targetDate: null,
  });
  cloneProjectBranch(world, "p2", "p6", "خروجی زمان‌بندی‌شده", {
    stage: "CALENDAR",
    targetDate: "2026-09-15",
  });
  cloneProjectBranch(world, "p2", "p7", "خروجی با خطای ساخت", {
    stage: "PACKAGE",
    targetDate: null,
  });

  // p7 carries a FAILED item, not a blocked one. The two are different to a
  // person: a blocked item is waiting for a source they can supply, a failed
  // one is not, and the project's own name says a build failed. Seeding it as
  // BLOCKED told the reader to «افزودن منبع» for a problem no source fixes.
  const p7Failed = world.content.find((c) => c.projectId === "p7");
  if (p7Failed !== undefined) {
    p7Failed.generationState = "FAILED";
    p7Failed.reviewStatus = "IN_REVIEW";
    p7Failed.blockedReasonCode = "ASSEMBLY_FAILED_RETRYABLE";
    p7Failed.blockedReasonFa = "ساخت خروجی با خطایی متوقف شد که می‌توان دوباره تلاش کرد.";
  }

  // p5 is «خروجی آماده بدون تاریخ» — so it must actually HAVE an undated
  // calendar entry. Without one the unscheduled tray was permanently empty in
  // every world, and ADR-0019 D7's «PLANNED with a null date» was unreachable.
  const p2Package = world.packages.find((snapshot) => snapshot.projectId === "p2");
  if (p2Package !== undefined) {
    // The branch clone copies content and concepts but not the assembled
    // output, and an entry cannot exist without a version to point at.
    const p5Package = {
      ...p2Package,
      id: "pkg-p5-v1",
      familyId: "pkg-p5",
      projectId: "p5",
      contentVersionIds: world.content
        .filter((c) => c.projectId === "p5")
        .map((c) => c.activeVersionId),
    };
    world.packages.push(p5Package);
    world.calendar.push({
      id: "cal-p5",
      projectId: "p5",
      packageFamilyId: p5Package.familyId,
      packageVersionId: p5Package.id,
      titleFa: "خروجی آمادهٔ بدون تاریخ",
      status: "PLANNED",
      date: null,
      endDate: null,
      startsAt: null,
      timezone: "Asia/Tehran",
      ownerId: "actor-planner",
      noteFa: "",
      rowVersion: 1,
    });
  }

  return panelSnapshotSchema.parse(world);
}
