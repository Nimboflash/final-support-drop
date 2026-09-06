# ADR-0019 — Adoption of the V2 Panel Frontend Scope, and the Panel Write-Surface Amendment to ADR-0018 D1

**Status:** Accepted (owner-delivered pack 2026-09-06; owner rulings on D3, D13 and D14 recorded 2026-09-06)
**Date:** 2026-09-06
**Scope:** the panel frontend build — authority order, ticket P-series scope, navigation, contracts, mocks and brand tokens

## Context

The owner delivered `DROP_PANEL_FRONTEND_V2_EN`, imported verbatim to `docs/frontend-v2/`:
six specification documents, `mock/` (seed, 24 scenario recipes, a panel contract scaffold,
supporting fixtures, a reference package export) and `reference/18_...md`.

That reference copy is **byte-identical** to `docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`.
The pack therefore preserves the recorded scope document rather than restating it, and narrows
it in one direction only: **no supporting backend is required or requested now**
(`docs/frontend-v2/00_START_HERE.md`).

The pack instructs that its changes be recorded "using the repository's existing next available
ADR number". `docs/adr/` holds ADR-0011 through ADR-0018; **0019 is that number**.

Two framing rules, stated by the pack itself and binding on this ADR:

- **No older proposed ADR is ratified here.** All eight repo ADRs are already Accepted;
  ADR-0011's ratification is the owner's, recorded at ADR-0018 D5. This ADR manufactures no
  ratification (`docs/frontend-v2/00_START_HERE.md`; `05_CLAUDE_BUILD_PROMPT.md`).
- **The repository is not reset and Ticket 0.1 is not repeated.** Completed compatible work is
  preserved (`docs/frontend-v2/04_MOCKS_AND_ACCEPTANCE.md` §3).

Three questions could not be settled from the documents alone and were put to the owner. Their
rulings are recorded inline at **D3**, **D13** and **D14**.

## Decision

### D1 — Precedence of the V2 pack

The V2 pack enters the ratified authority order immediately below Brand DNA v3.0 and
immediately above doc 18, **for scope only** — the same seat, and the same limitation, that
ADR-0017 D1 gave doc 18. Recorded decisions and ADRs continue to govern product language,
domain concepts, workflow states, RBAC/approval/audit semantics and future integration
contracts.

The resulting order: Brand DNA v3.0 → **V2 pack (scope)** → doc 18 → recorded decisions and
ADRs → ADR-0010 → implementation docs 00–17 → dated sources → Master Spec v1.0 → PDFs.

### D2 — The supporting backend is withdrawn

Doc 18 §4.2's permission for typed mock API routes, a local mock server, session scaffolding
and optional server persistence is **withdrawn**. The panel is frontend-only.

Demo state persists in exactly one versioned browser key `drop-panel-demo-v2`, validated on
hydration, offering Reset Demo on corrupt or incompatible data instead of crashing, and keeping
demo actor, scenario and controllable clock stable. Only metadata and short sample text are
stored — never secrets, raw uploaded file bytes or credentials. Two tabs either synchronize
revisions via storage events or show a refresh notice; silent last-write-wins is forbidden.

Every ADR-0017 D5 prohibition (no PostgreSQL, Redis, queues, workers or providers) is unchanged
and unaffected.

### D3 — Panel write surface *(owner ruling)*

ADR-0018 D1 established `PanelGateway` as a **read-only** contract, and that reading is
preserved: its seven members are unchanged and it gains no mutation.

The V2 pack's `PanelGateway` carries six mutations plus `exportPackage` and `subscribe`. Those
capabilities are adopted on a **new, separate `PanelCommandGateway`** — `createProject`,
`addComment`, `selectConcepts`, `amendOutputPlan`, `updateCalendar`, `updateCalendarPackage`,
`exportPackage`, `subscribe` — and targeted regeneration on a **new `RevisionGateway`**
(`requestRevision`). `MachineGateway` gains no members and is not touched.

This widens an owner condition, and the owner confirmed the split rather than a single
read-write `PanelGateway`. ADR-0018 D1 is **amended in part**: the read-only guarantee attaches
to `PanelGateway` specifically, not to the panel contract surface as a whole.

### D4 — The single approval write path is reaffirmed

ADR-0013 D1–D5 are unchanged. `ReviewApplicationService.reviewItem` is a facade **above** the
gateways: it is the sole constructor of `ApprovalCommand`, it delegates to
`MachineGateway.submitApproval`, and it is a member of no gateway interface.

`requestRevision` is never aliased to `retryStage`. A retry repeats a failed attempt with the
same input; a revision applies new feedback and creates a new version. Reject-and-revise records
the decision first and durably; a regeneration failure neither erases the rejection nor
duplicates it on retry.

The absence of a second decision path is **mechanically proven**, not asserted — see D19.

### D5 — Card review status is a projection, not a replacement

`APPROVAL_DECISIONS` and `APPROVAL_REQUEST_STATES` are untouched.

The V2 card vocabulary (`draft, in_review, revision_requested, approved, rejected`), together
with the separate `freshness: current | stale` axis, is adopted as an **additive product-level
presentation vocabulary** reached through a named projection adapter:
`revision_requested → CHANGES_REQUESTED`, `approved → APPROVED`, `rejected → REJECTED`.
`draft` and `in_review` are pre-`PENDING` item states, not decisions. `ESCALATED` has no V2
counterpart and receives an explicitly recorded panel rendering rather than being dropped.

This is what `docs/frontend-v2/01_PRODUCT_AND_WORKFLOW.md` §8 already requires: "Reuse existing
repo run enums through a projection adapter; do not replace its ADR state machine with this UI
vocabulary."

Approval reasons stay mandatory. A `null` `reasonFa` is rejected before transport and never
coerced to an empty string.

### D6 — Casing, language and demo profiles

Canonical stored codes remain UPPER_SNAKE stable English (`stableCodeSchema`). The V2
lowercase literals are the **mock-JSON wire form**, normalized by the loader at the boundary —
one systemic decision, not a rename of the recorded enums.

`*Fa` suffixes are permitted on new panel DTO fields carrying authored Persian **content**;
existing repo field names are not renamed and schema messages remain English.

The V2 fixture capability strings (`concept.review`, `content.review`, `fa.editorial`,
`comment.create`, `calendar.edit`, `read`) and role strings (`demo_concept_reviewer`,
`demo_fa_editorial`) are **demo profiles**, mapped onto the closed `CAPABILITIES` and
`ACTOR_ROLES` sets; neither closed set gains a member. This honours the pack's own instruction
not to resolve the recorded eight-roles-versus-seven conflict by picking a production count.

`Source.region` maps to `COVERAGE_CLASSES`. `Source.status` is split back onto `lifecycle`,
`networkReachable` and `contentRetrievable` per 06 §5 — the split is a recorded decision and is
not collapsed to suit the fixture shape.

### D7 — Calendar status maps; ADR-0015 D5 is not amended

`PLANNED | CONFIRMED | DONE | CANCELLED` stands. V2's `unscheduled` is represented as `PLANNED`
with `date === null`; `planned` is `PLANNED` with a date. A calendar item never reads
"published" because a date was chosen.

Calendar creation is idempotent per package family. Relinking a family to a new package version
is an explicit update, never a duplicate entry.

### D8 — New schema primitives

`common.ts` gains `calendarDateSchema` (`^\d{4}-\d{2}-\d{2}$`) for all-day dates. Timed events
remain `instantSchema` (UTC, trailing `Z`) plus a separate display-timezone field. Formatted
Persian/Jalali dates are never canonical values.

`schemaVersion` remains semver (`PANEL_SCHEMA_VERSION = "1.0.0"`). The pack's
`drop.panel.mock.v2` is carried as a separate non-semver `snapshotKind`, which is also the
storage-key discriminator alongside `drop-panel-demo-v2`.

### D9 — The event taxonomy is unchanged; `PanelEvent` is a distinct DTO

`AUDIT_EVENT_NAMES` stays closed at its recorded 35 (ADR-0014 D1) and `auditEventSchema` stays
`.strict()` with no `data` field.

`PanelEvent` (`eventId, schemaVersion, workspaceId, aggregateId, aggregateRevision,
correlationId, occurredAt, type, data`) is the panel's own subscription DTO. Panel event types
with no recorded audit counterpart are enumerated in a `null`-tolerant mapping table modelled on
the existing `DOC18_EVENT_FAMILY_MAPPING`, and are reported as a P8 coordination item. The
subscription transport is PROVISIONAL: mock subscriptions now, polling/SSE deferred to the
machine team's contract.

### D10 — Command envelope, receipt and error codes

`commandEnvelope` is exported as `commandEnvelopeSchema` and extended with `commandId`,
`workspaceId` and `actorId`. `actedAsRole` stays the closed `ACTOR_ROLES` enum — V2's untyped
`activeRole: string` is narrowed, not adopted. `expectedRowVersion` is canonical, with
`expectedRevision` as an adapter alias. `idempotencyKey` is derived from `commandId`.

`commandReceiptSchema` keeps `origin: MOCK | REAL`, `occurredAt` and `idempotencyKey`
**required** (18 §12) and gains the tri-state `status: ACCEPTED | SUCCEEDED | REJECTED` — the
pack's "Accepted is not completed" makes that distinction load-bearing — plus `correlationId`.

`GATEWAY_ERROR_REASONS` gains `REVISION_CONFLICT`, deliberately **excluded** from the retryable
default: a conflict is resolved by refresh-then-resubmit, never blind retry. Mapping from the
pack's codes: `FORBIDDEN → UNAUTHORIZED`, `UNAVAILABLE → MACHINE_SYSTEM_DISCONNECTED`,
`INVALID_INPUT → SCHEMA_VALIDATION_FAILED`, `BLOCKED → INVALID_STATE_TRANSITION`,
`CONFLICT → REVISION_CONFLICT`.

Row-level `isMock` and receipt-level `origin` both ship: they answer different questions —
"is this demo content" versus "did a mock adapter produce this receipt".

### D11 — Entity naming

The repo already owns `Project` as a container **above** programs (`PROJECT_STATUSES`,
`programSummarySchema.projectId`). The V2 `Project` is a different entity — the union of
Program and Weekly Lens with a product-stage axis — and is implemented as **`PanelProject`**, a
discriminated union on `type: program | weekly_lens` whose arms embed the existing `programSchema`
and `weeklyLensSchema` so every recorded refine keeps firing. The repo's container and its
status set are untouched.

The twice-duplicated inline subject object is extracted once as `subjectRefSchema`; V2's `Target`
is that schema with `kind` narrowed to `concept | content`. `Comment` is structurally incapable
of carrying a decision outcome.

### D12 — The product-stage axis

`PRODUCT_STAGES` (`draft, concepts, research_content, package, calendar`) is a new
**PROVISIONAL** vocabulary, orthogonal to `STAGE_STATUSES` and `RUN_STATUSES`. The
run-stage-to-product-stage mapping is a `null`-tolerant table and a named P8 open decision; the
panel does not renumber Machines 01–05 or claim an inferred mapping.

The five-segment stage strip (Concepts, Research/Content, Review, Package, Calendar) is a
**display grouping**. Its "Review" segment is derived from open review counts, not from a stored
`stage` member — the pack enumerates no `review` stage, and this reading resolves that internal
inconsistency on the record.

### D13 — Navigation and route shape *(contains an owner ruling)*

Doc 04 §2's eleven destinations are superseded by six: `/studio` نمای کلی, `/studio/projects`
پروژه‌ها, `/studio/reviews` بررسی‌ها, `/studio/outputs` خروجی‌ها, `/studio/calendar`
تقویم و برنامه, `/studio/settings` تنظیمات.

Doc 04 §3–§5's thirteen program sub-routes are superseded by seven always-visible project tabs:
`overview, concepts, content, outputs, plan, workflow, activity`. A not-yet-available stage shows
its prerequisites with a link to act — never a hidden tab or an unexplained disabled one.

Removed destinations **redirect; they are never deleted**. Deleting a route folder does not
produce a 404 — it falls through to the `[...rest]` catch-all and renders a bare empty state with
HTTP 200, which is a silent dead end. The catch-all is retained.

**Owner ruling:** `/studio/requests` redirects to **`/studio`**, whose "Needs your attention"
list is the work inbox that replaces a standalone requests queue.

Filter and sheet state lives in URL query parameters.

This ADR **explicitly authorizes reopening committed ticket P1** for the shell, tabs and tokens,
as ticket **P1-R**. Ticket 0.1 remains untouchable.

### D14 — Brand tokens *(owner ruling)*

The V2 pack specifies four approved colors — Charcoal `#121212`, Paper White `#F5F5F5`,
Aluminum `#B3B6B9`, Logo Charcoal `#1E1E1E` — forbids a warm sepia palette, and requires a
restrained dark editorial UI. Doc 15 §12 listed final visual values as an open client gate; this
pack closes that gate **in part**.

**Owner ruling:** the four approved values are adopted and the warm tint is removed, and
`--drop-lens-accent` (`#b23a26` light / `#d65b44` dark) is **retained as the single brand
accent** for selection, focus and active navigation. The pack forbids *competing* brand accents;
one accent is what ADR-0010 D10 already mandates, so both documents are satisfied and **ADR-0010
D10 is not amended**. Semantic warning and error colors remain separate accessible utility
tokens, never competing accents.

The default theme flips to dark, matching Charcoal's recorded role as the main workspace.

Three defects are repaired in the same change, independently of the palette:

1. `--accent` currently aliases the brand accent, which renders every loading skeleton rust.
   The neutral hover tint is split from the brand accent.
2. `--success`, `--warning`, `--node-surface`, `--table-header-bg` and `--badge-neutral-bg` are
   unreachable from Tailwind because `@theme inline` omits them; all five are mapped.
3. `progress.tsx`'s inline physical `translateX` does not flip under RTL and escapes the lint
   rule because it is an inline style. It is made direction-safe.

Status uses icon plus label throughout; color alone is never sufficient.

### D15 — Scenario and acceptance extension

Doc 18 §7.2's fourteen scenarios remain binding and untrimmable (ADR-0018 D4). S01–S14 are those
same fourteen, verified 1:1 and in order. S15–S24 are **additive**, which D4 permits; doc 18
§7.2 is not edited.

Doc 18 §12's acceptance criteria are extended by the pack's journeys A01–A20. Journeys with no
scenario supplying their fixture world must be bound explicitly — by authoring an additional
scenario or by binding to an existing world — and P3 does not ship with an unbound journey.

### D16 — Demo epoch and determinism

The single demo clock is **`2026-09-06T09:00:00Z`**. The existing P2 fixtures, anchored at
`2026-08-21T09:00:00Z`, are re-based to it: two clocks in one world make "sort by recent
activity" meaningless, and the correction is cheap now.

`Date.now` and `Math.random` remain unreachable from fixture and adapter code. Mock discovery
rotates through an **authored, finite table of predefined batches** selected by
`batches[seed mod batches.length]` — no PRNG. The seed is part of persisted demo state,
advancing it is an explicit user action, and Reset Demo reproduces the identical sequence.

Simulated latency, offline, forbidden, retryable and non-retryable failure and conflict are all
scenario-controlled, never random.

### D17 — Transport-free export

`exportPackage` returns a DOM-free type (`PackageExport { bytes, filename, mediaType }`);
`apps/web` constructs the `Blob`. `tsconfig.base.json`'s `lib` is **not** widened to include DOM
— the contract packages are documented transport-free and `Blob` is not in scope for them.

The exported archive contains real sample files plus a synthesized `manifest.json` — the package
snapshot with file bodies stripped — that matches the archive's actual contents. No dead download
buttons and no empty archives.

### D18 — The workflow graph

The surface renders **eight product node classes**: Input (blank or reference), Concept
generation, Concept review, per-approved-concept Research, per-item Content generation, per-item
Content review, Package and Calendar. Layout is top-to-bottom, grouped per concept, with
pan/zoom/fit, minimap, branch collapse and selection. Node drag adjusts local layout only —
never machine state or dependencies.

**Execution inspection is the default mode**; definition inspection is secondary; template
authoring stays deferred.

Revision loop edges are labeled "revision", scoped to their own generation step, and are
**rendered from version lineage in execution mode**. They are not definition loop-back edges and
carry no iteration cap; definition-mode loop-back edges keep their required `maxIterations`
unchanged. Conflating the two is the trap this decision exists to close.

The package join waits only on the output plan's required content. The calendar edge means plan
entry creation, never publication. Rejected and discarded branches end visibly.

Machine 01–05 identity appears **read-only in the inspector**, sourced from the definition's
optional machine number joined against `listMachines()`, absent when the definition supplies
none, and **never inferred from graph position**. Product stages do not renumber machines and
there is no Machine 06.

Visual state is derived from domain DTOs and never stored as independent truth in React Flow
nodes. An accessible equivalent stage list is mandatory: the graph is never the only way to act.
Graph review shortcuts call the same approval service as the inbox — **P5 renders them disabled
and P6 wires them**, preserving the recorded P5/P6 boundary.

### D19 — Conformance obligations

The existing `MachineGateway` conformance cases are extended by **appending only**; their names
are stable. Sibling suites are added for `PanelGateway`, `PanelCommandGateway`, `RevisionGateway`
and the review facade.

The load-bearing new invariants: exactly one `submitApproval` per `reviewItem`; **replacing
`submitApproval` with a rejecting stub leaves the decision list unchanged** — the only mechanical
proof of ADR-0013 D1 inside the panel; `revision_requested` arrives as `CHANGES_REQUESTED`; a
`null` reason is rejected; approval appends an observable audit event; the same `commandId` twice
yields the same receipt and no second effect; a stale `expectedRevision` throws
`REVISION_CONFLICT` and leaves state untouched; `requestRevision` creates a new version with
prior versions byte-identical; `subscribe`'s unsubscribe actually stops delivery, duplicate
`eventId` dedupes and an older `aggregateRevision` is ignored; exported bytes are non-empty and
match their manifest.

Each new invariant ships with a paired broken-stub break and its unbroken control, so the suite
is proven able to fail.

### D20 — Ticket partition

ADR-0018 D2 is unchanged: P-tickets run strictly one at a time. The frontier order is
**P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8**. P5's recorded dependency set is corrected to
include P4. P8 remains a hard stop: after the handoff, machine work never starts automatically.

## Reported conflicts

| Existing instruction | V2 ruling |
|---|---|
| Doc 18 §4.2 permits mock API routes and a local mock server | Withdrawn — frontend only, browser persistence (D2) |
| ADR-0018 D1 — the panel's second contract is read-only | Amended in part: `PanelGateway` stays read-only; writes land on a separate `PanelCommandGateway` (D3) |
| Doc 04 §2 — eleven studio destinations | Superseded by six; removed routes redirect (D13) |
| Doc 04 §3–§5 — thirteen program sub-routes | Superseded by seven project tabs (D13) |
| Doc 09 §3 provisional tokens; the warm light theme | Superseded by the four approved colors, dark-first; the single Lens accent survives (D14) |
| Doc 15 §12 — final visual values are an open client gate | Partially closed by the four approved values (D14) |
| P5 `dependencies: ["P1","P2","P3"]` | Corrected to include P4 (D20) |
| P5 — definition inspection listed first | Execution inspection is the default mode (D18) |
| Ticket P1 is complete and committed | Reopened as P1-R for shell, tabs and tokens (D13) |

## Consequences

- Ticket P1 reopens as **P1-R**; ten Playwright baseline snapshots regenerate, and the e2e
  navigation assertion moves from eleven destinations to six.
- `packages/ui` gains a `card` primitive and widened exports; `vocabulary-parity` and
  `logical-properties` guard tests are amended in the same commits that force them, each citing
  this ADR.
- Three npm dependencies enter the workspace: `@tanstack/react-query` and `zustand` in
  `apps/web`, `@xyflow/react` with its layout engine in `packages/workflow-ui`. No new workspace
  package is created; the sixteen-package membership stands.
- The frozen twelve workspaces stay inert. `apps/worker` and the eleven machine-oriented packages
  are untouched, as ADR-0018 D3 requires.
- What is **not** built remains not built: no backend transport, token management, webhook
  receiver, queue, schema migration or provider configuration. Only adapter interfaces, mappings
  and contract tests.
