# Ticket P5 — Synchronized workflow graph: eight product nodes, per-concept branches, lineage revision loops and inspectors

```yaml
ticket_id: "P5"
title: "packages/workflow-ui: the گردش کار graph in execution-inspection mode by default — eight product node classes, per-concept groups, lineage-drawn revision loops, node inspector with read-only machine identity, a secondary definition-inspection mode and a mandatory accessible stage list"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "V2 02 §9 — execution inspection is the default; definition inspection is a secondary mode; template authoring is deferred, with no arbitrary node editing and no execution of custom code; pan/zoom, fit, minimap, branch collapse and selection; node drag adjusts local layout only, never machine state or dependencies"
  - "V2 02 §9 — the node set: Input (blank/reference), Concept generation, Concept review, per-approved-concept Research, per-item Content generation, per-item Content review, Package, Calendar; specialized output agents may be collapsed subordinate nodes without being implemented"
  - "V2 02 §9 — top-to-bottom layout, groups per concept, branch detail on demand, loop edges labeled “revision” from each review gate back to its own generation step; rejected/discarded branches end visibly; the package join waits only on selected required content; the calendar edge means plan-entry creation, not publication"
  - "V2 02 §9 — nodes display name, status label/icon, owner when relevant, attempts and output counts; the inspector shows input, output, checks, comments, versions, history and safe error; Machine 01–05 identity arrives through a supplied mapping and is never equated with the five product stages by position"
  - "V2 02 §9 — graph review shortcuts call the same approval service as the inbox; an accessible equivalent stage list is provided because the graph cannot be the only way to act; visual state is derived from domain DTOs and never stored as independent truth in React Flow nodes"
  - "V2 02 §1 — RTL at document root with English identifiers isolated; the graph's mathematical coordinates stay unmirrored while node labels are RTL; status by icon plus label, never color alone; bundled Vazirmatn"
  - "V2 02 §5 — `workflow` / «گردش کار» is one of the seven always-visible project tabs, a prominent project tab rather than an independent disconnected dashboard (V2 02 §2)"
  - "V2 02 §10 — loading, empty, error+retry, offline/stale, permission-denied and success feedback on every destination; stale content stays visible with a last-sync timestamp; mutations disable with an explanation where the scenario disallows them; reduced motion disables decorative transitions; 1440/1024/768/390 validated"
  - "V2 01 §4, §5, §6, §7 — targeted revision has no fixed one-round limit; regenerating one content item never replaces another; readiness counts only the frozen output plan's required items; candidate concepts not selected for research do not count against readiness; a calendar item never reads “published” because a date was chosen"
  - "V2 04 §3 — P5 is “Synchronized graph with branches, localized loops, inspectors and definition inspection”; V2 04 §4 journey A14 (same action from inbox/card/graph produces an identical result, one audit event and synchronized counts) and A20 (the whole journey is usable without graph drag or mouse)"
  - "18 §8 workflow graph requirements; 18 §11 step 5; 18 §6 canvas-adapter rule — React Flow objects never become the integration contract; 18 §4.1 state coverage"
  - "02 (ADR-0010) D2 open-source `@xyflow/react` with DROP-owned nodes under the Pro license gate; D3 modes; D4 Zustand owns selection/viewport/panel state and TanStack Query owns cached gateway state; D6 top-to-bottom direction and RTL; D7 artifacts live in ports and panels, never as default path nodes; D9 ELK behind a small layout adapter and no executable meaning in x/y; D11 accessibility with a non-canvas equivalent for every canvas action"
  - "09 §9 central Persian labels; 09 §12 Jalali display and LTR-isolated identifiers"
adr_constraints:
  - "ADR-0019 D18 — the surface renders EIGHT product node classes; execution inspection is the DEFAULT mode and definition inspection is secondary; revision loop edges are labeled “revision”, scoped to their own generation step and RENDERED FROM VERSION LINEAGE in execution mode, carrying no iteration cap, while definition-mode loop-back edges keep their required `maxIterations` unchanged; the package join waits only on the output plan's required content; the calendar edge means plan-entry creation; rejected and discarded branches end visibly; Machine 01–05 identity is read-only in the inspector, sourced from the definition's optional machine number joined against `listMachines()`, absent when the definition supplies none, and never inferred from graph position; visual state is derived from domain DTOs and never stored as independent truth in React Flow nodes; an accessible equivalent stage list is mandatory; P5 renders the graph review shortcuts DISABLED and P6 wires them"
  - "ADR-0019 D20 — the frontier is one ticket at a time and P5's recorded dependency set is corrected to `[\"P4\"]`; the order is P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8"
  - "ADR-0019 D12 — `PRODUCT_STAGES` is a PROVISIONAL vocabulary orthogonal to `STAGE_STATUSES` and `RUN_STATUSES`; the run-stage-to-product-stage mapping is a null-tolerant table and a named P8 open decision; the panel does not renumber Machines 01–05 and claims no inferred mapping"
  - "ADR-0019 D3 — `MachineGateway` gains no members; `PanelGateway` stays read-only with its seven members; graph writes, when P6 adds them, land on `PanelCommandGateway` and `RevisionGateway`. P5 reads only"
  - "ADR-0019 D4 / ADR-0013 D1–D5 — `ReviewApplicationService.reviewItem` is the facade above the gateways, the sole constructor of `ApprovalCommand`, delegating to `MachineGateway.submitApproval`. This ticket introduces no second decision path and no affordance that presents a gate verb as a run command (ADR-0013 D2 removed the gate verbs from `RUN_COMMAND_VERBS`)"
  - "ADR-0019 D5 / D6 — the card review vocabulary (`draft, in_review, revision_requested, approved, rejected`) plus the separate `current | stale` freshness axis is additive presentation reached through the named projection adapter; stored codes stay UPPER_SNAKE and the V2 lowercase literals are the mock-JSON wire form normalized at the loader boundary"
  - "ADR-0019 D7 — `PLANNED | CONFIRMED | DONE | CANCELLED` stands and ADR-0015 D5 is not amended; V2 `unscheduled` is `PLANNED` with `date === null`. The Calendar node never renders “published”"
  - "ADR-0019 D9 — `AUDIT_EVENT_NAMES` stays closed at 35; the graph invents no event name"
  - "ADR-0019 D16 — the demo clock is `2026-09-06T09:00:00Z`; `Date.now` and `Math.random` are unreachable from fixture and adapter code, the layout adapter included"
  - "ADR-0012 — node status renders the recorded `STAGE_STATUSES` and the run chip the recorded `RUN_STATUSES`, verbatim; BLOCKED-style labels are UI categories over `WAITING_*` plus a reason code (ADR-0012 D4), never new state names"
  - "ADR-0018 D3 — the twelve frozen workspaces stay inert. `packages/workflow-ui` is a panel package and is deliberately absent from the frozen-set manifest (`tests/repo/placeholder-purity.test.ts`, “no panel package is frozen by mistake”); this is the ticket that activates it"
  - "ADR-0016 — no CDN or remote-font dependency: the React Flow stylesheet and the layout engine ship bundled from the workspace, never fetched at runtime"
in_scope:
  - "packages/workflow-ui — the canvas model: DROP-owned node and edge view-models built by an adapter from P2 DTOs, with React Flow types sealed inside the package (18 §6, 05 §4)"
  - "packages/workflow-ui — the eight product node classes: Input (blank «بدون ورودی» / reference «با رفرنس»), Concept generation, Concept review, per-approved-concept Research, per-item Content generation, per-item Content review, Package, Calendar; specialized output agents render as collapsed subordinate nodes and are not implemented"
  - "packages/workflow-ui — EXECUTION INSPECTION as the default mode (`RUN_EXECUTION`, 02 D3): the graph is built from the project's own DTOs — `PanelProject.input`, concepts and concept versions, the frozen output plan, content items and content versions, the package snapshot and the calendar entry"
  - "packages/workflow-ui — DEFINITION INSPECTION as the secondary mode (`TEMPLATE_READ`, 02 D3): the supplied `WorkflowDefinition` rendered as-is, with `workflowNodeDefinitionSchema` node kinds and `workflowEdgeDefinitionSchema` edges including loop-back edges and their required `maxIterations`. No edit, publish or node-library affordance exists anywhere in either mode"
  - "packages/workflow-ui — per-concept groups: one group per included concept containing that concept's Research node and its per-item Content generation and Content review pairs; branch collapse and branch detail on demand"
  - "packages/workflow-ui — revision loop edges in execution mode drawn FROM VERSION LINEAGE: one labeled “revision” edge per lineage step from a review node back to its own generation node, scoped to that item, with no iteration cap and no `maxIterations` field anywhere on it"
  - "packages/workflow-ui — the package join edge set derived from `outputPlan.requiredContentIds` only; the calendar edge whose meaning is plan-entry creation; rejected and discarded branches terminated with a visible end marker"
  - "packages/workflow-ui — node chrome: name, status label plus icon, owner where relevant, attempt count and output count (V2 02 §9); status is never color alone (V2 02 §1)"
  - "packages/workflow-ui — the node inspector: input, output, checks, comments, versions, history and safe error; artifacts appear in ports and panels, never as default path nodes (02 D7); read-only Machine 01–05 identity from the definition's optional `machineNumber` joined against `MachineGateway.listMachines()`, rendered absent when the definition supplies none"
  - "packages/workflow-ui — the accessible equivalent stage list: a keyboard-operable structured list carrying the same status, counts and per-node actions as the canvas, derived from the same view-model"
  - "packages/workflow-ui — DISABLED graph review shortcuts on the Concept review and Content review nodes, each with a Persian explanation naming P6 as the wiring ticket; the disabled control already targets `ReviewApplicationService.reviewItem` in its types so P6 wires rather than redesigns"
  - "packages/workflow-ui — ELK behind a small layout adapter (02 D9): top-to-bottom, grouped, multi-handle, deterministic under the demo clock; layout output never carries executable meaning"
  - "packages/workflow-ui — Zustand for viewport, selection, collapsed branches and inspector state only (02 D4, V2 03 §1); TanStack Query owns the gateway data the adapter consumes"
  - "packages/workflow-ui — pan/zoom/fit, minimap, selection, and node drag that moves only the local layout"
  - "apps/web — the `workflow` project tab route body under `app/studio/projects/[id]/workflow/`, mounting the graph inside P1-R's sticky project header and five-segment stage strip, with the mode toggle defaulting to execution inspection and both modes' state in URL query parameters (ADR-0019 D13)"
  - "Dependencies: `@xyflow/react` and `elkjs` added to `packages/workflow-ui` ONLY, at exact versions (`pnpm add -E`), plus the React/@types/react devDependencies `packages/ui` already pins; the React Flow stylesheet imported as a bundled module"
  - "eslint.config.mjs — a new terminal zone banning `@xyflow/*` everywhere outside `packages/workflow-ui`, restating every restriction the zones it replaces placed on the same globs"
  - "vitest.config.ts — the jsdom project's `include` gains `packages/workflow-ui/src/**/*.test.tsx` so this ticket's component tests actually run"
  - "Every V2 02 §10 state on the workflow tab: loading skeleton, empty (no run yet), error with retry, offline/stale with last-sync timestamp, permission-denied, and reduced-motion"
out_of_scope:
  - "Wiring any command. Approve / request changes / reject / revise from the graph are P6; here every review shortcut renders disabled (ADR-0019 D18). No `PanelCommandGateway` or `RevisionGateway` call is made from this ticket"
  - "`TEMPLATE_EDIT` and every edit-side surface: node library, semantic/layout save split, `expectedRowVersion` conflict diff, server validation console, publish (02 D3; deferred with the machine build, ADR-0017 D2). V2 02 §9 defers template authoring explicitly"
  - "`RUN_COMPARE` mode (02 D3, later release)"
  - "SSE or polling transport (02 D8, deferred with 0.16); the subscription transport stays PROVISIONAL (ADR-0019 D9) and refresh/synchronize simulation is P6"
  - "New DTOs, new gateway members, new fixtures. P2 and P3 are frozen; a gap found while adapting goes to P8's open-decisions list, never inline (15 §11)"
  - "Any change to `MachineGateway` (byte-frozen), to `PanelGateway`'s seven read-only members, to `AUDIT_EVENT_NAMES`, or to the ADR-0015 D5 status sets"
  - "React Flow Pro template sources (02 D2 license gate); the Pro AI Workflow Editor is a visual reference only (V2 02 §1)"
  - "A new workspace package. `tests/repo/workspace-integrity.test.ts` pins exactly sixteen"
contracts_changed:
  - "None. The canvas view-model types stay inside `packages/workflow-ui` behind the (18 §6) adapter and are never exported into a gateway signature; the P2 DTOs are consumed unchanged"
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements:
  - "Read-only surface. The graph respects the active scenario's demo actor and role for visibility only; panel-side checks are never a security boundary (18 §4.2) and switching a client-side mode never grants authority (02 D3)"
  - "S14 (actor-viewer) renders the graph and the stage list with no review shortcut at all — not a disabled-for-P6 control, which would misstate the reason; the permission-denied explanation is distinct from the not-yet-wired explanation"
failure_states:
  - "S08 — o2 blocked by source s3 with retrieval-s3: the Content generation node renders the derived block label over `WAITING_FOR_INPUT` plus its reason code, names the missing dependency, and does not mark the source verified; the c1 branch's unblocked siblings keep rendering"
  - "S09 / S10 — `FAILED_RETRYABLE` and `FAILED_FINAL` are visually distinct; S10's `CONTRACT_INCOMPATIBLE` diagnostic renders as safe text with no raw provider payload"
  - "S13 — machine system disconnected: the graph keeps stale content visible with a last-sync timestamp and an explicit degraded marking; it never fabricates node state and never presents stale data as fresh"
  - "S21 — a revised c4 marks o5/o6 and pkg-p2-v1 stale: stale nodes render the `stale` freshness badge, the Package node loses current readiness, and the historical package stays visibly historical"
  - "S24 — every active proposal rejected: every Concept review node ends with a visible terminal marker, no Research node is drawn beneath any of them, and the Package join renders as unreachable rather than as pending"
  - "Unknown project or run id, and an unauthorized project: error and permission-denied states with no data leakage"
  - "A definition with no `machineNumber` on any node: the inspector's machine row is ABSENT, never a guessed number and never “Machine 06”"
test_seams:
  - "Component seam (Vitest + Testing Library, jsdom project): node components, edge components, the inspector, the stage list, the layout adapter and the canvas adapter — every `STAGE_STATUSES` member and every `RUN_STATUSES` member exercised"
  - "Scenario seam: S04, S06, S08, S09, S10, S13, S14, S17, S18, S19, S21, S24 each rendered from its loaded scenario and asserted; each produces a deterministic, visibly distinct graph"
  - "Seam A: the canvas adapter's input types are exactly the P2 DTOs and its fixtures validate against the P2 Zod schemas; the execution-mode revision edge is proven NOT to be a `WorkflowEdgeDefinition`"
  - "Seam E (Playwright): the workflow tab in FA/RTL at 1440/1024/768/390, axe WCAG 2.2 AA in both themes, the keyboard-only stage-list journey (A20), and a zero-external-request assertion over the tab's network log"
  - "Seam F (repo): the amended `eslint-zone-terminality.test.ts` and `dependency-direction.test.ts`; `placeholder-purity.test.ts`, `workspace-integrity.test.ts`, `check-pinned.mjs` and `check-token-literals.mjs` stay green"
acceptance_criteria: "AC-P5.1 through AC-P5.14 — see the checkbox list below"
dependencies: ["P4"]
files_owned:
  - "packages/workflow-ui/** — canvas model, adapters, node and edge components, layout adapter, inspector, stage list, package.json and tsconfig.json"
  - "apps/web/app/studio/projects/[id]/workflow/** — the گردش کار tab body; P1-R's shell, header and stage strip are consumed, not edited"
  - "eslint.config.mjs — the new @xyflow zone split (append only; no earlier zone is deleted)"
  - "vitest.config.ts — the jsdom include glob"
  - "tests/repo/eslint-zone-terminality.test.ts, tests/repo/dependency-direction.test.ts, tests/repo/boundary-fixtures-bad/component-imports-react-flow.ts — amendments and one new fixture, each in the commit that forces it"
  - "tests/e2e/panel/workflow-graph.spec.ts and its snapshots"
handoff_required: true
```

## What to build

The workflow tab as a **synchronized, read-only view of the same journey P4 already renders as
cards** — the same DTOs, the same statuses, the same counts, drawn as a graph. The graph adds no
truth. Journey A14 is the whole point: the same item shows the same state in the inbox, on its
card and on its node, and P6's commands will move all three at once.

The old P5 text described a different surface — five machine stage nodes, definition mode first —
and ADR-0019 D18 corrects it on four points, all of which this rewrite carries. The graph is
product-shaped, not machine-shaped.

**Demoable when done:** open S17 (two approved branches) on p1's گردش کار tab. Execution
inspection is already showing: an Input node reading «بدون ورودی», one Concept generation node,
four Concept review nodes, and — beneath the two approved concepts only — two per-concept groups,
each with its Research node and its content generation/review pairs. c3's Concept review node ends
in a visible terminal marker with nothing below it. Collapse one branch, fit the view, open o4's
Content review node: the inspector shows its versions, its comments, its checks and its
attempts, and a machine row that is present only because the definition supplied a machine number.
Switch to S18 and a “revision” edge appears from o4's review node back to o4's own generation
node — one edge, one item, no cap. Tab to the stage list and read the identical state without
touching the canvas.

Key mechanics:

1. **Eight product node classes, not five machines.** The node set is Input (blank/reference),
   Concept generation, Concept review, per-approved-concept Research, per-item Content generation,
   per-item Content review, Package and Calendar (V2 02 §9; ADR-0019 D18). V2 02 §9 forbids the
   old reading outright: "never equate the five product stages with five machines by position".
   Machines 01–05 are not renumbered, there is no Machine 06, and no node class is a machine.
   `PRODUCT_STAGES` is provisional and orthogonal (ADR-0019 D12) — do not build the graph from it
   either.
2. **Machine identity is a join, and it is allowed to be empty.**
   `workflowNodeDefinitionSchema.machineNumber` is `.optional()` and constrained to
   `MACHINE_NUMBERS` (1–5). The inspector reads it from the definition and joins it against
   `MachineGateway.listMachines()` for the display name. When the definition supplies none, the
   machine row is absent. Never derive it from the node's depth, order or group — that is exactly
   the inference V2 02 §9 and ADR-0019 D18 prohibit, and it is invisible in a screenshot, which is
   why it needs its own test.
3. **Execution revision edges come from version lineage and are NOT `WorkflowEdgeDefinition`s.**
   This is the trap the ticket exists to close. In execution mode a “revision” edge is drawn
   because a lineage step exists — `ConceptVersion.number` advancing, `Concept.pendingRevisionId`
   set, the same for `ContentVersion` / `ContentItem` — and it is scoped to that one item's own
   generation node. It carries no cap, because V2 01 §4 states the user "can repeat targeted
   revisions without a fixed one-round limit". Definition mode is the other thing entirely:
   `workflowEdgeDefinitionSchema`'s `superRefine` raises `LOOP_BACK_EDGE_REQUIRES_MAX_ITERATIONS`
   when `isLoopBack === true` and `maxIterations` is undefined, and that stays exactly as it is.
   The failure mode to avoid is modelling the lineage edge as a `WorkflowEdgeDefinition`: the
   schema will demand a `maxIterations` the lineage cannot supply, and the tempting fix — writing
   `maxIterations: 3` — fabricates a product rule that does not exist. Give the execution edge its
   own canvas-model type, and assert in Seam A that it never validates as a
   `WorkflowEdgeDefinition`.
4. **Groups per concept; the join waits on the plan, not on the batch.** One group per included
   concept. The Package join edge set is `outputPlan.requiredContentIds` and nothing else —
   `optionalContentIds` never gate, and candidate concepts not selected for research do not count
   against readiness (V2 01 §6). For p1 that is o1–o4 under c1; c2 (in_review) and c3 (rejected)
   contribute no join edge. The Calendar edge means plan-entry creation, never publication: the
   Calendar node shows «برنامه‌ریزی‌شده» with a date or «آماده برنامه‌ریزی» without one, mapped
   onto `PLANNED` (ADR-0019 D7), and the word "published" appears nowhere.
5. **Visual state is derived, every render.** Node `data` carries identifiers and the
   already-derived view-model; nothing writes a status back into a React Flow node, and no
   `setNodes` call is a status mutation (V2 02 §9, V2 03 §1: "No direct mutations of query data or
   React Flow status"). Zustand holds viewport, selection, collapsed branches and inspector state
   only (02 D4). Node drag writes layout coordinates and nothing else — a workflow's executable
   meaning cannot depend on its x/y (02 D9).
6. **The stage list is not optional and not a fallback.** V2 02 §9: "graph cannot be the only way
   to act", and journey A20 requires the complete journey without graph drag or mouse. Build the
   list from the same view-model as the canvas so the two cannot drift, and test it as a
   first-class surface, not as a screen-reader afterthought.
7. **Review shortcuts render disabled, and the boundary holds.** The Concept review and Content
   review nodes carry the shortcut controls in their disabled state with a Persian explanation
   (V2 02 §10 requires the explanation). Type them against
   `ReviewApplicationService.reviewItem` now so P6 wires them without redesign — that facade is the
   sole constructor of `ApprovalCommand` and delegates to `MachineGateway.submitApproval`
   (ADR-0019 D4). No gate verb is presented as a run command anywhere. S14's viewer sees no
   shortcut at all, with the permission reason, not the P6 reason.
8. **The ESLint zone is a replacement, not an addition.** `eslint.config.mjs` already carries the
   warning in prose: flat config **replaces** a repeated rule's options, so the last matching block
   is the only `no-restricted-imports` a file gets. Today one terminal zone matches
   `packages/workflow-ui/**`, `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**` and
   `tests/repo/boundary-fixtures-bad/component-*.ts` together, with three groups
   (`@drop/mock-data`, `@drop/panel-domain/fixtures`, `drizzle-orm`). P5 must split it: keep those
   three for `packages/workflow-ui/**`, where `@xyflow/*` is legal, and add a new terminal
   `apps/web` zone that restates all three **and** adds `@xyflow/*`. Add `@xyflow/*` to the
   `packages/ui` zone too, restating its four existing groups. Move the
   `boundary-fixtures-bad/component-*.ts` glob onto the banning zone — leave it on the workflow-ui
   zone and the new fixture is judged by a block that permits React Flow, and the test fails for
   the wrong reason. `tests/repo/eslint-zone-terminality.test.ts` is what catches every mistake
   here: extend it with a probe at `apps/web/app/` proving `@xyflow/react` is rejected, a probe at
   `packages/workflow-ui/src/` proving it is still allowed (the positive control that stops the
   zone from simply banning everything), and re-run the existing probes unchanged.
   `tests/repo/dependency-direction.test.ts` pins its fixture list exactly, so the new
   `component-imports-react-flow.ts` must be added to that array in the same commit.
9. **`vitest.config.ts` does not run a single workflow-ui component test today.** The node project
   includes `packages/*/src/**/*.test.ts` — `.ts` only — and the jsdom project includes only
   `packages/ui/**` and `apps/web/**`. A `packages/workflow-ui/src/nodes/concept-review.test.tsx`
   therefore matches nothing, never runs, and `pnpm test` stays green while the component seam is
   empty. Add `packages/workflow-ui/src/**/*.test.tsx` to the **jsdom** project's `include`. Keep
   pure adapter tests as `.test.ts` so they keep running in the node project; a DOM-touching test
   named `.test.ts` lands in the node project and fails on `document`, which is loud rather than
   silent, but rename it rather than widen the node project.
10. **Three build-config facts that will fail first.** `packages/workflow-ui/tsconfig.json` today
    is `{ extends, include: ["src"] }` with no `jsx` and no DOM lib, so `pnpm -r run typecheck`
    breaks on the first `.tsx` file — mirror `packages/ui/tsconfig.json` (`"jsx": "react-jsx"`,
    `lib: ["ES2023","DOM","DOM.Iterable"]`) in the package's own tsconfig, because ADR-0019 D17
    forbids widening `tsconfig.base.json`'s `lib`. `scripts/check-pinned.mjs` rejects any range
    that is not exact semver, so `@xyflow/react` and `elkjs` go in with `pnpm add -E`.
    `scripts/check-token-literals.mjs` scans `packages/workflow-ui/src` for `#hex`, `rgb(`,
    `hsl(` and `oklch(` — every React Flow variable override (`--xy-edge-stroke`,
    `--xy-node-border`, and the rest) must be set to a `var(--…)` token from
    `packages/ui/src/theme.css`, including `--node-surface`, which P1-R mapped into
    `@theme inline` for exactly this ticket.
11. **Nothing loads from the network.** Import the React Flow stylesheet as a bundled module and
    use elkjs's bundled build — no `<link>`, no CDN, no worker URL fetched at runtime (ADR-0016;
    V2 04 §5 requires verifying external calls are absent in demo mode). The Seam E spec asserts
    zero external requests while the tab renders.
12. **Determinism.** The layout adapter is fixture-and-adapter code: `Date.now` and `Math.random`
    are unreachable from it (ADR-0019 D16). ELK must be configured for a stable ordering so the
    Playwright snapshots do not flake, and the demo clock stays `2026-09-06T09:00:00Z`.

Constraints carried forward unchanged: the graph executes no code stored in nodes, permits no
arbitrary JavaScript, and stores no provider prompt or secret (18 §8); node status uses the
`STAGE_STATUSES` and `RUN_STATUSES` names verbatim with BLOCKED only as a derived label over
`WAITING_*` plus a reason code (ADR-0012 D4); artifacts appear in ports and panels, never as
default path nodes (02 D7); RTL chrome with LTR-isolated identifiers while the canvas's
mathematical coordinates stay unmirrored (V2 02 §1, 02 D6); reduced motion removes decorative
transitions (V2 02 §10).

## Blocked by

**P4 only** (ADR-0019 D20). The frontier is one ticket at a time — P1-R → P2 → P3 → P4 → P5 → P6 →
P7 → P8 — and P4 transitively carries P1-R, P2 and P3. P5 starts when P4 completes with green
checks, an independent review and its (16 §9) handoff. It consumes P4's application services,
query keys and projection adapters rather than re-deriving them; a graph that computes readiness
or freshness differently from P4's cards is a defect in this ticket, not a second opinion.

## Acceptance criteria

- [ ] **AC-P5.1 Execution inspection is the default** — opening `/studio/projects/{id}/workflow`
  lands in execution inspection with no mode switch; definition inspection is reachable as the
  secondary mode and its state lives in a URL query parameter; neither mode exposes an edit,
  publish or node-library affordance. *Seam: component, E.*
- [ ] **AC-P5.2 Eight product node classes** — the graph renders Input (blank/reference), Concept
  generation, Concept review, per-approved-concept Research, per-item Content generation, per-item
  Content review, Package and Calendar; a test asserts that no node class is named for or keyed by
  a machine, and that the class set is exactly these eight. *Seam: component, A.*
- [ ] **AC-P5.3 Machine identity is read-only, joined, and omissible** — the inspector shows the
  machine row only when the definition supplies `machineNumber`, resolving its name through
  `listMachines()`; with the field absent the row is absent; a positional-inference test asserts
  that reordering nodes changes no machine attribution. *Seam: component, A.*
- [ ] **AC-P5.4 Revision loops come from lineage and carry no cap** — S18 draws one “revision”
  edge from o4's Content review node to o4's own Content generation node and none elsewhere; the
  edge object carries no `maxIterations` and fails `workflowEdgeDefinitionSchema`; in definition
  mode a loop-back edge still requires `maxIterations` and a fixture without one is still rejected
  with `LOOP_BACK_EDGE_REQUIRES_MAX_ITERATIONS`. *Seam: A, scenario.*
- [ ] **AC-P5.5 Branches, joins and terminals** — S17 renders one group per approved concept with
  independent content pairs; S24 ends every rejected Concept review node with a visible terminal
  marker and draws no Research node beneath it; the Package join edge set equals
  `outputPlan.requiredContentIds`, with optional items and unselected candidates excluded; the
  Calendar node reads «برنامه‌ریزی‌شده» or «آماده برنامه‌ریزی» and never “published”.
  *Seam: scenario, component.*
- [ ] **AC-P5.6 Layout and canvas controls** — ELK lays the graph top-to-bottom through the layout
  adapter with per-concept grouping; pan, zoom, fit, minimap, branch collapse and selection work;
  dragging a node changes only its layout coordinates and leaves every status, dependency and edge
  identical. *Seam: component, E.*
- [ ] **AC-P5.7 Derived visual state** — a test mutates a React Flow node's `data` directly and
  asserts the next render restores the DTO-derived state; no code path writes a status into a node
  or edge object; Zustand holds viewport, selection, collapse and inspector state only.
  *Seam: component.*
- [ ] **AC-P5.8 Every status renders, never by color alone** — every `STAGE_STATUSES` member and
  every `RUN_STATUSES` member renders with icon plus label; blocked presentations derive from
  `WAITING_FOR_INPUT` / `WAITING_FOR_APPROVAL` plus a reason code including
  `PROVIDER_CONFIGURATION_REQUIRED`; the additive card vocabulary and the `current | stale`
  freshness badge reach the graph only through the P4 projection adapter. *Seam: component, A.*
- [ ] **AC-P5.9 Inspector** — input, output, checks, comments, versions, history and safe error
  render from P2 DTOs for a selected node; artifacts appear in ports and panels, never as default
  path nodes; S10's `CONTRACT_INCOMPATIBLE` diagnostic renders with no raw provider payload.
  *Seam: component, scenario.*
- [ ] **AC-P5.10 The accessible stage list is equivalent** — the list renders the same nodes,
  statuses, counts and controls as the canvas from the same view-model; the whole workflow tab is
  operable by keyboard alone with visible focus, Persian aria labels and LTR-isolated identifiers;
  A20's keyboard-only journey passes with no pointer interaction. *Seam: component, E.*
- [ ] **AC-P5.11 Review shortcuts are disabled here, not absent and not wired** — Concept review
  and Content review nodes render the shortcut controls disabled with a Persian explanation naming
  P6; no `PanelCommandGateway`, `RevisionGateway` or `submitApproval` call is reachable from this
  ticket's code; under S14 the shortcut is not rendered at all and the reason shown is permission,
  not P6. *Seam: component, scenario.*
- [ ] **AC-P5.12 Boundary zones, proven at real paths** — `@xyflow/*` is rejected in `apps/web`,
  `packages/ui`, the domain packages and the contract packages, and still permitted in
  `packages/workflow-ui`; `eslint-zone-terminality.test.ts` proves both directions with throwaway
  files at real source paths and its existing probes still pass, showing no earlier restriction was
  dropped when the zone was split; `dependency-direction.test.ts`'s pinned fixture list gains
  `component-imports-react-flow.ts` and that fixture fails lint. *Seam: F.*
- [ ] **AC-P5.13 The component seam actually runs** — `vitest.config.ts`'s jsdom project includes
  `packages/workflow-ui/src/**/*.test.tsx`; a deliberately failing assertion in a new workflow-ui
  component test is shown to turn `pnpm test` red before it is corrected, proving the glob rather
  than assuming it. *Seam: F.*
- [ ] **AC-P5.14 Pinned, bundled, inert and green** — `@xyflow/react` and `elkjs` appear at exact
  versions in `packages/workflow-ui/package.json` and nowhere else, with no Pro package and no
  vendored Pro source; the Playwright run records zero external requests on the workflow tab;
  `workspace-integrity.test.ts` still counts sixteen packages, `placeholder-purity.test.ts` still
  finds the twelve frozen workspaces inert, and
  `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` pass with axe WCAG 2.2
  AA green in both themes at 1440, 1024, 768 and 390 px. *Seam: E, F.*
