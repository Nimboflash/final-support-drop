# Ticket P1 — Panel shell and FA-first RTL baseline

```yaml
ticket_id: "P1"
title: "Panel shell and FA-first RTL baseline: owned shadcn/ui, tokens, fonts, /studio shell and state primitives"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "18 §11.1 — sequence step 1: establish the panel shell, design tokens, shadcn/ui, RTL, routing and accessibility baseline"
  - "18 §3 — shadcn/ui as the panel/application-shell/design-system foundation; Persian-first RTL operation retaining English technical identifiers"
  - "18 §4.1 — application shell, navigation, responsive layout and RTL behavior; loading, empty, error, offline, permission-denied and degraded-mode states; accessibility, keyboard navigation, responsive behavior and visual QA"
  - "Ticket 0.12 (substance inherited per ADR-0017 D2, supersession 0.12 → P1): 09 §1 shadcn as owned code, DirectionProvider, html lang=fa-IR dir=rtl, logical properties only; 09 §3 primitive/semantic/component token layers, PROVISIONAL values, single theme file; 09 §4 dark-neutral anchor plus accessible light theme, single Lens accent; 09 §5 bundled Vazirmatn, no remote fonts, Latin mono in dir=ltr isolation; 09 §7 component set; 09 §8–§9 domain components and central Persian label mapping; 09 §10, §12, §13, §14 motion restraint, table/ID rules, WCAG 2.2 AA, visual QA breakpoints"
  - "04 §2 — /studio global navigation and route table (shell and route scaffolds only in this ticket; surfaces are P4 and the workflow-surface ticket)"
  - "05 §2 — Tailwind logical utilities; date-fns-jalali; apps/web/public/fonts"
  - "00 §4 — FA-first RTL from the first component; no remote font/CDN dependency"
adr_constraints:
  - "ADR-0017 D1/D2 — doc 18 governs scope; this ticket carries 0.12's surviving substance forward and reopens nothing in the committed ticket 0.1"
  - "ADR-0017 D3 — packages/ui is a panel package per (18 §10) and is activated here; the machine-side placeholder packages gain no content"
  - "ADR-0017 D5 — no PostgreSQL, Redis, queues, workers or provider calls; nothing in this ticket makes a network request beyond the app's own origin"
  - "ADR-0012 (presentation vocabulary per ADR-0017 D4) — StageStatusBadge renders exactly the 14 stage states (DRAFT, READY, QUEUED, RUNNING, WAITING_FOR_DEPENDENCY, WAITING_FOR_INPUT, WAITING_FOR_APPROVAL, PAUSED, FAILED_RETRYABLE, FAILED_FINAL, SUCCEEDED, SKIPPED, CANCELLED, SUPERSEDED) and RunStatusBadge exactly the 9 run states (DRAFT, QUEUED, RUNNING, WAITING_INPUT, WAITING_APPROVAL, PAUSED, SUCCEEDED, FAILED, CANCELLED); exact names, no parallel vocabulary"
  - "ADR-0015 — program/lens/request status labels resolve through one central Persian enum-to-label mapping (09 §9); no component-local status vocabularies"
  - "ADR 0010 D1, D6, D10, D11 — component ownership, RTL/logical CSS/LTR spans, tokens as CSS variables with one Lens accent, accessibility"
in_scope:
  - "packages/ui: shadcn/ui copied in as owned code (09 §7 set) and adapted to DROP tokens and RTL rules; DirectionProvider; three-layer PROVISIONAL token system in one theme file with a single Lens accent token"
  - "apps/web root wiring: html lang=fa-IR dir=rtl, DirectionProvider, local Vazirmatn loading from apps/web/public/fonts (no remote fonts)"
  - "Tailwind logical-property configuration plus the lint rule banning physical direction utilities in packages/ui, with the documented-physical-reason inline escape hatch (09 §1)"
  - "Bidi and locale primitives: BidiIdentifier (LTR-isolated IDs/code with copy action), PersianDateTime over date-fns-jalali (UTC stored, Jalali Tehran display, raw value exposed for sorting)"
  - "Status/domain components rendering the presentation vocabulary: StageStatusBadge, RunStatusBadge, ProgramStatusBadge, ApprovalBadge, ActorRoleChip, BlockerCallout — icon plus text, central Persian labels, safe fallback for unknown values"
  - "State primitives for every (18 §4.1) degraded state: LoadingState, EmptyState, ErrorState, OfflineState, PermissionDeniedState, DegradedModeBanner — reused verbatim by P4 and later surfaces"
  - "/studio application shell: responsive RTL layout, right-side Persian navigation with the (04 §2) entries, route scaffolds resolving to the standard empty-state primitive until P4/P5 fill them"
  - "Accessibility baseline (ADR 0010 D11): keyboard navigation, visible focus in both themes, prefers-reduced-motion, WCAG 2.2 AA checks; non-production component gallery route as the visual-QA and snapshot target"
out_of_scope:
  - "Panel DTOs and the MachineGateway seam (P2, running in parallel); mock fixtures and scenarios (P3); dashboard surfaces and permission-aware nav wiring over mock roles (P4)"
  - "Workflow canvas components — packages/workflow-ui stays untouched until the workflow-surface ticket (18 §11 step 5)"
  - "Auth screens (deferred with ticket 0.5 per ADR-0017 D2); session/authentication scaffolding is added only if a later panel ticket demonstrates the need (18 §4.2)"
  - "Final brand color/type values (client gate, 15 §12 — tokens stay PROVISIONAL); Persian copywriting sign-off (FA_EDITORIAL is a human gate)"
contracts_changed: "None. This ticket exports a component API, not contracts; panel DTOs are P2's freeze."
database_changes: "None — panel scope has no database (ADR-0017 D5)."
permission_requirements: >
  None. The gallery is a non-production route (dev-only). Components never encode authority;
  permission-aware hiding/disabling arrives in P4 over mock role data and is never a security
  boundary (04 §2, 11 §1).
failure_states:
  - "Missing translation key renders a visible key marker plus diagnostic, never silent English fallback (09 §9)"
  - "Missing/failed font falls back to the declared local stack; no network fetch attempt (09 §5; 00 §4)"
  - "Unknown status enum value renders a safe neutral badge with diagnostic, never a crash (09 §9)"
  - "Navigation to a not-yet-built surface renders the standard EmptyState primitive, never a 404 or crash"
  - "prefers-reduced-motion removes nonessential transitions (09 §10)"
test_seams:
  - "Component seam: Vitest + Testing Library in packages/ui and apps/web — direction, tokens, bidi, Jalali dates, enum-exhaustive badges, state primitives"
  - "Seam E: Playwright in tests/e2e/rtl on the gallery and /studio shell — root attrs, no-external-request check, visual snapshots at the 09 §14 breakpoints, axe WCAG 2.2 AA in both themes"
  - "Seam F: logical-properties lint rule self-test; token-literal static scan; pnpm typecheck/lint/test/test:e2e/build (test:db stays a no-op passthrough — no database in panel scope)"
acceptance_criteria: "AC-P1.1 through AC-P1.12 — see checkbox list in the body"
dependencies: ["0.1"]
files_owned:
  - "packages/ui/** (panel-activated per ADR-0017 D3 / 18 §10)"
  - "apps/web/app/layout.tsx (lang/dir/DirectionProvider/font wiring only)"
  - "apps/web/app/studio/** (shell, navigation and route scaffolds only; P4 owns the surfaces beneath)"
  - "apps/web/app/dev/gallery/** (non-production component gallery)"
  - "apps/web/public/fonts/**"
  - "eslint.config.mjs — logical-properties rule addition only (P2 appends separate boundary zones; append-only blocks, sequence merges if lanes land together)"
  - "tests/e2e/rtl/**"
handoff_required: true
```

## What to build

The Persian-first, RTL-first foundation every panel surface is built from — ticket 0.12's
substance carried into panel scope (ADR-0017 D2) plus the /studio shell that (18 §11.1) moves
into step 1. Nothing here talks to a gateway, a mock, or a backend: this ticket is pure
presentation foundation. (Sequential execution per ADR-0018 D2: P2 starts after this ticket.)

The tracer-bullet vertical slice: open `/studio` and the component gallery in Persian under
`<html lang="fa-IR" dir="rtl">`, in both dark and light themes, at all three 09 §14
breakpoints. The shell shows the right-side Persian navigation with the (04 §2) entries; each
route scaffold resolves and renders the standard EmptyState primitive. The gallery renders the
full owned shadcn set, the status badges over the complete ADR-0012 vocabularies, every
(18 §4.1) state primitive, long Persian titles, mixed Persian/English strings, and LTR-isolated
identifiers — and loading it makes zero network requests beyond the app's own origin. That
gallery is the demo, the visual-regression baseline and the accessibility target at once.

Key mechanics (inherited from 0.12, adjusted for panel scope):

1. **Direction and ownership** (09 §1; ADR 0010 D1/D6). Copy the 09 §7 set into `packages/ui`
   as owned code, review RTL output per component, wire DirectionProvider and root `lang`/`dir`.
   Logical CSS properties everywhere; the lint rule makes physical direction utilities a build
   failure in `packages/ui`, with the documented-physical-reason inline escape hatch.
2. **Tokens** (09 §3; ADR 0010 D10). Three layers as CSS variables in one theme file, every
   value tagged PROVISIONAL (visual-identity client gate still open); exactly one Lens accent
   token; no color literal in any component file.
3. **Typography** (09 §5). Vazirmatn bundled under `apps/web/public/fonts`, loaded locally;
   Latin IDs and code inside `dir="ltr"` isolation via BidiIdentifier.
4. **Presentation-vocabulary components** (ADR-0017 D4). StageStatusBadge and RunStatusBadge
   render the exact ADR-0012 state names — these are the states P3's mocks emit and P4's
   surfaces display; PersianDateTime, ApprovalBadge, ActorRoleChip, BlockerCallout complete
   the domain set with central Persian labels (09 §9; ADR-0015 enums included in the mapping).
5. **State primitives** (18 §4.1). One canonical component per degraded state — loading,
   empty, error, offline, permission-denied, degraded-mode — so P4 wires states, never
   reinvents them.
6. **Shell** (04 §2; 18 §4.1). Responsive RTL /studio layout with keyboard-operable Persian
   navigation; scaffolds only — no data, no gateway dependency.

## Blocked by

None — 0.1 is done and committed. P2 starts only after this ticket completes (ADR-0018 D2).
P4 needs this ticket's published component API; freeze exported names before handoff.

## Acceptance criteria

- [ ] **AC-P1.1 Root direction** (09 §1): the rendered document has `lang="fa-IR"` and
  `dir="rtl"` with DirectionProvider configured — component test plus Playwright on shell and
  gallery. *Seam: component seam + Seam E.*
- [ ] **AC-P1.2 Owned shadcn set** (09 §7; ADR 0010 D1): every component exists as source in
  `packages/ui`, importable from the public API, rendering correctly in RTL; no runtime
  dependency on an external shadcn distribution. *Seam: component seam.*
- [ ] **AC-P1.3 Logical properties enforced** (09 §1): the lint rule fails a committed fixture
  using a physical direction utility and passes the real tree; escape-hatch disables carry a
  reason string. *Seam: Seam F.*
- [ ] **AC-P1.4 Token discipline** (09 §3; ADR 0010 D10): one theme file, three layers, all
  PROVISIONAL-tagged, exactly one Lens accent token; static scan proves no color literal
  outside the theme file. *Seam: Seam F.*
- [ ] **AC-P1.5 Local fonts only** (09 §5; 00 §4): Vazirmatn ships in
  `apps/web/public/fonts`; Playwright records all requests on gallery and shell load and
  asserts none leave the app origin. *Seam: Seam E.*
- [ ] **AC-P1.6 Bidi isolation** (09 §5, §12): BidiIdentifier renders IDs/URLs/code in an
  isolated `dir="ltr"` span with copy action; mixed Persian/Latin fixtures render without
  punctuation or digit reordering. *Seam: component seam.*
- [ ] **AC-P1.7 Jalali dates** (09 §12; 05 §2): PersianDateTime renders fixture UTC instants as
  expected Jalali Tehran strings and exposes the raw UTC value for sorting. *Seam: component
  seam.*
- [ ] **AC-P1.8 Enum-exhaustive status components** (ADR-0012; ADR-0015; ADR-0017 D4): a
  table-driven test renders all 14 stage states, all 9 run states and the ADR-0015 status
  enums through the badges; each yields icon plus central Persian label; an unknown value
  yields the safe fallback with diagnostic. *Seam: component seam.*
- [ ] **AC-P1.9 /studio shell** (04 §2; 18 §4.1): the shell renders the Persian navigation
  entries in RTL, keyboard-operable; every route scaffold resolves to the EmptyState
  primitive; layout holds at 1440x1000, 1024x768 and 390x844. *Seam: Seam E.*
- [ ] **AC-P1.10 State primitives** (18 §4.1): loading, empty, error, offline,
  permission-denied and degraded-mode primitives each render from the package API with
  Persian text and are snapshot-covered in the gallery. *Seam: component seam + Seam E.*
- [ ] **AC-P1.11 Two accessible themes, motion restraint** (09 §4, §10, §13): dark and light
  both pass contrast checks and axe WCAG 2.2 AA on gallery and shell; reduced motion removes
  nonessential transitions; committed visual snapshots at the three breakpoints are the
  approved baselines. *Seam: Seam E.*
- [ ] **AC-P1.12 Checks green** (16 §7): `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm test:e2e && pnpm build` pass; `pnpm test:db` remains a green no-op. *Seam: Seam F.*
