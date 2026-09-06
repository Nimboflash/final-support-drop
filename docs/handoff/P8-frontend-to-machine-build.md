# P8 — Frontend handoff to the machine build

**Ticket:** P8 (final panel ticket; ADR-0019 D20)
**Status:** delivered
**Hard stop:** machine work does not begin here and does not begin automatically. This document
is where the panel scope ends.

---

## 1. What was built

The DROP Studio OS support panel, frontend-only, on deterministic mocks. Six destinations, seven
project tabs, the full start → concepts → content → package → calendar journey, a React Flow
execution graph, functional review commands and a real downloadable ZIP.

| Ticket | Delivered |
|---|---|
| ADR-0019 | The V2 pack seated in the authority order; twenty decisions reconciling it against ADRs 0011–0018 |
| P1-R | Six destinations, seven project tabs, the four approved DROP colors dark-first |
| P2 | Panel product entities, the projection layer, `PanelCommandGateway` / `RevisionGateway` / review facade |
| P3 | 24 scenarios, the shared demo repository, browser persistence, the ZIP writer, four mock adapters |
| P4 | Overview inbox, project list, concepts, content and research, outputs, calendar, review queue |
| P5 | The execution graph: eight product node classes, derived visual state, an accessible stage list |
| P6 | Review commands through one write path, conflicts, automatic assembly, the real download |
| P7 | A01–A20 acceptance journeys, Jalali and timezone edges, seven visual baselines |

### Verified check results

All six check commands pass on the delivered tree:

| Command | Result |
|---|---|
| `pnpm typecheck` | green |
| `pnpm lint` | green (`eslint`, `check-pinned`, `check-token-literals`) |
| `pnpm test` | green — **647 tests** across 44 files |
| `pnpm test:db` | green (inert no-op; panel scope has no database) |
| `pnpm test:e2e` | green — **76 Playwright tests**, axe WCAG 2.2 AA clean in both themes |
| `pnpm build` | green |

Browser runs were performed: the journey specs, the visual baselines and the ZIP download were
executed in Chromium, not asserted from unit tests alone (V2 04 §5 — "Do not claim E2E success
if no browser run occurred").

### Demo configuration

- Preview: `pnpm --filter @drop/web build && pnpm --filter @drop/web exec next start`
- Default demo state: the seeded **base world** (`BASE`), seven projects across every stage the
  brief names. The 24 scenarios are overlays selected from Settings.
- Demo epoch: `2026-09-06T09:00:00Z`, injected. `Date.now` and `Math.random` are unreachable from
  the demo packages, and a repo check proves it.

---

## 2. Open decisions for the machine team

Each is a question the panel could not answer alone. The panel's provisional answer is recorded
so the machine build has something concrete to disagree with, and each says what changes if it
rules otherwise.

### 2.1 Run-stage to product-stage mapping

**Panel's answer:** `RUN_STATUS_TO_PRODUCT_STAGE` in `packages/panel-domain/src/projection/product-stage.ts`
maps only `DRAFT → DRAFT` and leaves six statuses `null`.

**Why null:** a run status describes EXECUTION and says nothing about which product phase a work
item is in. A `DRAFT` run can belong to a project already at `CALENDAR`; a `FAILED` run does not
move the work item backwards. Filling these in would be the "newly inferred mapping" V2 01 §5
forbids.

**Open questions**, enumerated in `PRODUCT_STAGE_OPEN_QUESTIONS`:
`QUEUED`/`RUNNING`, `WAITING_INPUT`, `WAITING_APPROVAL`, `PAUSED`, `SUCCEEDED`,
`FAILED`/`CANCELLED`.

**If the machine team rules otherwise:** change the table. Nothing else moves — the stage strip,
the project card and the graph all read through it.

### 2.2 Panel event taxonomy

**Panel's answer:** `PanelEvent` is a separate DTO from `AuditEvent`. `AUDIT_EVENT_NAMES` stays
closed at its recorded 35 (ADR-0014 D1), and `PANEL_EVENT_AUDIT_MAPPING` maps two panel events
onto `approval.decided` and leaves nine `null`.

**Why:** the V2 event carries an open `type` and an arbitrary `data` payload. Folding it into
`auditEventSchema` would either break the closed enum or smuggle an untyped payload into the
audit record. Panel events describe panel read-model movements; audit events record governed
decisions.

**Unresolved rows** (`UNMAPPED_PANEL_EVENT_TYPES`): `panel.concept.batch_generated`,
`panel.concept.revision_requested`, `panel.content.revision_requested`, `panel.project.created`,
`panel.project.concepts_selected`, `panel.package.assembled`, `panel.calendar.entry_created`,
`panel.calendar.entry_rescheduled`, `panel.output_plan.amended`.

**If the machine team wants any of these audited:** it is an ADR-0014 amendment, not a panel
change.

### 2.3 Subscription transport

**Panel's answer:** mock subscriptions via `PanelCommandGateway.subscribe`, with `eventId`
dedupe and older-`aggregateRevision` suppression already implemented in the repository.

**Deferred:** polling versus SSE, backpressure, replay from a cursor. The panel's contract is
"a listener receives events and unsubscribe stops delivery"; how they arrive is the machine
team's choice.

### 2.4 Demo capability profiles

**Panel's answer:** `fa.editorial → FA_EDITORIAL`. The other five V2 capability strings —
`concept.review`, `content.review`, `comment.create`, `calendar.edit`, `read` — resolve to
`null` in `DEMO_CAPABILITY_PROFILES`.

**Why:** the closed 11 §4 capability list has no counterpart for them. They describe panel
affordances, not the governed capabilities the machine build enforces. V2 03 §5 explicitly warns
against resolving the recorded eight-roles-versus-seven conflict by picking a production count,
so the panel assigned demo ROLES (four actors onto four closed `ACTOR_ROLES` members) and left
the capability side open.

**Needed:** whether panel affordances warrant capabilities at all, or whether they are purely a
UI concern.

### 2.5 Targeted regeneration and cancellation

**Panel's answer:** `RevisionGateway.requestRevision`, deliberately separate from
`MachineGateway.retryStage`. A retry repeats a failed attempt with the same input; a revision
applies new feedback and creates a new version. V2 03 §2 forbids conflating them.

**Deferred:** cancellation of an in-flight revision, and whether `requestRevision` belongs on
`MachineGateway` once the machine team owns its endpoint.

### 2.6 Input upload and extraction

**Panel's answer:** nothing is uploaded, fetched or extracted. A `FILE` reference carries name,
size and MIME type; raw bytes never persist. URLs are validated as HTTP(S) and never requested.

**Needed:** where extraction happens, what it returns, and whether the panel ever sees document
text.

### 2.7 Immutable artifact access

**Panel's answer:** `exportPackage` returns `PackageExport { bytes, filename, mediaType }` and
the panel synthesizes the archive locally from the snapshot.

**Needed:** whether real artifacts are fetched by reference or streamed, and what authorizes the
fetch.

### 2.8 Live calendar persistence

**Panel's answer:** calendar entries live in the demo repository, idempotent per package family.
All-day values are ISO calendar dates; timed values are UTC instants plus a timezone.

**Needed:** who owns the calendar of record, and whether ICS export or an external calendar is
ever in scope.

### 2.9 Source coverage metadata

**Panel's answer:** `Source.status` is split back onto `lifecycle` + `networkReachable` +
`contentRetrievable` per 06 §5, and `region` maps to `COVERAGE_CLASSES`.

**Needed:** the real coverage contract — how "blocked" is distinguished from "unreachable", and
what a retrieval request actually does.

### 2.10 Review policy and eligible reviewers

**Panel's answer:** the panel PRESENTS policy; it never enforces it. Demo actors are mapped onto
closed roles for display, and every command is refused server-side in the mock when the scenario
says so.

**Needed:** real thresholds, self-approval rules and eligible-reviewer resolution. **Panel-side
checks are never a security boundary** (18 §4.2) and must not be mistaken for one.

---

## 3. Provisional contracts — never silently imposed

These are panel-side proposals (18 §9). The machine build is free to reject any of them; none was
agreed with it.

| Contract | Location | Status |
|---|---|---|
| `PanelGateway` | `packages/machine-gateway/src/panel-gateway.ts` | PROVISIONAL, read-only, seven members (ADR-0018 D1) |
| `PanelCommandGateway` | `.../panel-command-gateway.ts` | PROVISIONAL, new in ADR-0019 D3 |
| `RevisionGateway` | `.../revision-gateway.ts` | PROVISIONAL, held until the machine team agrees its endpoint |
| `ReviewApplicationService` | `.../review-application-service.ts` | Facade above the gateways; a member of none |
| `PanelEvent` | `packages/panel-domain/src/schemas/panel-event.ts` | PROVISIONAL transport DTO |
| `PRODUCT_STAGES` | `packages/panel-domain/src/vocabulary/product.ts` | PROVISIONAL, orthogonal to the ADR-0012 axes |
| Demo profile table | `packages/mock-data/src/seed/demo-profiles.ts` | Demo identities, not a taxonomy |
| `(workflowDefinitionVersionId, nodeKey)` join | `packages/panel-domain/src/schemas/panel-product.ts` | Authored here; the V2 contracts supply no join key |

**`MachineGateway` is byte-frozen** and was not touched.
`tests/repo/verbatim-machine-gateway.test.ts` compares the exported declaration against doc 18 §6
character-for-character on every run.

---

## 4. Connection points for a RealMachineGateway

These are **unimplemented seams, not stubs returning fake production success.**

1. `packages/machine-gateway/src/mock/mock-world.ts` is the only module that constructs the four
   adapters. A real implementation replaces `createMockWorld` and nothing above it changes.
2. `apps/web/lib/demo/session.ts` is the composition root — the single place adapters are
   injected. It is the one file a real build must edit to switch.
3. Every adapter must pass the exported conformance suites unmodified:
   `createGatewayConformanceSuite` (17 cases) and `createReviewPathConformanceSuite` (6 cases,
   including the severed-`submitApproval` proof).

**How "replacing the mock requires no page-level redesign" is verified:** surfaces depend on
gateway INTERFACES and the derived read models, never on `@drop/mock-data`. An ESLint zone
enforces that at real source paths — `tests/repo/eslint-zone-terminality.test.ts` writes a
throwaway file inside `apps/web/app`, `apps/web/components`, `packages/ui` and
`packages/workflow-ui` and lints it there, because a fixture under `tests/repo/` can never
observe the terminal configuration a real source file receives.

---

## 5. What was deliberately NOT built

No backend transport, token management, webhook receiver, queue, production schema migration or
provider configuration. No machine logic, prompts, AI calls, workers, databases, research or
publishing. `apps/worker` and the eleven machine-oriented packages remain inert 0.1 placeholders,
proven every run by `tests/repo/placeholder-purity.test.ts`.

Machines 01–05 were never renumbered and no Machine 06 was introduced. The panel's five product
stages are not the five machines, and a test asserts no graph node class is named for or keyed by
one.

---

## 6. Known limitations and standing risks

### 6.1 There is no CI — the highest standing risk

The repository has no `.github/` and no pipeline. **Every guard in this repo is advisory unless a
human runs it.** The frozen-package check, the verbatim-interface check, the boundary zones, the
determinism scan and 647 tests all pass today because they were run by hand; nothing prevents the
next change from landing red.

Adding CI was out of scope for the V2 pack. It is the single highest-value next step.

### 6.2 Zustand was specified but is not used

Ticket P4 named `zustand` for transient selection state. In practice React local state and URL
query parameters covered every case — filters, tabs and sheet identity all live in the URL, which
makes them linkable and reload-safe, and selection is component-local. The dependency was removed
rather than left installed and unused. If a future surface needs cross-component transient state,
add it back with an exact pin.

### 6.3 The graph has no committed pixel baseline

Seven surfaces have visual baselines; the workflow graph does not. ELK lays out asynchronously
and React Flow fits the viewport on mount, so a pixel baseline would be timing-sensitive. The
graph is asserted to render its derived nodes instead. A flaky baseline would be worse than none.

### 6.4 Definition-inspection mode has no definition to inspect

The V2 seed carries no workflow definition, so definition mode explains that state rather than
rendering a template. When the machine build supplies published definitions, that mode has
content and `machineNumber` starts resolving in the inspector.

### 6.5 Drag-to-reschedule is not implemented

The calendar offers a keyboard-accessible date edit, and journey A20 is walkable by keyboard
alone. The drag affordance with undo (V2 01 §7) is not built; the keyboard route is the
accessible one and was prioritised.

### 6.6 React Flow Pro was not used

`@xyflow/react` 12.11.6, the open-source build, with DROP-owned node components. The Pro
template's AI execution layer was never imported, and no Pro source is present. The open client
gate on a Pro licence is untouched.

---

## 7. Governance state at handoff

- **ADR-0019** records the V2 adoption and amends ADR-0018 D1 in part. ADR-0010 D10 is NOT
  amended: `--drop-lens-accent` survives as the single brand accent, per the owner's ruling.
- **Doc 15 §12's visual-identity gate is partially closed**: the four approved colors are
  recorded; typography, iconography and imagery direction remain open.
- **Doc 18 §7.2's fourteen scenarios are unedited.** S01–S14 are those fourteen, 1:1 and in
  order, asserted against a committed transcription. S15–S24 are additive per ADR-0019 D15.
- **No older proposed ADR was ratified** by this work, and Ticket 0.1 was not repeated.

---

## 8. Stop

This is the end of panel scope. The machine build is a separate delivery and does not begin
automatically (ADR-0019 D20). Anything in §2 needs a named decision before implementation, not an
improvisation.
