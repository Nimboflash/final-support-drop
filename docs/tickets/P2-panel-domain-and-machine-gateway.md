# Ticket P2 — Preserve MachineGateway; panel/revision contracts, version-linked review and calendar/package DTOs

```yaml
ticket_id: "P2"
title: "packages/panel-domain and packages/machine-gateway: keep the verbatim MachineGateway and the read-only PanelGateway exactly as committed, and add the V2 delta — PanelProject/concept/content/package/calendar DTOs, the review projection adapter, the extended command envelope and receipt, and the new PanelCommandGateway and RevisionGateway beside them"
release: "P"
owner_lane: "platform"
source_requirements:
  - "V2 04 §3 — P2's updated scope, verbatim: «Preserve MachineGateway; panel/revision contracts, version-linked review and calendar/package DTOs»"
  - "V2 04 §1 — mock/panel-contracts.ts is «a contract scaffold, not a production SDK»: integrate it with existing types and derive matching Zod validation at the boundary; the doc 18 entities stay mandatory and are extended, never replaced"
  - "V2 03 §1 — services call PanelGateway for panel resources and MachineGateway for machine-shaped operations; reuse existing repo DTOs and policy types rather than shadowing them; retain the doc 18 MachineGateway verbatim"
  - "V2 03 §2 — the missing panel capabilities; `reviewItem(command)` resolves the item's approval request and exact version, then delegates to MachineGateway.submitApproval; targeted generation gets a separate additive RevisionGateway; «do not abuse retryStage to mean changing content»"
  - "V2 03 §3 — entity relationships: project → concept batch → concepts → immutable concept versions; selected approved concept version → frozen output plan → content items → immutable content versions; package family → package versions → exact concept/content/source versions; calendar entry → project + package family + selected package version; Program → approved Bible version → child Weekly Lenses"
  - "V2 03 §4 — command envelope (commandId, workspaceId, actorId/activeRole, targetId, expectedRevision; versionId on version-specific decisions); receipts accepted/succeeded/rejected with commandId, correlationId and error code; events carry eventId, schemaVersion, workspaceId, occurredAt, aggregateId, aggregateRevision, correlationId, type, data"
  - "V2 03 §7 — readiness from supplied statuses; a new concept version marks only dependent active content stale; historical snapshots stay immutable; calendar creation idempotent per package family"
  - "V2 01 §7 — persist all-day dates as ISO calendar dates and timed events as UTC instants plus timezone; «never store formatted Persian dates as canonical values»; a calendar item reads «آماده برنامه‌ریزی» or «برنامه‌ریزی‌شده», never published, because a date was chosen"
  - "V2 01 §8 — run/stage lifecycle and card review status are separate; «reuse existing repo run enums through a projection adapter; do not replace its ADR state machine with this UI vocabulary»"
  - "V2 02 §9 — the eight product node classes and the inspector's Machine 01–05 identity «through a supplied mapping»; visual state derived from domain DTOs, never stored as independent truth in React Flow nodes"
  - "V2 04 §2 — demo time starts 2026-09-06T09:00:00Z; all IDs and timestamps stable; discovery rotates through predefined batches with an explicit seed"
  - "18 §11.2 — sequence step 2 (panel DTOs, validation schemas, the MachineGateway interface) — DELIVERED, see the done work below"
  - "18 §6 — the MachineGateway interface is «the required rule»; UI depends on application-level interfaces, never fixtures or live APIs — DELIVERED"
  - "18 §9 — provisional integration capabilities; every payload carries schema version, event ID, occurred-at, correlation/run ID, workspace ID and originating machine/version; no silent imposition of panel choices on the machine build"
  - "18 §12 — receipts declare their origin; no UI state falsely claims a real machine operation occurred"
adr_constraints:
  - "ADR-0019 D3 — PanelGateway's seven members are unchanged and it gains no mutation; the V2 mutations land on a NEW PanelCommandGateway (createProject, addComment, selectConcepts, amendOutputPlan, updateCalendar, updateCalendarPackage, exportPackage, subscribe) and targeted regeneration on a NEW RevisionGateway (requestRevision); MachineGateway gains no members and is not touched"
  - "ADR-0019 D4 — ReviewApplicationService.reviewItem is a facade ABOVE the gateways: the sole constructor of ApprovalCommand, delegating to MachineGateway.submitApproval, and a member of no gateway interface; requestRevision is never aliased to retryStage; the absence of a second decision path is mechanically proven, not asserted (D19)"
  - "ADR-0019 D5 — APPROVAL_DECISIONS and APPROVAL_REQUEST_STATES are untouched; the V2 card vocabulary plus the separate freshness axis is additive presentation reached through a named projection adapter (revision_requested → CHANGES_REQUESTED, approved → APPROVED, rejected → REJECTED); draft and in_review are pre-PENDING item states, not decisions; ESCALATED gets an explicitly recorded panel rendering; a null reason is rejected before transport and never coerced to an empty string"
  - "ADR-0019 D6 — stored codes stay UPPER_SNAKE stableCodeSchema; V2's lowercase literals are the mock-JSON wire form normalized by the loader at the boundary; *Fa suffixes are permitted on new panel DTO fields carrying authored Persian content; existing repo field names are not renamed; the V2 capability and role strings are demo profiles mapped onto the closed CAPABILITIES and ACTOR_ROLES sets, neither of which gains a member; Source.region maps to COVERAGE_CLASSES and Source.status splits back onto lifecycle/networkReachable/contentRetrievable"
  - "ADR-0019 D7 — CALENDAR_ITEM_STATUSES stands (ADR-0015 D5 is not amended); V2 unscheduled is PLANNED with date === null and planned is PLANNED with a date; calendar creation is idempotent per package family"
  - "ADR-0019 D8 — common.ts gains calendarDateSchema (^\\d{4}-\\d{2}-\\d{2}$); timed events stay instantSchema plus a separate display-timezone field; PANEL_SCHEMA_VERSION stays semver 1.0.0 and drop.panel.mock.v2 is carried as a separate non-semver snapshotKind"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict() with no data field; PanelEvent is a distinct subscription DTO; panel event types with no recorded audit counterpart go in a null-tolerant table modelled on DOC18_EVENT_FAMILY_MAPPING and are reported as a P8 item; the subscription transport is PROVISIONAL"
  - "ADR-0019 D10 — commandEnvelope is exported as commandEnvelopeSchema and extended with commandId, workspaceId and actorId; actedAsRole stays the closed ACTOR_ROLES enum; expectedRowVersion is canonical with expectedRevision as an adapter alias; idempotencyKey is derived from commandId; commandReceiptSchema keeps origin/occurredAt/idempotencyKey REQUIRED and gains status ACCEPTED|SUCCEEDED|REJECTED plus correlationId; GATEWAY_ERROR_REASONS gains REVISION_CONFLICT, excluded from the retryable default"
  - "ADR-0019 D11 — the repo's Project container and PROJECT_STATUSES are untouched; the V2 Project ships as PanelProject, a discriminated union on type program|weekly_lens whose arms embed programSchema and weeklyLensSchema so every recorded refine keeps firing; the twice-duplicated inline subject object is extracted once as subjectRefSchema; V2's Target is that schema narrowed to concept|content; Comment is structurally incapable of carrying a decision outcome"
  - "ADR-0019 D12 — PRODUCT_STAGES (draft, concepts, research_content, package, calendar) is a new PROVISIONAL vocabulary orthogonal to STAGE_STATUSES and RUN_STATUSES; the run-stage-to-product-stage mapping is a null-tolerant table and a named P8 open decision; no renumbering of Machines 01–05; the strip's Review segment is a display grouping with no stored stage member"
  - "ADR-0019 D16 — the single demo clock is 2026-09-06T09:00:00Z and the existing P2 fixtures anchored at 2026-08-21T09:00:00Z are re-based to it; Date.now and Math.random stay unreachable from fixture and adapter code"
  - "ADR-0019 D17 — exportPackage returns a DOM-free PackageExport { bytes, filename, mediaType }; tsconfig.base.json's lib is NOT widened to include DOM"
  - "ADR-0019 D19 — the existing MachineGateway conformance cases are extended by APPENDING ONLY and their names are stable; sibling suites are added for PanelGateway, PanelCommandGateway, RevisionGateway and the review facade; each new invariant ships with a paired broken-stub break and its unbroken control"
  - "ADR-0019 D20 — the frontier is P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8; P-tickets run strictly one at a time (ADR-0018 D2)"
  - "ADR-0018 D1 as amended in part by ADR-0019 D3 — the read-only guarantee attaches to PanelGateway specifically, not to the panel contract surface as a whole"
  - "ADR-0013 D1–D5 — unchanged: single approval write path, mandatory reason, HUMAN-only deciders, one decision per actor per request, self-approval permitted-and-labelled"
  - "ADR-0014 D1 — the event taxonomy is unchanged; heartbeat is transport-only and never an AuditEvent"
  - "ADR-0015 D5 — the Program, Weekly Lens, request and calendar status sets are not amended"
  - "ADR-0017 D3/D5 — panel DTOs never enter packages/contracts; no new workspace package (workspace-integrity.test.ts pins exactly sixteen); no PostgreSQL/Redis/queues/providers; these packages stay pure TypeScript + Zod with no framework or transport dependency"
in_scope:
  - "DONE (committed) — packages/panel-domain: eight vocabulary modules (stage-and-run, approval, events, status, workflow, identity, research, index) and eight schema modules (common, machine, workflow, run, command, artifact, audit, panel-entities) with 106 fixtures (45 accepting in VALID_FIXTURES, 61 rejecting in INVALID_FIXTURES, each citing the rule it violates)"
  - "DONE (committed) — packages/machine-gateway: the verbatim MachineGateway, the read-only seven-member PanelGateway, the typed GatewayError model and the seventeen-case adapter-contract suite with its reference stub and two broken-stub controls"
  - "DONE (committed) — tests/repo: workspace-integrity at sixteen packages, placeholder-purity over the frozen set, verbatim-machine-gateway, and the two ESLint boundary zones with their bad fixtures"
  - "V2 DELTA — packages/panel-domain/src/vocabulary/product.ts (new): PRODUCT_STAGES (PROVISIONAL, ADR-0019 D12), REVIEW_STATUSES, FRESHNESS_STATES, OUTPUT_TYPES (eight, V2 01 §5), REVISION_ROUTES, EDITORIAL_GATE_STATES, PACKAGE_SNAPSHOT_STATES — every member stored UPPER_SNAKE (D6), every set pinned by exact-membership test, every PROVISIONAL set labelled as such in source"
  - "V2 DELTA — packages/panel-domain/src/schemas/panel-product.ts (new): panelProjectSchema (discriminated union on type, arms embedding programSchema and weeklyLensSchema), conceptSchema, conceptVersionSchema, contentItemSchema, contentVersionSchema, outputPlanSchema, refInputSchema/startInputSchema, panelCommentSchema, decisionSchema, packageSnapshotSchema, packageExportSchema, calendarEntrySchema, panelSnapshotSchema"
  - "V2 DELTA — packages/panel-domain/src/schemas/panel-event.ts (new): panelEventSchema (eventId, schemaVersion, workspaceId, aggregateId, aggregateRevision, correlationId, occurredAt, type, data) plus PANEL_EVENT_TYPES and the null-tolerant PANEL_EVENT_AUDIT_MAPPING modelled on DOC18_EVENT_FAMILY_MAPPING (ADR-0019 D9)"
  - "V2 DELTA — packages/panel-domain/src/schemas/common.ts: add calendarDateSchema and displayTimezoneSchema; extract subjectRefSchema once from the two duplicated inline subject objects in schemas/audit.ts and schemas/panel-entities.ts, and derive targetSchema from it with type narrowed to CONCEPT|CONTENT and versionId required (ADR-0019 D8, D11)"
  - "V2 DELTA — packages/panel-domain/src/schemas/command.ts: export commandEnvelopeSchema, extend it with commandId/workspaceId/actorId, keep actedAsRole on the closed ACTOR_ROLES enum, keep expectedRowVersion canonical; extend commandReceiptSchema with status ACCEPTED|SUCCEEDED|REJECTED and correlationId while origin/occurredAt/idempotencyKey stay required (ADR-0019 D10)"
  - "V2 DELTA — packages/panel-domain/src/projection/ (new): review-status.ts (the named projection adapter both ways, null-tolerant, with the recorded ESCALATED rendering), product-stage.ts (the null-tolerant run-stage↔product-stage table and its P8 open item), wire-codec.ts (the loader-boundary normalizer: lowercase wire literals → UPPER_SNAKE stored codes, kind → type, schemaVersion → snapshotKind, region → COVERAGE_CLASSES, status → lifecycle/networkReachable/contentRetrievable, demo role and capability profiles → the closed sets)"
  - "V2 DELTA — the nodeKey join: every V2 product entity that a graph node can represent carries the optional pair (workflowDefinitionVersionId, nodeKey) referencing workflowNodeDefinitionSchema.nodeKey, authored here because the V2 contracts supply no join key at all and P5 cannot draw the graph without one"
  - "V2 DELTA — packages/machine-gateway: panel-command-gateway.ts and revision-gateway.ts (new interfaces beside the untouched panel-gateway.ts), review-application-service.ts (the ADR-0019 D4 facade), and GATEWAY_ERROR_REASONS gaining REVISION_CONFLICT plus a gatewayErrors.revisionConflict constructor"
  - "V2 DELTA — packages/machine-gateway/src/conformance: append new cases to createGatewayConformanceSuite (names of existing cases unchanged) and add sibling factories under src/conformance/panel/ for PanelGateway, PanelCommandGateway, RevisionGateway and the review facade, each new invariant with its paired broken stub and unbroken control (ADR-0019 D19)"
  - "V2 DELTA — re-base the existing fixtures to 2026-09-06T09:00:00Z: the T0/T1/T2 constants in packages/panel-domain/src/fixtures/valid.ts, the ten timestamp-carrying lines in fixtures/invalid.ts, and FIXED_NOW in packages/machine-gateway/src/conformance/conformance.test.ts (ADR-0019 D16)"
out_of_scope:
  - "Seed content, the twenty-four scenario recipes, the scenario loader, MockPanelCommandGateway/MockRevisionGateway and demo persistence (P3). P2 authors the codec; P3 calls it"
  - "Any UI, hook, query or store (P4); the graph itself (P5); wiring commands to buttons (P6)"
  - "A second decision write path in any form — including a convenience method on PanelCommandGateway that happens to record an outcome (ADR-0013 D1; ADR-0019 D4)"
  - "Re-basing packages/ui/src/components/drop/domain-components.test.tsx or apps/web/app/dev/gallery/gallery-content.tsx, which also carry 2026-08-21T12:00:00Z. Those are a Jalali formatter unit test and its gallery sample, not a demo world; ADR-0019 D16's «two clocks in one world» argument does not reach them, and moving the date would force recomputing a committed Jalali expectation for no gain"
  - "Widening tsconfig.base.json's lib, adding a DOM type dependency, or importing React/Next/React Flow into either package (ADR-0019 D17; the committed ESLint zone)"
  - "Amending AUDIT_EVENT_NAMES, APPROVAL_DECISIONS, ADR-0015 D5 status sets, ACTOR_ROLES or CAPABILITIES. Every V2 string that has no recorded counterpart maps to null in a table and becomes a P8 item"
  - "Finalizing machine-owned schemas — the panel defines provisional contracts and contract tests only (18 §9 last paragraph)"
contracts_changed:
  - "Extends the P2 contract freeze. MachineGateway and PanelGateway are byte-frozen; everything else in packages/panel-domain and packages/machine-gateway is additive. P3 opens only after this delta lands, and no later lane edits these files (15 §11 discipline carried into panel scope)."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None at runtime. Role, capability and eligibility fields on DTOs are presentation data; panel-side
  checks are never a security boundary (18 §4.2, V2 03 §5). The demo role and capability profiles are
  illustrative, mapped onto the closed sets, and grant no authority.
failure_states:
  - "A null reasonFa reaching reviewItem is rejected with a stable code before any ApprovalCommand is constructed — never coerced to an empty string, never silently dropped (ADR-0019 D5)"
  - "A stale expectedRevision throws GatewayError(REVISION_CONFLICT), leaves state untouched, preserves the caller's typed feedback and is NOT retryable by default (ADR-0019 D10)"
  - "The same commandId twice returns the original receipt and produces no second effect"
  - "A wire value with no recorded counterpart resolves to null in its mapping table and surfaces as an open P8 item — it never invents an enum member"
  - "Schema parse failures produce stable English UPPER_SNAKE codes; Persian presentation stays the UI's concern"
  - "exportPackage returning an empty byte array or bytes that disagree with the manifest is a conformance failure, not a warning"
test_seams:
  - "Seam A: Zod contract tests on the new panel-product, panel-event and projection modules — accepting and rejecting fixtures per schema, exact-membership enum tests, rejection reasons asserted"
  - "Adapter-contract seam: the appended MachineGateway cases and the four new sibling factories, each proven runnable against a reference stub and failable against its paired broken stub"
  - "Seam F: the verbatim MachineGateway check, the read-only PanelGateway member check, workspace-integrity at sixteen, the tsconfig lib check, and the Date.now/Math.random reachability scan over fixture and adapter code"
acceptance_criteria: "AC-P2.1 through AC-P2.11 are MET by the committed contract freeze; AC-P2.12 through AC-P2.26 are the V2 delta — see the checkbox list below"
dependencies: ["P1-R"]
files_owned:
  - "packages/panel-domain/src/vocabulary/product.ts (new) and vocabulary/index.ts (append-only)"
  - "packages/panel-domain/src/schemas/panel-product.ts, schemas/panel-event.ts (new)"
  - "packages/panel-domain/src/schemas/common.ts, schemas/command.ts, schemas/audit.ts, schemas/panel-entities.ts (additive edits and the subjectRefSchema extraction)"
  - "packages/panel-domain/src/projection/** (new)"
  - "packages/panel-domain/src/fixtures/valid.ts, fixtures/invalid.ts (clock re-base plus new fixtures)"
  - "packages/machine-gateway/src/panel-command-gateway.ts, src/revision-gateway.ts, src/review-application-service.ts (new)"
  - "packages/machine-gateway/src/errors.ts (REVISION_CONFLICT), src/index.ts (exports)"
  - "packages/machine-gateway/src/conformance/index.ts (append-only), src/conformance/panel/** (new), src/conformance/conformance.test.ts"
  - "packages/machine-gateway/src/machine-gateway.ts and src/panel-gateway.ts are LISTED AS FROZEN — no edit lands in either file"
handoff_required: true
```

## What to build

The V2 delta on top of a contract freeze that already shipped. P2 was committed against doc 18:
sixteen vocabulary and schema modules, 106 fixtures, the verbatim `MachineGateway`, the read-only
`PanelGateway`, the typed error model and a seventeen-case conformance suite. **None of that is
reopened.** V2 04 §3 renames the ticket to «Preserve MachineGateway; panel/revision contracts,
version-linked review and calendar/package DTOs», and preserve is the operative word: the delta is
what the panel journey needs *beside* the frozen surface — the product entities the cards render,
the write interfaces the commands travel, and the projection adapters that keep V2's product
vocabulary from becoming a second copy of the recorded domain.

The trap this ticket exists to avoid is a plausible one: `mock/panel-contracts.ts` prints a
`PanelGateway` with six mutations, `exportPackage(): Promise<Blob>` and `subscribe`, and it would
take about ten minutes to paste it over `panel-gateway.ts`. That single edit would break ADR-0018
D1 as amended, open a second write path next to `submitApproval`, and fail `pnpm typecheck` on a
`Blob` that does not exist in this repo's `lib`. V2 04 §1 says it plainly: the file is «a contract
scaffold, not a production SDK».

**Demoable when done:** `pnpm test` runs the appended conformance cases and the four new sibling
suites green; a reviewer can replace `submitApproval` with a stub that throws, call `reviewItem`,
and watch the decision list come back unchanged — the only mechanical proof of ADR-0013 D1 inside
the panel.

Key mechanics:

1. **Three interfaces, one of them frozen twice over.** `machine-gateway.ts` is compared
   character-for-character against the ```ts block inside
   `docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md` by
   `tests/repo/verbatim-machine-gateway.test.ts`, which slices from
   `indexOf("export interface MachineGateway {")` to the next `\n}` — so one added member is a red
   check in a file no one edited. `panel-gateway.ts` keeps exactly its seven members and gains no
   mutation (ADR-0019 D3). The eight V2 mutations go on a new `PanelCommandGateway` and
   `requestRevision` on a new `RevisionGateway`, both in new files, both imported into
   `src/index.ts` beside the others.
2. **`reviewItem` is above the gateways, not on one.** `ReviewApplicationService` is a facade
   (ADR-0019 D4): it resolves the item's approval request and exact version, is the **sole**
   constructor of `ApprovalCommand`, and delegates to `MachineGateway.submitApproval`. It is a
   member of no gateway interface. Reject-and-revise records the decision first, then calls
   `RevisionGateway.requestRevision`; a regeneration failure neither erases the rejection nor
   duplicates it on retry. `requestRevision` is never aliased to `retryStage` — a retry repeats a
   failed attempt with the same input, a revision applies new feedback and creates a new version.
3. **The seed's `reasonFa: null` is a real conflict, and it resolves asymmetrically.**
   `mock/seed.json` ships five `approved` decisions with `"reasonFa": null`, while
   `approvalCommandSchema.reason` is `displayTextSchema` (min 1) because ADR-0013 D2 makes the
   reason mandatory. Both survive: `decisionSchema.reasonFa` stays `string | null` on the **read
   model** — tightening it would reject `mock/seed.json` at P3's loader before P3 starts — and
   `reviewItem` rejects a null reason **before** constructing the command, with a stable code, never
   coercing it to `""` (ADR-0019 D5). A seeded null-reason decision is therefore representable as
   history and not producible by the panel. Record that asymmetry; P3 authors a Persian reason for
   any seeded decision it replays through the write path.
4. **Extracting `subjectRefSchema` must not rename `type` to `kind`.** The inline subject object is
   duplicated in `schemas/audit.ts` (`auditEventSchema.subject`, `versionId` optional) and
   `schemas/panel-entities.ts` (`approvalRequestSummarySchema.subject`, `versionId` required). Both
   are `.strict()`, and the committed fixture value is
   `{ type: "DIRECTION", id: "dir_b", versionId: "dirv_2" }`. ADR-0019 D11 describes V2's `Target`
   as that schema "with `kind` narrowed" — `kind` is the **wire** spelling. Renaming the stored
   field would violate D6's "existing repo field names are not renamed" and turn every committed
   subject fixture into an unrecognized-key rejection. So: the extraction keeps `type`, tightens it
   from `z.string().min(1)` to `stableCodeSchema` (verify: `"DIRECTION"` is the only value in the
   tree today), and the wire codec maps V2's `kind: "concept"` to `type: "CONCEPT"` — field name and
   value casing both change at the boundary, in one place.
5. **`PanelProject` embeds; it does not restate.** The repo already owns `Project` as a container
   above programs (`PROJECT_STATUSES`, `programSummarySchema.projectId`), which is why the V2 entity
   is `PanelProject` (ADR-0019 D11). It is a discriminated union on `type`, and its arms **embed**
   `programSchema` and `weeklyLensSchema` rather than re-declaring their fields — so
   `IN_PIPELINE_PROGRAM_REQUIRES_AN_ACTIVE_RUN`, `LENS_END_MUST_BE_AFTER_START`,
   `APPROVED_LENS_REQUIRES_A_CURRENT_CONTEXT_ARTIFACT` and
   `APPROVED_LENS_REQUIRES_ITS_PARENT_BIBLE_VERSION` keep firing on every panel project. A flat
   copy of the V2 `Project` interface would silently retire all four.
6. **Two axes, projected, never merged.** `REVIEW_STATUSES` (`draft, in_review, revision_requested,
   approved, rejected`) and `FRESHNESS_STATES` (`current, stale`) are additive presentation.
   `projection/review-status.ts` maps `revision_requested → CHANGES_REQUESTED`,
   `approved → APPROVED`, `rejected → REJECTED`, and returns **null** for `draft` and `in_review` —
   they are pre-`PENDING` item states, not decisions, so the type is
   `Record<ReviewStatus, ApprovalDecision | null>`, null-tolerant like `DOC18_EVENT_FAMILY_MAPPING`.
   The reverse direction is total on the four decisions and `ESCALATED` gets its own recorded
   rendering — an `escalated` flag alongside a review status, never folded into `in_review` or
   `rejected`. Its Persian label belongs to P4; the contract carries only the stable code.
7. **`PRODUCT_STAGES` is a third axis, and it is PROVISIONAL.** `draft, concepts, research_content,
   package, calendar` is orthogonal to `STAGE_STATUSES` (14) and `RUN_STATUSES` (9). The
   run-stage-to-product-stage table is `null`-tolerant and is a named P8 open decision. The panel
   does not renumber Machines 01–05, does not claim an inferred mapping, and there is no Machine 06.
   The five-segment strip's "Review" segment derives from open review counts — `PRODUCT_STAGES`
   enumerates no `review` member and must not gain one (ADR-0019 D12).
8. **Two versions, two spellings, two clocks that must become one.** `PANEL_SCHEMA_VERSION` stays
   `"1.0.0"` and `schemaVersionSchema` still rejects anything that is not semver — feeding
   `mock/seed.json`'s `"schemaVersion": "drop.panel.mock.v2"` into it fails with
   `SCHEMA_VERSION_MUST_BE_SEMVER`, so the codec renames that field to `snapshotKind`
   (ADR-0019 D8). And the clock: re-base `T0`/`T1`/`T2` in `fixtures/valid.ts`, the ten
   timestamp-carrying lines in `fixtures/invalid.ts`, and `FIXED_NOW` in `conformance.test.ts` to
   the 2026-09-06 epoch. Do it by hand, not by replacing `"2026-08-21T09:00:00Z"` globally: line 50
   of `fixtures/invalid.ts` is `"2026-08-21T09:00:00+03:30"`, the fixture that proves
   `INSTANT_MUST_BE_UTC_ISO_8601`, and normalizing its offset to `Z` would quietly turn a rejecting
   fixture into an accepting one.
9. **`calendarDateSchema`, and why the calendar never says published.** All-day dates persist as
   `^\d{4}-\d{2}-\d{2}$`; timed events stay `instantSchema` plus a separate display-timezone field
   defaulting to `Asia/Tehran`; a formatted Persian/Jalali date is never a canonical value
   (ADR-0019 D8; V2 01 §7). `CALENDAR_ITEM_STATUSES` is not amended (ADR-0015 D5): V2's
   `unscheduled` is `PLANNED` with `date === null` and `planned` is `PLANNED` with a date, so the
   entry reads «آماده برنامه‌ریزی» or «برنامه‌ریزی‌شده» and «تعیین تاریخ» is the action — never
   published, because a date was chosen. Calendar identity is keyed by package family so creation is
   idempotent and a v2 package is an explicit relink, not a second entry.
10. **`REVISION_CONFLICT` is the one error that must not retry.** Add it to
    `GATEWAY_ERROR_REASONS` and leave the constructor's default alone: `retryable` falls back to
    `reason === "MACHINE_SYSTEM_DISCONNECTED" || "TIMEOUT" || "STALE_DATA"`, so the new member is
    non-retryable by construction. Pin that with a test, because adding it to the ternary chain
    "for symmetry" would turn a refresh-then-resubmit into a blind retry loop against a stale
    revision (ADR-0019 D10). The pack's codes map in: `FORBIDDEN → UNAUTHORIZED`,
    `UNAVAILABLE → MACHINE_SYSTEM_DISCONNECTED`, `INVALID_INPUT → SCHEMA_VALIDATION_FAILED`,
    `BLOCKED → INVALID_STATE_TRANSITION`, `CONFLICT → REVISION_CONFLICT`.
11. **`exportPackage` returns bytes, not a `Blob`.** `tsconfig.base.json` sets
    `"lib": ["ES2023"]`. Copying `exportPackage(id): Promise<Blob>` from `panel-contracts.ts` fails
    `pnpm typecheck` with "Cannot find name 'Blob'", and the wrong fix is widening `lib` to include
    DOM — ADR-0019 D17 forbids exactly that. The contract is
    `PackageExport { bytes: Uint8Array; filename: string; mediaType: string }`; `apps/web`
    constructs the `Blob` in P6.
12. **The `nodeKey` join is authored here or P5 cannot draw the graph.** V2's contracts carry no key
    tying a `Concept`, `ContentItem`, `PackageSnapshot` or `CalendarEntry` to a node in a workflow
    definition — and P5 must join the two without inferring identity from graph position
    (ADR-0019 D18). `workflowNodeDefinitionSchema.nodeKey` already exists and
    `workflowDefinitionVersionSchema` enforces `NODE_KEYS_MUST_BE_UNIQUE_WITHIN_A_VERSION`, so the
    join key is the **pair** `(workflowDefinitionVersionId, nodeKey)`, not `nodeKey` alone. Carry
    both as an optional pair on the product entities, refined so one is never present without the
    other. Absent means "no machine node represents this yet", which is a legitimate state for a
    draft project — it is not a defect to be filled in with a guess.
13. **Demo profiles map onto closed sets, and some of them map to nothing.** V2's capability strings
    are `concept.review, content.review, fa.editorial, comment.create, calendar.edit, read` and its
    role strings are `demo_concept_reviewer, demo_fa_editorial`. `CAPABILITIES` is closed at
    thirteen and contains no comment, calendar or read member; `ACTOR_ROLES` is closed at seven.
    Neither gains a member (ADR-0019 D6). `fa.editorial → FA_EDITORIAL` is fixed by the record;
    every pair the record does not fix maps to `null` in the same table and is reported as a P8
    coordination item. Do not resolve the eight-roles-versus-seven conflict by picking a count —
    V2 03 §5 explicitly forbids it.
14. **Append, never renumber.** `createGatewayConformanceSuite`'s seventeen case names are stable
    (ADR-0019 D19) and `conformance.test.ts` asserts `cases.length >= 15`; new MachineGateway
    invariants append to the end of the array. The four new surfaces get **sibling** factories under
    `src/conformance/panel/`, not new members of the existing one. Every new invariant ships with a
    paired broken stub and its unbroken control, matching the two breaks already committed —
    without the break, a green suite proves nothing.
15. **The load-bearing proof.** One new case replaces `submitApproval` with a rejecting stub, calls
    `reviewItem`, and asserts the decision list is byte-identical afterwards. If any second write
    path exists — a helper on `PanelCommandGateway`, a direct append in the mock repository, a
    convenience method that records an outcome — that case goes red. It is the only mechanical proof
    of ADR-0013 D1 inside the panel, and it is why `reviewItem` may construct `ApprovalCommand`
    nowhere but in one function.

## Blocked by

**P1-R** (ADR-0019 D20 frontier: P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8). P2's original scope is
committed and green; this ticket adds to it and reopens nothing in `machine-gateway.ts` or
`panel-gateway.ts`. P3 must not start until the delta lands, because P3's loader calls the wire
codec and its mock adapters implement the two new interfaces.

## Acceptance criteria

The first eleven are the committed contract freeze and are recorded here as met, unchanged, and
still green under `pnpm test`.

- [x] **AC-P2.1 Fixture coverage** — MET. 45 accepting and 61 rejecting fixtures; every rejection
  asserts its reason and cites the rule it violates. *Seam: A.*
- [x] **AC-P2.2 Exact state vocabulary** — MET. 14 stage states, 9 run states,
  `PROVIDER_CONFIGURATION_REQUIRED` present. *Seam: A.*
- [x] **AC-P2.3 Exact event vocabulary** — MET. `AUDIT_EVENT_NAMES` = 28 + 7 = 35; `heartbeat`
  rejected; the 18 §9 envelope required. *Seam: A.*
- [x] **AC-P2.4 Approval shape** — MET. The four decisions, acted-as role, mandatory reason,
  idempotency key; `APPROVE_GATE`/`REQUEST_CHANGES`/`ESCALATE_GATE` rejected by name. *Seam: A.*
- [x] **AC-P2.5 ADR-0015 enums mirrored** — MET. *Seam: A.*
- [x] **AC-P2.6 Verbatim interface** — MET and still enforced by
  `tests/repo/verbatim-machine-gateway.test.ts`. *Seam: F.*
- [x] **AC-P2.7 Conformance suite** — MET. Seventeen cases green against the reference stub, red
  against both broken stubs. *Seam: adapter-contract.*
- [x] **AC-P2.8 Workspace membership** — MET at sixteen packages. *Seam: F.*
- [x] **AC-P2.9 Placeholder purity** — MET over the eleven frozen packages and `apps/worker`.
  *Seam: F.*
- [x] **AC-P2.10 Boundary zones** — MET; the bad fixtures still fail ESLint. *Seam: F.*
- [x] **AC-P2.11 Checks green** — MET at the freeze commit; re-asserted by AC-P2.26.

The V2 delta:

- [ ] **AC-P2.12 PanelProject embeds the recorded arms** (ADR-0019 D11) — `panelProjectSchema` is a
  discriminated union on `type` whose `program` and `weekly_lens` arms embed `programSchema` and
  `weeklyLensSchema`; four fixtures prove `IN_PIPELINE_PROGRAM_REQUIRES_AN_ACTIVE_RUN`,
  `LENS_END_MUST_BE_AFTER_START`, `APPROVED_LENS_REQUIRES_A_CURRENT_CONTEXT_ARTIFACT` and
  `APPROVED_LENS_REQUIRES_ITS_PARENT_BIBLE_VERSION` still reject through the union; the repo's
  `Project` container and `PROJECT_STATUSES` are untouched. *Seam: A.*
- [ ] **AC-P2.13 One subject shape, field name preserved** (ADR-0019 D11, D6) — `subjectRefSchema`
  is declared once and consumed by both `auditEventSchema` and `approvalRequestSummarySchema`; the
  stored field is still `type`; `targetSchema` narrows it to `CONCEPT|CONTENT` with `versionId`
  required; `panelCommentSchema` has no outcome-shaped field and a fixture carrying one is rejected
  by `.strict()`. *Seam: A.*
- [ ] **AC-P2.14 Calendar dates and statuses** (ADR-0019 D7, D8) — `calendarDateSchema` accepts
  `2026-09-12` and rejects an instant; timed events use `instantSchema` plus a separate timezone
  field; `CALENDAR_ITEM_STATUSES` is unchanged; `unscheduled` round-trips as `PLANNED` with
  `date === null`; entries are keyed by package family so a second create for the same family is
  the same entry. *Seam: A.*
- [ ] **AC-P2.15 Product stages are a third, provisional axis** (ADR-0019 D12) — `PRODUCT_STAGES`
  equals exactly the five V2 members by exact-membership test, contains no `review`, is labelled
  PROVISIONAL in source, and its run-stage mapping table is `null`-tolerant with every `null` named
  in the P8 open-items list. *Seam: A.*
- [ ] **AC-P2.16 The review projection, both directions** (ADR-0019 D5) — `revision_requested`
  arrives as `CHANGES_REQUESTED`, `approved` as `APPROVED`, `rejected` as `REJECTED`; `draft` and
  `in_review` return `null` and never a decision; `ESCALATED` renders through its recorded
  representation rather than being dropped; `APPROVAL_DECISIONS` and `APPROVAL_REQUEST_STATES` are
  byte-identical to the freeze. *Seam: A.*
- [ ] **AC-P2.17 Envelope and receipt** (ADR-0019 D10) — `commandEnvelopeSchema` is exported and
  carries `commandId`, `workspaceId`, `actorId`, `actedAsRole` (closed `ACTOR_ROLES`) and
  `expectedRowVersion`; `expectedRevision` is accepted only as an adapter alias and normalizes to
  `expectedRowVersion`; `idempotencyKey` derives from `commandId`; `commandReceiptSchema` still
  requires `origin`, `occurredAt` and `idempotencyKey` and adds `status: ACCEPTED|SUCCEEDED|REJECTED`
  plus `correlationId`; a fixture proves `ACCEPTED` is not treated as completed. *Seam: A.*
- [ ] **AC-P2.18 REVISION_CONFLICT is not retryable** (ADR-0019 D10) — the reason is a member of
  `GATEWAY_ERROR_REASONS`, `new GatewayError("REVISION_CONFLICT", …).retryable` is `false` with no
  explicit option, and a stale `expectedRevision` throws it and leaves state untouched. *Seam: A,
  adapter-contract.*
- [ ] **AC-P2.19 Three interfaces, two of them frozen** (ADR-0019 D3) — `MachineGateway` still
  passes the character-for-character check; `PanelGateway` still declares exactly its seven
  read-only members and no mutation; `PanelCommandGateway` declares the eight V2 capabilities and
  `RevisionGateway` declares `requestRevision`, both in new files exported from
  `packages/machine-gateway/src/index.ts`. A Seam F check asserts no mutating verb appears in
  `panel-gateway.ts`. *Seam: F.*
- [ ] **AC-P2.20 One decision write path, proven** (ADR-0019 D4, D19; ADR-0013 D1) —
  `ReviewApplicationService.reviewItem` is the sole constructor of `ApprovalCommand` and belongs to
  no gateway interface; exactly one `submitApproval` per `reviewItem`; **replacing `submitApproval`
  with a rejecting stub leaves the decision list unchanged**; a `null` reason is rejected before
  transport; an approval appends an observable audit event; the same `commandId` twice yields the
  same receipt and no second effect. *Seam: adapter-contract.*
- [ ] **AC-P2.21 Transport-free export** (ADR-0019 D17) — `exportPackage` returns
  `PackageExport { bytes, filename, mediaType }`; `tsconfig.base.json`'s `lib` is still exactly
  `["ES2023"]` (asserted by a Seam F check); no DOM type appears in either package; exported bytes
  are non-empty and agree with their manifest in the conformance suite. *Seam: F,
  adapter-contract.*
- [ ] **AC-P2.22 One clock, no entropy** (ADR-0019 D16) — no `2026-08-21` literal survives in
  `packages/panel-domain/src/fixtures/**` or `packages/machine-gateway/src/conformance/**`; the
  `+03:30` rejecting fixture still rejects with `INSTANT_MUST_BE_UTC_ISO_8601`; a Seam F scan proves
  `Date.now` and `Math.random` are unreachable from fixture and adapter code. *Seam: A, F.*
- [ ] **AC-P2.23 The wire codec is the only boundary** (ADR-0019 D6) — lowercase wire literals
  normalize to UPPER_SNAKE stored codes and round-trip; `kind → type`,
  `schemaVersion → snapshotKind`, `region → COVERAGE_CLASSES` and
  `status → lifecycle/networkReachable/contentRetrievable` are covered by fixtures; the demo role
  and capability profile table maps `fa.editorial → FA_EDITORIAL`, resolves every unmapped V2 string
  to `null`, and adds no member to `CAPABILITIES` or `ACTOR_ROLES`. *Seam: A.*
- [ ] **AC-P2.24 The graph join exists** (ADR-0019 D18) — product entities carry the optional
  `(workflowDefinitionVersionId, nodeKey)` pair, refined so neither appears without the other; a
  fixture joins a seeded product entity to a node in a committed definition version, and a negative
  fixture proves a bare `nodeKey` without its version id is rejected. *Seam: A.*
- [ ] **AC-P2.25 Conformance extended by appending** (ADR-0019 D19) — the seventeen existing case
  names are unchanged and still first in order; sibling factories exist for `PanelGateway`,
  `PanelCommandGateway`, `RevisionGateway` and the review facade; `subscribe`'s unsubscribe stops
  delivery, a duplicate `eventId` dedupes and an older `aggregateRevision` is ignored;
  `requestRevision` creates a new version with prior versions byte-identical; every new invariant
  has a paired broken stub that fails for the named reason and an unbroken control that passes.
  *Seam: adapter-contract.*
- [ ] **AC-P2.26 Checks green** (16 §7) — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  pass; `pnpm test:db` and `pnpm test:e2e` remain green no-ops for this ticket;
  `workspace-integrity.test.ts` still asserts exactly sixteen packages; any new dependency was added
  with `pnpm add -E` and `check-pinned.mjs` is green. *Seam: F.*
