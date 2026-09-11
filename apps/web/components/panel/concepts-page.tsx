"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ContentText,
  EmptyState,
} from "@drop/ui";
import type { Concept, PanelSnapshot } from "@drop/panel-domain";
import {
  ALL_PROJECTS,
  ProjectSelector,
  filterByProject,
  useSelectedProject,
} from "./project-selector";
import { ConceptDetail } from "./concept-detail";
import { useReturnFocus } from "./use-return-focus";
import { NewConceptComposer } from "./new-concept-composer";
import { conceptStateOf, CONCEPT_STATE_LABEL_FA, type ConceptState } from "../../lib/demo/presentation";

/**
 * Concepts — the start, review and selection of ideas (ADR-0020 D2).
 *
 * This replaced the projects list as the primary destination. The card carries
 * only what a person needs to decide whether to open it: title, a short
 * description, when it was made, and a state in three words. No identifiers, no
 * version labels, no review-workflow vocabulary (ADR-0020 D5).
 */
export function ConceptsPage({ world }: { world: PanelSnapshot }) {
  const selectedProject = useSelectedProject();
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

  const concepts = filterByProject(world.concepts, selectedProject);
  const openConcept = concepts.find((c) => c.id === openConceptId) ?? null;

  const projectTitle = (id: string) =>
    world.projects.find((p) => p.id === id)?.titleFa ?? "";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">کانسپت‌ها</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectSelector world={world} />
          <Button
            data-testid="start-concept"
            onClick={() => {
              composerFocus.remember();
              setComposerOpen(true);
            }}
          >
            شروع کانسپت جدید
          </Button>
        </div>
      </header>

      {concepts.length === 0 ? (
        <EmptyState
          title="هنوز کانسپتی ساخته نشده"
          detail="اولین مسیر را شروع کنید."
          action={
            <Button
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
        onOpenChange={(next) => composerFocus.onOpenChange(next, setComposerOpen)}
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

const STATE_TONE: Record<ConceptState, string> = {
  generating: "border-border",
  new: "border-selected/50",
  improving: "border-warning",
  selected: "border-success/60",
  // NOT `opacity-70`. Dimming the whole card drags every piece of text inside
  // it below the AA contrast minimum — the description measured 3.16:1 — and
  // "faded" is a colour-only cue anyway. The state badge says the word.
  set_aside: "border-border",
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

  return (
    <Card data-testid="concept-card" data-state={state} className={`h-full gap-3 ${STATE_TONE[state]}`}>
      <CardHeader>
        <CardTitle className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* Three states, in three words (ADR-0020 D7). */}
            <Badge variant="outline" data-testid="concept-state">
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
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="text-start text-base font-semibold underline-offset-4 hover:underline"
          >
            <ContentText>{version?.titleFa ?? "کانسپت بدون عنوان"}</ContentText>
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Two to three lines; the full document lives in the detail view. */}
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
          <ContentText>{version?.thesisFa}</ContentText>
        </p>
        <Button size="sm" variant="outline" onClick={onOpen} data-testid="open-concept">
          باز کردن کانسپت
        </Button>
      </CardContent>
    </Card>
  );
}
