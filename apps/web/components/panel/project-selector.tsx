"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  ContentText,
  EmptyState,
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
  const raw = useSearchParams().get("project");
  // `?project=` with nothing after it is not a project. It reached the URL
  // from a composer opened in an empty world, and a filter matching nothing
  // then showed «هنوز کانسپتی ساخته نشده» over a world full of concepts.
  return raw === null || raw.trim() === "" ? ALL_PROJECTS : raw;
}

/**
 * The filter, and whether the world can honour it.
 *
 * A `?project=` the snapshot does not contain used to produce one of two lies:
 * «هنوز محتوایی ساخته نشده» (false — the filter, not the world, is empty) on
 * four surfaces, or five columns of «۰» with no message at all on the
 * overview. Every project id in REAL mode is `ms-<session>`, so any bookmark
 * from the demo world hits this the moment the server is pointed at a machine.
 */
export function useProjectFilter(world: PanelSnapshot): {
  readonly selected: string;
  readonly known: boolean;
} {
  const selected = useSelectedProject();
  const known =
    selected === ALL_PROJECTS || world.projects.some((project) => project.id === selected);
  return { selected, known };
}

/** Narrows any project-owned list to the current selection. */
export function filterByProject<T extends { projectId: string }>(
  items: readonly T[],
  selected: string,
): readonly T[] {
  return selected === ALL_PROJECTS ? items : items.filter((item) => item.projectId === selected);
}

/**
 * The one honest answer to a filter that matches nothing: say so, and offer
 * the way out. Rendered by every surface that honours `?project=`, so the
 * sentence is the same on all of them.
 */
export function UnknownProjectState() {
  const pathname = usePathname();
  return (
    <EmptyState
      title="این نشانی به پروژه‌ای در این فضای کار اشاره نمی‌کند"
      detail="شاید پیوند قدیمی باشد، یا پنل اکنون جلسهٔ دیگری را نشان می‌دهد."
      action={
        <Button asChild variant="outline" data-testid="show-all-projects">
          <Link href={pathname}>نمایش همهٔ پروژه‌ها</Link>
        </Button>
      }
    />
  );
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
  const raw = params.get("project");
  const requested = raw === null || raw.trim() === "" ? fallback : raw;
  // An id the world does not hold must not read as «همه پروژه‌ها»: that is the
  // placeholder Radix falls back to for an unmatched value, and it told the
  // person the board was unfiltered while it was filtered to nothing.
  const selected = world.projects.some((project) => project.id === requested)
    ? requested
    : requested === ALL_PROJECTS
      ? ALL_PROJECTS
      : "";

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
        <SelectValue placeholder={selected === "" ? "پروژهٔ ناشناخته" : "همه پروژه‌ها"} />
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
