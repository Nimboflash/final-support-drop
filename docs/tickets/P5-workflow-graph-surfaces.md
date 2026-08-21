```yaml
ticket_id: "P5"
title: "Workflow graph surfaces: React Flow definition and run-inspection views on mock data"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "18 §8 workflow graph requirements; 18 §11 step 5; 18 §6 canvas-adapter rule (React Flow objects never become the integration contract); 18 §7.2 scenarios 3–11 as the graph's display cases; 18 §3 React Flow AI Workflow Editor as interaction/layout reference only"
  - "02 (ADR 0010): D2 @xyflow/react with DROP-owned nodes/edges under the Pro license gate; D3 modes; D6 RTL + top-to-bottom direction; D7 canvas semantics (artifacts in ports/panels, not default path nodes); D9 ELK layout; D11 accessibility"
  - "Surviving canvas substance of superseded ticket 0.13 (ADR-0017 D2): 08 §1 license gate; 08 §2 read-side editor architecture; 08 §3 modes; 08 §§4–6 custom nodes, visual states, edge types; 08 §7 layout; 08 §8 canvas state split (Zustand ephemeral only); 08 §10 inspector; 08 §§14–15 performance and accessibility"
  - "04 §5 workflow routes and page anatomy (read-side subset); 07 §2 node categories as domain vocabulary (kept valid by 18 §2)"
adr_constraints:
  - "ADR-0017 D3/D4/D5: UI consumes P2 panel DTOs through the MachineGateway only; components never import fixtures; no machine execution, no provider calls, no database; packages/ui and packages/workflow-ui are panel packages per (18 §10) — the machine-side 0.1 placeholders stay frozen and the placeholder-purity check must remain green"
  - "ADR-0012: node states render the exact stage vocabulary (DRAFT, READY, QUEUED, RUNNING, WAITING_FOR_DEPENDENCY, WAITING_FOR_INPUT, WAITING_FOR_APPROVAL, PAUSED, FAILED_RETRYABLE, FAILED_FINAL, SUCCEEDED, SKIPPED, CANCELLED, SUPERSEDED) and the run-level enum DRAFT|QUEUED|RUNNING|WAITING_INPUT|WAITING_APPROVAL|PAUSED|SUCCEEDED|FAILED|CANCELLED; BLOCKED-style labels are UI categories over WAITING_* states plus reason codes (ADR-0012 D4); no parallel state names are invented (ADR-0017 D4)"
  - "ADR-0013: gate nodes are display surfaces here; when P6 wires the approval CTA it routes exclusively through submitApproval — this ticket must not introduce any affordance that presents a gate verb as a run command"
  - "ADR 0010 (doc 02) D2 + 18 §3: open-source @xyflow/react only while the React Flow Pro license is unconfirmed; the Pro AI Workflow Editor template is a reference, never vendored source"
in_scope:
  - "Definition mode (TEMPLATE_READ, 02 D3) at the workflow routes: mocked workflow definitions rendered with Machines 01–05 as group/stage nodes, human approval gates as separate nodes, dependency edges and loop-back edges (18 §8)"
  - "Run-inspection mode (RUN_EXECUTION, 02 D3): a mocked run snapshot rendered on the definition graph — per-stage state, current stage, overall run status chip, attempt counts"
  - "Full ADR-0012 visual state mapping with non-color-alone status encoding (icon/pattern/label per state; 02 D11); BLOCKED labels derived from reason codes including PROVIDER_CONFIGURATION_REQUIRED (ADR-0012 D4)"
  - "Node inspector: attempts (with history), timestamps, artifacts, validation results, and diagnostics safe for users (18 §4.1, 08 §10); artifacts appear in ports/panels, never as default path nodes (02 D7)"
  - "ELK top-to-bottom layout behind a small layout adapter (02 D9); layout never encodes executable meaning"
  - "Canvas adapter in packages/workflow-ui: P2 domain DTOs in, React Flow node/edge objects out; React Flow types never leave the package (18 §6, 05 §4)"
  - "Keyboard-focusable nodes and edges, Persian aria labels, structured-list alternative view with equivalent state (08 §15, 02 D11); reduced motion removes animated edges except the active RUNNING transition (08 §6)"
  - "Empty, loading, error, permission-denied, and machine-system-unavailable states for the graph routes (18 §4.1)"
out_of_scope:
  - "TEMPLATE_EDIT mode and everything edit-side from 0.13: semantic/layout save split, expectedRowVersion + idempotency, WORKFLOW_VERSION_CONFLICT diff, server validation console, node library, publish — deferred with the machine build (ADR-0017 D2); panel scope has no persistence to save into"
  - "RUN_COMPARE mode (02 D3, later release)"
  - "SSE/live transport (08 §13, 10 §8 — deferred with ticket 0.16 per ADR-0017); refresh/synchronize simulation is P6"
  - "Command wiring of any kind — start/pause/retry/approval interactions are P6"
  - "React Flow Pro template sources (02 D2 license gate)"
contracts_changed:
  - "None. Canvas-model types stay inside packages/workflow-ui behind the (18 §6) adapter; the P2 panel DTOs are consumed unchanged. Gaps found in the DTOs are recorded for P8's open-decisions list, not silently patched"
database_changes: "None — panel scope has no database (ADR-0017 D5)"
permission_requirements:
  - "Graph routes respect the mocked session role of the active scenario; viewers get read-only inspection with no command affordances (02 D3: switching a client-side mode never grants authority)"
  - "Hide/disable by permission for clarity, but panel application services perform the check (18 §4.2); scenario 14 fixtures drive the unauthorized rendering"
failure_states:
  - "Failed run (scenarios 9, 10): FAILED_RETRYABLE vs FAILED_FINAL visually distinct, diagnostics safe for users, no raw provider payloads"
  - "Blocked run (scenarios 7, 8): WAITING_FOR_INPUT with reason code renders the derived block label; missing input vs unavailable external source distinguishable"
  - "Machine system disconnected (scenario 13): graph shows an explicit unavailable state — never stale data presented as fresh, never fabricated state"
  - "Unknown or unauthorized run ID: error / permission-denied state without data leakage"
test_seams:
  - "Component seam: Vitest + testing-library on node components, edge components, inspector, layout adapter, and canvas adapter (every ADR-0012 state exercised)"
  - "Scenario seam: scenarios 3–11 of (18 §7.2) each rendered from its fixture and asserted"
  - "Seam A: the canvas adapter's input types are exactly the P2 panel DTOs; adapter fixtures validate against the P2 Zod schemas"
  - "Seam F: ESLint boundary zones (no @xyflow/react import outside packages/workflow-ui), placeholder-purity and workspace-integrity checks stay green"
acceptance_criteria:
  - "See checkbox list in the body; each maps to a named seam"
dependencies: ["P1", "P2", "P3"]
files_owned:
  - "packages/workflow-ui/** (nodes, edges, canvas adapter, layout adapter, inspector, list alternative)"
  - "apps/web — workflow-definition and run-inspection graph routes introduced here"
handoff_required: true
```

# Ticket P5 — Workflow graph surfaces

## What to build

The workflow graph as an operational visualization surface — no machine intelligence, no
execution, mock data only (18 §3, §8). Tracer-bullet: a demo operator picks a scenario (P3),
opens a mocked workflow definition, and sees the five-machine graph in `TEMPLATE_READ` —
Machines 01–05 as stage nodes, human gates as separate nodes, dependency and loop-back edges,
laid out top-to-bottom by ELK inside the FA-first RTL shell (P1). Switching to a mocked run
opens `RUN_EXECUTION`: every stage shows its ADR-0012 state with non-color-alone encoding, the
run status chip shows the ADR-0012 run-level enum value, and clicking any node opens the
inspector with attempts, timestamps, artifacts, validation results, and safe diagnostics.
Scenarios 3–11 (18 §7.2) each produce a visibly different, deterministic graph.

**Demoable when done:** walk scenarios 3 → 4 → 5 → 6 → 9 → 11 in the scenario fixtures and
show waiting, running, approval-pending, rejected-with-loop-back, retryable-failure, and
completed graphs — all read-only, all from `MockMachineGateway` via the P2 DTOs.

Carried over from superseded ticket 0.13 (ADR-0017 D2), where it survives panel scope:

- DROP custom node components and the full ADR-0012 visual state mapping (08 §§4–5), colour
  never the sole indicator (02 D11);
- domain-DTO-to-canvas adapters with React Flow types sealed inside `packages/workflow-ui`
  (08 §2, 05 §4, 18 §6);
- ELK top-to-bottom layout via a layout adapter (02 D9); RTL chrome with isolated-LTR
  identifiers (02 D6);
- node inspector content (08 §10) and the structured-list alternative + keyboard/aria
  behaviour (08 §15);
- reduced-motion rule: only the active RUNNING transition animates (08 §6);
- Zustand for ephemeral canvas state only; TanStack Query for gateway state (08 §8, 02 D4 —
  with the mock gateway standing in for the server).

Deferred from 0.13 with the machine build: TEMPLATE_EDIT, saves and concurrency, server
validation, publish, node library, SSE consumption, and every 0.16-owned API. Nothing in this
ticket reopens 0.13 or 0.1.

Constraints that shape the build:

- The graph must not execute code stored in nodes, allow arbitrary JavaScript, or store
  provider prompts or secrets (18 §8).
- Node states and the run chip use the ADR-0012 names verbatim — the mocks' presentation
  vocabulary (ADR-0017 D4). `BLOCKED` appears only as a derived UI label over `WAITING_*`
  plus a reason code (ADR-0012 D4).
- Gate nodes render decided/pending approval state (including the ADR-0013 decision
  vocabulary `APPROVED | CHANGES_REQUESTED | REJECTED | ESCALATED` when present in the mock
  data) but carry no command wiring — that is P6.
- Open-source `@xyflow/react` only; the Pro template is a visual reference (18 §3, 02 D2).

## Blocked by

P1 (panel shell, tokens, RTL baseline), P2 (panel DTOs and the `MachineGateway` interface),
P3 (deterministic mock scenarios and `MockMachineGateway`). Do not start against unfrozen P2
DTO shapes.

## Acceptance criteria

- [ ] `TEMPLATE_READ` renders a mocked definition with Machines 01–05 as group/stage nodes,
      human gates as separate nodes, dependency edges and loop-back edges; no edit or publish
      affordance exists anywhere in the mode (18 §8, 02 D3) — component seam.
- [ ] `RUN_EXECUTION` renders every ADR-0012 stage state — including PAUSED, SKIPPED,
      CANCELLED, SUPERSEDED — and the run-level enum chip, each with non-colour-alone
      encoding (02 D11) — component seam (adapter unit tests enumerate every state).
- [ ] Blocked presentations derive from `WAITING_FOR_INPUT`/`WAITING_FOR_APPROVAL` plus
      reason codes (`PROVIDER_CONFIGURATION_REQUIRED` included) exactly per ADR-0012 D4; no
      invented state name appears in DTOs, code, or UI copy — component seam + Seam A.
- [ ] Scenarios 3–11 of (18 §7.2) each render a deterministic, distinct graph from fixtures;
      scenario 6 shows the gate in its rejected/changes-requested presentation with the
      loop-back edge visually routed — scenario seam.
- [ ] Inspector shows attempts with preserved history, timestamps, artifacts, validation
      results and safe diagnostics from P2 DTOs; artifacts never become default path nodes
      (02 D7); no raw provider payloads — component seam.
- [ ] ELK lays the graph out top-to-bottom through the layout adapter; layout data never
      changes workflow meaning (02 D9); page chrome is RTL with LTR-isolated IDs (02 D6) —
      component seam.
- [ ] Canvas adapter: React Flow node/edge objects are created only inside
      `packages/workflow-ui`; no `@xyflow/react` import exists outside it; adapter input
      types are exactly the P2 DTOs — Seam F (ESLint boundary) + Seam A (fixture validation).
- [ ] Graph model contains no executable code, prompts, or secrets; the DTO schemas offer no
      field for them (18 §8) — Seam A.
- [ ] Nodes and edges are keyboard-focusable with Persian aria labels; Enter/Space selects,
      Escape clears; the structured-list alternative shows equivalent state (08 §15) —
      component seam (full WCAG sweep lands in P7).
- [ ] Reduced motion removes animated edges; only the active RUNNING transition animates
      (08 §6) — component seam.
- [ ] Only open-source `@xyflow/react` is depended on; no Pro package or vendored Pro source
      (02 D2, 18 §3) — Seam F (dependency check).
- [ ] Empty, loading, error, permission-denied, and machine-unavailable states render for
      both graph routes (18 §4.1) — component seam.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; placeholder-purity and
      workspace-integrity checks green — Seam F.
