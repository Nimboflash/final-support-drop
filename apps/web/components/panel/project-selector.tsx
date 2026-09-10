"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ContentText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@drop/ui";
import type { PanelSnapshot } from "@drop/panel-domain";

/**
 * The shared project context (ADR-0020 D2).
 *
 * Project stopped being a destination and became a filter. It lives in the URL
 * so a filtered view is linkable and survives a reload, and so a retired deep
 * link like `/studio/projects/p1/content` can redirect to
 * `/studio/content?project=p1` and land on the same work.
 *
 * "همه پروژه‌ها" is a real option, not a null state: the concept, content and
 * output surfaces are cross-project by default, which is what lets the user see
 * everything needing attention without picking a container first.
 */
export const ALL_PROJECTS = "all";

export function useSelectedProject(): string {
  return useSearchParams().get("project") ?? ALL_PROJECTS;
}

/** Narrows any project-owned list to the current selection. */
export function filterByProject<T extends { projectId: string }>(
  items: readonly T[],
  selected: string,
): readonly T[] {
  return selected === ALL_PROJECTS ? items : items.filter((item) => item.projectId === selected);
}

/**
 * `allowAll: false` is for a surface where "all projects" has no meaning — a
 * workflow graph is one project's or it is nothing. There the selector shows
 * the project actually being rendered rather than claiming «همه پروژه‌ها» over
 * a graph that is silently the first one's.
 */
export function ProjectSelector({
  world,
  allowAll = true,
}: {
  world: PanelSnapshot;
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fallback = allowAll ? ALL_PROJECTS : (world.projects[0]?.id ?? ALL_PROJECTS);
  const selected = params.get("project") ?? fallback;

  function choose(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === ALL_PROJECTS) next.delete("project");
    else next.set("project", value);
    const query = next.toString();
    router.push(query === "" ? pathname : `${pathname}?${query}`);
  }

  return (
    <Select value={selected} onValueChange={choose}>
      <SelectTrigger data-testid="project-selector" className="w-56" aria-label="انتخاب پروژه">
        <SelectValue placeholder="همه پروژه‌ها" />
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value={ALL_PROJECTS}>همه پروژه‌ها</SelectItem> : null}
        {world.projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <ContentText>{project.titleFa}</ContentText>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
