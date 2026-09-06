import type { PanelSnapshot } from "@drop/panel-domain";
import { DEMO_EPOCH } from "../ports";

/** Mutable view of a snapshot, for recipes that build one up. */
export type World = {
  -readonly [K in keyof PanelSnapshot]: PanelSnapshot[K] extends readonly (infer T)[]
    ? T[]
    : PanelSnapshot[K];
};

export function asWorld(snapshot: PanelSnapshot): World {
  return snapshot as unknown as World;
}

/** Removes every record owned by projects other than those named. */
export function keepOnlyProjects(world: World, keep: readonly string[]): void {
  const kept = new Set(keep);
  world.projects = world.projects.filter((p) => kept.has(p.id));
  world.concepts = world.concepts.filter((c) => kept.has(c.projectId));
  const conceptIds = new Set(world.concepts.map((c) => c.id));
  world.conceptVersions = world.conceptVersions.filter((v) => conceptIds.has(v.conceptId));
  world.content = world.content.filter((c) => kept.has(c.projectId));
  const contentIds = new Set(world.content.map((c) => c.id));
  world.contentVersions = world.contentVersions.filter((v) => contentIds.has(v.contentId));
  world.packages = world.packages.filter((p) => kept.has(p.projectId));
  world.calendar = world.calendar.filter((c) => kept.has(c.projectId));
  const liveTargets = new Set([...conceptIds, ...contentIds]);
  world.comments = world.comments.filter((c) => liveTargets.has(c.target.id));
  world.decisions = world.decisions.filter((d) => liveTargets.has(d.target.id));
}

export function project(world: World, id: string): World["projects"][number] {
  const found = world.projects.find((p) => p.id === id);
  if (found === undefined) throw new Error(`SCENARIO_MISSING_PROJECT: ${id}`);
  return found;
}

export function concept(world: World, id: string): World["concepts"][number] {
  const found = world.concepts.find((c) => c.id === id);
  if (found === undefined) throw new Error(`SCENARIO_MISSING_CONCEPT: ${id}`);
  return found;
}

export function content(world: World, id: string): World["content"][number] {
  const found = world.content.find((c) => c.id === id);
  if (found === undefined) throw new Error(`SCENARIO_MISSING_CONTENT: ${id}`);
  return found;
}

/**
 * Appends an immutable next version of a concept. Never edits the prior one:
 * "Version content is immutable" (V2 01 §8), and an approval recorded against
 * the old version must stay true.
 */
export function addConceptVersion(
  world: World,
  conceptId: string,
  overrides: Partial<World["conceptVersions"][number]> & { feedbackAppliedFa: string | null },
): string {
  const existing = world.conceptVersions.filter((v) => v.conceptId === conceptId);
  const previous = existing[existing.length - 1];
  if (previous === undefined) throw new Error(`SCENARIO_MISSING_CONCEPT_VERSION: ${conceptId}`);
  const number = previous.number + 1;
  const id = `${conceptId}-v${String(number)}`;
  world.conceptVersions.push({ ...previous, ...overrides, id, conceptId, number, createdAt: DEMO_EPOCH });
  return id;
}

export function addContentVersion(
  world: World,
  contentId: string,
  overrides: Partial<World["contentVersions"][number]>,
): string {
  const existing = world.contentVersions.filter((v) => v.contentId === contentId);
  const previous = existing[existing.length - 1];
  if (previous === undefined) throw new Error(`SCENARIO_MISSING_CONTENT_VERSION: ${contentId}`);
  const number = previous.number + 1;
  const id = `${contentId}-v${String(number)}`;
  world.contentVersions.push({ ...previous, ...overrides, id, contentId, number, createdAt: DEMO_EPOCH });
  return id;
}
