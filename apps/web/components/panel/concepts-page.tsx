"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  ContentText,
  EmptyState,
} from "@drop/ui";
import type { Concept, PanelSnapshot } from "@drop/panel-domain";
import {
  ALL_PROJECTS,
  ProjectSelector,
  UnknownProjectState,
  filterByProject,
  useProjectFilter,
} from "./project-selector";
import { ConceptDetail } from "./concept-detail";
import { useReturnFocus } from "./use-return-focus";
import { NewConceptComposer } from "./new-concept-composer";
import { conceptStateOf, CONCEPT_STATE_LABEL_FA, type ConceptState } from "../../lib/demo/presentation";
import { usePulseKey } from "./use-pulse";

/**
 * Concepts — the start, review and selection of ideas (ADR-0020 D2).
 *
 * This replaced the projects list as the primary destination. The card carries
 * only what a person needs to decide whether to open it: title, a short
 * description, when it was made, and a state in three words. No identifiers, no
 * version labels, no review-workflow vocabulary (ADR-0020 D5).
 */
export function ConceptsPage({ world }: { world: PanelSnapshot }) {
  const { selected: selectedProject, known } = useProjectFilter(world);
  const [openConceptId, setOpenConceptId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  // Controlled overlays have no trigger to hand focus back to (see the hook).
  const detailFocus = useReturnFocus();
  /*
    The overlay is keyed on the LAST item opened, not the currently open one.
    Keying on the current id unmounts the sheet the instant it closes — which
    is exactly when Radix would hand focus back to the card, so the remount
    silently cancelled the focus return. This still resets the sheet's state
    between two different items, which is what the key is for.
  */
  const [lastOpened, setLastOpened] = useState<string>("none");
  const composerFocus = useReturnFocus();

  /*
    The composer opens from the URL. The rail's primary action is a link to
    `?compose=1` — a thing to do, addressable and reload-safe — and this is the
    page that answers it. Focus is remembered in the effect rather than in a
    click handler because there is no click handler here: after a client
    navigation the rail link still holds focus, which is exactly the element
    the composer should hand focus back to when it closes.
  */
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const composeRequested = params.get("compose") === "1";
  useEffect(() => {
    if (composeRequested) {
      composerFocus.remember();
      setComposerOpen(true);
      return;
    }
    // Both directions. The composer's own «دیدن کانسپت‌ها» is a client
    // navigation to this same route with the filter and without `compose`;
    // the page does not remount, so the dialog stayed open over the cards it
    // had just sent the person to look at.
    setComposerOpen(false);
  }, [composeRequested]);
  const closeComposer = (value: boolean) => {
    setComposerOpen(value);
    if (value || !composeRequested) return;
    const next = new URLSearchParams(params.toString());
    next.delete("compose");
    const query = next.toString();
    router.replace(query === "" ? pathname : `${pathname}?${query}`);
  };

  const concepts = filterByProject(world.concepts, selectedProject);
  const openConcept = concepts.find((c) => c.id === openConceptId) ?? null;

  const projectTitle = (id: string) =>
    world.projects.find((p) => p.id === id)?.titleFa ?? "";

  return (
    <div className="drop-surface space-y-5">
      <header className="drop-rule flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">کانسپت‌ها</h1>
        {/* The primary action lives in the rail now, first, like the reference's. */}
        <ProjectSelector world={world} />
      </header>

      {!known ? (
        <UnknownProjectState />
      ) : concepts.length === 0 ? (
        <EmptyState
          title="هنوز کانسپتی ساخته نشده"
          detail="اولین مسیر را شروع کنید."
          action={
            <Button
              data-testid="start-concept-empty"
              onClick={() => {
                composerFocus.remember();
                setComposerOpen(true);
              }}
            >
              شروع کانسپت جدید
            </Button>
          }
        />
      ) : (
        <ul
          className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))]"
          data-testid="concept-grid"
        >
          {concepts.map((concept) => (
            <li key={concept.id}>
              <ConceptCard
                world={world}
                concept={concept}
                // Group by project through a visible label rather than a
                // separate navigation layer (brief §7.2).
                projectTitleFa={selectedProject === ALL_PROJECTS ? projectTitle(concept.projectId) : null}
                onOpen={() => {
                  detailFocus.remember();
                  setLastOpened(concept.id);
                  setOpenConceptId(concept.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <NewConceptComposer
        world={world}
        open={composerOpen}
        onOpenChange={(next) => composerFocus.onOpenChange(next, closeComposer)}
        onCloseAutoFocus={composerFocus.onCloseAutoFocus}
      />

      <ConceptDetail
        key={lastOpened}
        world={world}
        concept={openConcept}
        open={openConcept !== null}
        onOpenChange={(next) =>
          detailFocus.onOpenChange(next, (value) => {
            if (!value) setOpenConceptId(null);
          })
        }
        onCloseAutoFocus={detailFocus.onCloseAutoFocus}
      />
    </div>
  );
}

/*
  A status STRIPE on the start edge, not a coloured outline.

  These were four-edge borders, and at the alpha they used to carry they were
  invisible; at full strength — which is what they needed to reach 3:1 — ten
  cards of brand accent read as ten alarms. Neither is a status marker.

  A stripe is. It is contained, it is legible at full strength, it stacks down a
  column without competing, and it is the same shape the overview already uses
  for a row that wants attention. The card keeps its own hairline for structure;
  the stripe says what state it is in, beside a badge that says it in words.
*/
const STATE_TONE: Record<ConceptState, string> = {
  generating: "",
  new: "border-s-2 border-s-selected",
  improving: "border-s-2 border-s-warning",
  selected: "border-s-2 border-s-success",
  outdated: "border-s-2 border-s-warning",
  // NOT `opacity-70`. Dimming the whole card drags every piece of text inside
  // it below the AA contrast minimum — the description measured 3.16:1 — and
  // "faded" is a colour-only cue anyway. The state badge says the word.
  set_aside: "",
};

function ConceptCard({
  world,
  concept,
  projectTitleFa,
  onOpen,
}: {
  world: PanelSnapshot;
  concept: Concept;
  projectTitleFa: string | null;
  onOpen: () => void;
}) {
  const version = world.conceptVersions.find((v) => v.id === concept.activeVersionId);
  const state = conceptStateOf(concept);
  const pulse = usePulseKey(state);

  /*
    The WHOLE card is the control, which is how the content and overview cards
    already worked and how this one did not.

    It carried three ways in: a pressable title, a «باز کردن کانسپت» button, and
    a card that ignored the pointer entirely. Two of those did the same thing
    and the third did nothing, so the same gesture meant different things on
    two surfaces of one product. One target, one meaning, everywhere.
  */
  return (
    <Card
      data-testid="concept-card"
      data-state={state}
      className={`drop-material drop-interactive h-full gap-0 overflow-hidden py-0 ${STATE_TONE[state]}`}
    >
      <button
        type="button"
        data-testid="open-concept"
        onClick={onOpen}
        className="flex h-full w-full flex-col items-start gap-3 p-4 text-start hover:bg-accent/40"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Three states, in three words (ADR-0020 D7). */}
          <Badge
            key={pulse}
            variant="outline"
            data-testid="concept-state"
            className={pulse > 0 ? "drop-pulse" : undefined}
          >
            {CONCEPT_STATE_LABEL_FA[state]}
          </Badge>
          {/*
            A machine title is a whole English sentence, and `Badge` is
            `w-fit shrink-0 whitespace-nowrap`: it sizes to its content and
            refuses to shrink, so one long title pushed 74px of the card off
            the side of the screen. It ellipsises now. The mock world's titles
            are short Persian, which is why the e2e overflow sweep never
            caught this.
          */}
          {projectTitleFa === null ? null : (
            <Badge variant="secondary" className="max-w-full min-w-0 shrink truncate">
              <ContentText>{projectTitleFa}</ContentText>
            </Badge>
          )}
        </span>
        <span className="text-base font-semibold">
          <ContentText>{version?.titleFa ?? "کانسپت بدون عنوان"}</ContentText>
        </span>
        {/* Two to three lines; the full document lives in the detail view. */}
        <span className="line-clamp-3 text-sm leading-7 text-muted-foreground">
          <ContentText>{version?.thesisFa}</ContentText>
        </span>
      </button>
    </Card>
  );
}
