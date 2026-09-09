"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
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

export function ProjectSelector({ world }: { world: PanelSnapshot }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("project") ?? ALL_PROJECTS;

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
        <SelectItem value={ALL_PROJECTS}>همه پروژه‌ها</SelectItem>
        {world.projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.titleFa}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
