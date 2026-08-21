```yaml
ticket_id: "P7"
title: "Test hardening: full component, adapter-contract, scenario, accessibility, visual, and FA/RTL e2e coverage for the panel"
release: "P"
owner_lane: "quality"
source_requirements:
  - "18 §11 step 7 (component, visual, accessibility, scenario, and adapter contract tests); 18 §12 acceptance criteria as the coverage target; 18 §7.2 all fourteen scenarios"
  - "docs/testing-strategy.md scope note (ADR-0017): active seams are Seam A, the adapter-contract seam, the component seam, the scenario seam, Seam E, and Seam F; Seams B/C/D sleep with the machine build"
  - "Surviving method from doc 14: §7 component testing, §8 RTL/Persian automated checks, §11 accessibility acceptance, §13 visual regression set"
adr_constraints:
  - "ADR-0017 D3: placeholder-purity, workspace-integrity, and ESLint boundary checks are part of the green bar (Seam F); the frozen machine-side placeholders must be provably unchanged"
  - "ADR-0017 D4: the adapter-contract suite is written adapter-agnostic — MockMachineGateway passes it now, RealMachineGateway must pass it unchanged later; tests assert the ADR-0012 state vocabulary and ADR-0014 event names verbatim, never local aliases"
  - "ADR 0010 (doc 02) D11: WCAG 2.2 AA on core journeys, colour never the sole indicator, non-canvas equivalents for canvas actions"
  - "ADR-0012 / ADR-0013 / ADR-0014: tests pin the presented vocabularies — any test that needs a state, decision, or event name not in these ADRs is a defect finding, not a new name"
in_scope:
  - "Component tests (Vitest + testing-library) for every routed surface and shared component from P1/P4/P5/P6, covering default plus empty, loading, error, permission-denied, and degraded states"
  - "Adapter-contract suite completed and green for MockMachineGateway: every MachineGateway method covered for determinism, schema-valid outputs, ADR-0012-conformant command transitions, audit append, and approval distinctness presentation"
  - "All fourteen 18 §7.2 scenarios reproducible via named automated tests (scenario seam complete — P5/P6 covered subsets; this ticket closes 1, 2, 12 and any remainder)"
  - "Accessibility: keyboard-only navigation of core journeys, reduced-motion honoured, axe WCAG 2.2 AA on core journeys, focus management on dialogs/sheets/inspector"
  - "Visual QA: deterministic renders of the key states per breakpoint (mobile/tablet/desktop) captured into the visual set (14 §13 method)"
  - "Playwright e2e on the FA/RTL critical journeys — the frozen pnpm test:e2e command, inert since ticket 0.1, gains its first real content here"
  - "Seam F sweep: placeholder-purity, workspace-integrity, ESLint boundary zones, dependency hygiene (no provider SDKs, no @xyflow/react outside workflow-ui, no fixture imports in components)"
  - "Small defect fixes surfaced by new tests, when they change no contract; contract-affecting findings are recorded for P8's open-decisions list"
out_of_scope:
  - "Seams B, C, D — they sleep until the machine build connects (testing-strategy scope note); pnpm test:db stays intentionally inert (no database in panel scope, ADR-0017 D5)"
  - "New features or surfaces; performance/load testing beyond the 08 §14 canvas sanity checks"
  - "Weakening any existing test to reach green (14 §1)"
contracts_changed:
  - "None. Tests pin existing P2 shapes; needed shape changes are P8 open decisions"
database_changes: "None — panel scope has no database (ADR-0017 D5)"
permission_requirements:
  - "Role-dependent rendering and command rejection covered per mocked role, including scenario 14; tests prove enforcement lives in panel services, not hidden buttons (18 §4.2)"
failure_states:
  - "Every degraded/failure presentation shipped in P1–P6 (timeout, disconnect, stale, rollback, permission-denied, machine-unavailable) has at least one automated test that reproduces it deterministically"
test_seams:
  - "All six active seams, by name: Seam A (panel DTO contract fixtures), adapter-contract seam (MockMachineGateway conformance), component seam (every surface), scenario seam (all fourteen 18 §7.2 scenarios), Seam E (Playwright FA/RTL journeys), Seam F (repo/infra checks including placeholder purity)"
acceptance_criteria:
  - "See checkbox list in the body; each maps to a named seam"
dependencies: ["P6"]
files_owned:
  - "Test files across apps/web and packages/{ui,workflow-ui,panel-domain,machine-gateway,mock-data}"
  - "Playwright e2e specs and configuration; visual-set captures and configuration"
  - "Production files only for defect fixes surfaced by tests (no behavioural rewrites)"
handoff_required: true
```

# Ticket P7 — Test hardening

## What to build

The proof layer for the whole P-series. Tracer-bullet: one command tour —
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` — demonstrates the
panel meets (18 §12) without a live machine system: every surface component-tested in all its
states, the `MockMachineGateway` passing the full adapter-agnostic conformance suite, all
fourteen (18 §7.2) scenarios reproducible by named tests, accessibility and visual QA green,
and real Playwright journeys running in Persian RTL.

**Demoable when done:** the green run above, plus opening the scenario test index and running
any single scenario test by name (e.g. scenario 6, approval rejected with loop-back) to watch
it reproduce the state end-to-end.

Notable facts this ticket makes true:

- **`pnpm test:e2e` stops being ceremony.** The command has existed, frozen and inert, since
  ticket 0.1 established the canonical check set. It gains its first real content here:
  Playwright journeys over the FA/RTL panel. `pnpm test:db` remains intentionally inert —
  panel scope has no database (ADR-0017 D5) — and the handoff notes it stays reserved for the
  machine build.
- **The adapter-contract suite becomes the integration bar.** It is written against the
  `MachineGateway` interface, not the mock: P8 documents it as the conformance suite a future
  `RealMachineGateway` must pass unchanged (ADR-0017 D4).
- **The scenario seam closes.** P5 covered scenarios 3–11 visually; P6 covered command and
  degraded paths (9, 10, 13, 14). This ticket adds 1 (no Programs yet), 2 (draft Program, no
  run), 12 (Weekly Lens derived from an approved Program/Concept Bible), and asserts a
  complete one-test-per-scenario index for all fourteen.

## Blocked by

P6. All build tickets (P1–P6) must be complete; this ticket hardens, it does not build.

## Acceptance criteria

- [ ] Every routed surface and every shared component from P1/P4/P5/P6 has component tests
      covering default, empty, loading, error, permission-denied, and degraded states —
      component seam.
- [ ] Adapter-contract suite covers every `MachineGateway` method (18 §6) for determinism,
      schema-valid outputs, ADR-0012-conformant transitions, audit append, and ADR-0013
      approval-distinctness presentation; it imports only the interface and P2 DTOs, never
      mock internals, and runs green against `MockMachineGateway` — adapter-contract seam.
- [ ] Each of the fourteen (18 §7.2) scenarios has a named automated test that loads the
      scenario and asserts its defining outcome; a scenario index test fails if any of the
      fourteen lacks a test — scenario seam.
- [ ] Panel DTO fixture suite validates all mock fixtures against the P2 Zod schemas,
      including every ADR-0012 state name and ADR-0014 event name that appears in fixtures —
      Seam A.
- [ ] Keyboard-only completion of the core journeys; reduced motion honoured everywhere
      (only the active RUNNING transition animates, 08 §6); axe reports zero WCAG 2.2 AA
      violations on core journeys (02 D11) — component seam + Seam E.
- [ ] Visual set: deterministic captures of the key states per breakpoint (mobile, tablet,
      desktop), seeded data only, no uncontrolled randomness (18 §7) — component seam.
- [ ] Playwright e2e passes on the FA/RTL critical journeys — entry → overview → run
      inspection (graph + inspector) → approval decision via the single path → audit
      visibility — asserting `lang="fa-IR"`, `dir="rtl"`, bidi-safe LTR identifiers, and
      Persian labels — Seam E.
- [ ] Placeholder-purity check proves the frozen machine-side 0.1 placeholders are unchanged;
      workspace-integrity, ESLint boundary zones, and dependency hygiene (no provider SDKs,
      no fixture imports in components, no @xyflow/react outside workflow-ui) all green —
      Seam F.
- [ ] Every UI-facing (18 §12) acceptance item is mapped to at least one automated test in a
      traceability table included in the handoff — Seam F.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` green;
      `pnpm test:db` documented as intentionally inert for panel scope — Seam F.
