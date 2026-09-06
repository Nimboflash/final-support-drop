# Ticket P6 — Functional commands, version conflicts, degraded states and the downloadable mock ZIP

```yaml
ticket_id: "P6"
title: "Wire every panel write: the review facade, PanelCommandGateway, RevisionGateway, automatic package assembly, the real ZIP export, idempotent calendar entries, stale dependencies and the five scenario-controlled degraded states"
release: "P"
owner_lane: "frontend"
source_requirements:
  - "V2 01 §4 — the four concept actions (comment, approve, request changes, reject) with their exact requirements; «Revise this idea» keeps the concept id, «Generate a replacement» mints a new id with replacesConceptId; every revision returns to review and never inherits approval; rejection is never silent deletion and never an unreviewable loop"
  - "V2 01 §5 — per-item content review; regenerating one film recommendation must not replace approved music, article or other content; a revision may route to content rewrite or research refresh, and refresh preserves earlier source evidence and records a new attempt"
  - "V2 01 §6 — readiness from included branches' latest active required content; automatic assembly on readiness; assembly failure retryable without regenerating content; download requires an explicit click; the ZIP contains real files matching its manifest; concept change shows impacted content first, keeps historical approvals, marks only dependent latest outputs stale"
  - "V2 01 §7 — one calendar entry per package family, idempotent; target date → planned, no date → unscheduled tray with «تعیین تاریخ»; never invent an approved publishing date; a calendar item never reads «published» because a date was chosen"
  - "V2 01 §8 — successful commands update every view of the same entity (card, inbox, counts, graph, package readiness, activity); double clicks and retried commands never duplicate runs, approvals, packages or calendar entries; expected revisions prevent stale submissions"
  - "V2 02 §6 — request-changes dialog (target title/version, required reason, optional structured note, scope «this item», regeneration route, confirmation); reject dialog offers reject-only / reject-and-revise / reject-and-replace; buttons show pending state; failures retain draft feedback; focus returns to the triggering card; global Reviews uses the same command path and never duplicates approval logic"
  - "V2 02 §10 — stale content stays visible with a last-sync timestamp and is not erased on disconnect; mutations are disabled with an explanation where the scenario disallows them"
  - "V2 03 §2 — reviewItem resolves the item's approval request and exact version, then delegates to MachineGateway.submitApproval; the mock appends the decision, changes the read model and emits one event; reject-and-revise records the decision first; retryStage is never abused to mean changing content"
  - "V2 03 §4 — command envelope, receipts (accepted is not completed), event dedupe by eventId, older aggregateRevision ignored, and the query families to invalidate; V2 03 §7 — the assembly key, calendar idempotence and the outdated-content warning"
  - "V2 04 §4 journeys A03, A04, A05, A07, A09, A10, A11, A12, A13, A14, A15, A16, A19; V2 04 §1 scenarios S06, S08, S09, S10, S13, S14, S17, S18, S19, S20, S21, S22, S23, S24"
  - "18 §7.3 mocked command behaviour (start, pause, retry, approve/reject/request changes, refresh/synchronize; marked in dev/demo; never implying real machine work); 18 §12 — commands produce clear mocked state changes and audit entries, and no UI state falsely claims a real machine operation occurred"
adr_constraints:
  - "ADR-0019 D3 — writes land on the NEW PanelCommandGateway (createProject, addComment, selectConcepts, amendOutputPlan, updateCalendar, updateCalendarPackage, exportPackage, subscribe) and targeted regeneration on the NEW RevisionGateway (requestRevision). PanelGateway stays read-only with its seven members; MachineGateway gains no member, ever"
  - "ADR-0019 D4 — ReviewApplicationService.reviewItem is a facade ABOVE the gateways: the sole constructor of ApprovalCommand, delegating to MachineGateway.submitApproval, and a member of no gateway interface. requestRevision is never aliased to retryStage. Reject-and-revise records the decision first and durably; a regeneration failure neither erases the rejection nor duplicates it on retry"
  - "ADR-0019 D5 — the card vocabulary is an additive projection (revision_requested → CHANGES_REQUESTED, approved → APPROVED, rejected → REJECTED); freshness is the separate axis; APPROVAL_DECISIONS is untouched; approval reasons stay mandatory and a null reasonFa is rejected before transport, never coerced to an empty string"
  - "ADR-0019 D6 — stored codes stay UPPER_SNAKE; the V2 lowercase literals (outcomes, revision routes, statuses) are the mock-JSON wire form normalized at the loader boundary; the demo capability and role strings map onto the closed CAPABILITIES and ACTOR_ROLES sets, which gain no member"
  - "ADR-0019 D7 — calendar creation is idempotent per package family; unscheduled is PLANNED with date === null; relinking a family to a new package version is an explicit update, never a duplicate; ADR-0015 D5's PLANNED|CONFIRMED|DONE|CANCELLED is NOT amended"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict() with no data field; PanelEvent is the panel's own subscription DTO; panel event types with no recorded audit counterpart go through the null-tolerant mapping table modelled on DOC18_EVENT_FAMILY_MAPPING and are reported as a P8 coordination item"
  - "ADR-0019 D10 — commandEnvelopeSchema carries commandId, workspaceId, actorId and the closed ACTOR_ROLES actedAsRole; expectedRowVersion is canonical with expectedRevision as the adapter alias; idempotencyKey derives from commandId; receipts keep origin/occurredAt/idempotencyKey required and carry status ACCEPTED|SUCCEEDED|REJECTED; REVISION_CONFLICT is excluded from the retryable default"
  - "ADR-0019 D16 — the single demo clock is 2026-09-06T09:00:00Z; Date.now and Math.random stay unreachable from fixture and adapter code; latency, offline, forbidden, retryable and non-retryable failure and conflict are scenario-controlled, never random"
  - "ADR-0019 D17 — exportPackage returns PackageExport { bytes, filename, mediaType }; apps/web constructs the Blob; tsconfig.base.json's lib is NOT widened to DOM; the archive carries real sample files plus a synthesized manifest.json matching its actual contents; no dead download buttons and no empty archives"
  - "ADR-0019 D18 — graph review shortcuts call the same approval service as the inbox: P5 rendered them disabled and THIS ticket wires them; revision loop edges stay rendered from version lineage in execution mode and carry no iteration cap"
  - "ADR-0019 D19 — the new invariants ship with paired broken-stub breaks: one submitApproval per reviewItem; replacing submitApproval with a rejecting stub leaves the decision list unchanged; same commandId twice yields the same receipt and no second effect; a stale expectedRevision throws REVISION_CONFLICT leaving state untouched; requestRevision creates a new version with prior versions byte-identical; unsubscribe stops delivery; exported bytes are non-empty and match their manifest"
  - "ADR-0013 D1/D2 — sole write path; no gate verb is ever presented or transported as a run command. ADR-0012 — mocked effects move state only along the D1 transition table and run status is recomputed by the D3 aggregation rule; retry preserves prior attempt history. ADR-0014 D1 — event names are the recorded taxonomy; no parallel vocabulary is invented"
  - "ADR-0018 D3 — apps/worker and the eleven machine packages stay inert; ADR-0019 D20 — the frontier is P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8, one ticket at a time"
in_scope:
  - "The review facade: ReviewApplicationService.reviewItem wired behind every review affordance — concept card, content card, review sheet footer, global Reviews queue, the overview inbox row and the P5 graph shortcuts — for comment (no approval change), approve (exactly the current reviewable version), request changes (reason plus actionable feedback) and reject (reason required)"
  - "Rejection routes: «Reject only», «Reject and revise» (same concept id, new version, back to review) and «Reject and replace» (new concept id with replacesConceptId, original preserved in history), each one explicit confirmation flow, never an automatic loop"
  - "RevisionGateway.requestRevision for targeted regeneration with routes concept_revision | concept_replacement | content_rewrite | research_refresh (wire form; stored UPPER_SNAKE), scoped to one card, leaving every sibling content item and its approvals untouched; research refresh preserves earlier source evidence and records a new attempt"
  - "The full PanelCommandGateway surface wired to its P4 surfaces: createProject («شروع مسیر جدید», reference metadata snapshot only), addComment, selectConcepts («ادامه با کانسپت‌های تأییدشده (N)»), amendOutputPlan (reason plus history), updateCalendar, updateCalendarPackage, exportPackage and subscribe"
  - "MachineGateway run controls kept distinct from revision: startRun, pauseRun and retryStage (S09 repeats a failed attempt with the same input and preserves attempt history; S10 refuses a non-retryable failure with a stable code)"
  - "Idempotency and optimistic concurrency across every command: commandId → idempotencyKey, repeat returns the original receipt with no repeated effect; stale expectedRevision → REVISION_CONFLICT with a refresh prompt and the user's typed feedback preserved; pending button state so a double click mints no second command"
  - "Automatic package assembly on readiness (all included branches' latest active required content approved, editorial gates passed, no blocking issue, no stale dependency), keyed by project + included content-version ids + plan revision; candidate concepts not selected for research are excluded from the denominator; assembly failure is retryable without regenerating content (S23)"
  - "exportPackage: a real archive — README, concept summaries and Bible reference, research index and coverage gaps, approved per-item Markdown, social and landing payload JSON, production briefs when selected, plus a synthesized manifest.json (the package snapshot with file bodies stripped); returned as PackageExport, with apps/web constructing the Blob behind an explicit click"
  - "Calendar on completion: one entry per package family; targetDate → PLANNED with a date; no date → the unscheduled tray («تعیین تاریخ») as PLANNED with date === null; a v2 package offers an explicit replace-linked-version action; a scheduled historical version shows the outdated-content warning"
  - "Upstream concept change (S21): the impact preview shown BEFORE the new concept version is created; historical approvals intact; only dependent latest outputs marked stale; the stale package still downloadable as a labelled historical snapshot and removed from current readiness; unrelated branches untouched"
  - "The five scenario-controlled degraded states — latency, offline, forbidden, retryable failure, non-retryable failure — plus the conflict case, driven by S13, S14, S22 and S23 only; stale content stays visible with its last-sync timestamp and mutations are disabled with an explanation"
  - "Subscription fan-out: one accepted command updates card, inbox, counts, graph, package readiness, calendar and activity; PanelEvents dedupe by eventId and ignore an older aggregateRevision; unsubscribe actually stops delivery"
out_of_scope:
  - "New pages or surfaces — this ticket wires P4's journey and P5's graph; a missing affordance is a P4/P5 defect report, not a new route here"
  - "Any real transport, SSE or polling (the subscription is the mock one; the transport choice is deferred to the machine team's contract, ADR-0019 D9)"
  - "Growing MachineGateway or PanelGateway by a single member; adding reviewItem to any gateway interface (ADR-0019 D3, D4)"
  - "Optional ICS export (V2 01 §7 leaves it optional), Google Calendar integration, publishing of any kind, and real upload or document extraction"
  - "Bulk approvals (deferred, V2 02 §6) — bulk «continue with approved concepts» is the supported batch action"
  - "The full behaviour/contract/visual QA sweep (P7) and the integration mapping (P8); shape gaps discovered while wiring are logged for P8's open-decisions list, never silently patched"
contracts_changed:
  - "None. P2's freeze is consumed as-is: PanelCommandGateway, RevisionGateway, the ReviewApplicationService facade signature, commandEnvelopeSchema, commandReceiptSchema, GATEWAY_ERROR_REASONS with REVISION_CONFLICT, PanelEvent and PackageExport are all P2's (ADR-0019 D3, D10, D17). This ticket adds implementations and wiring only."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  Every command passes a panel application-service check before reaching a gateway; hiding a
  button is never the enforcement (18 §4.2). The demo capability profiles (concept.review,
  content.review, fa.editorial, comment.create, calendar.edit, read) and demo roles map onto the
  closed CAPABILITIES and ACTOR_ROLES sets, which gain no member (ADR-0019 D6). actor-viewer
  holds only "read": its affordances are unavailable AND the mock command is rejected with
  UNAUTHORIZED and no mutation. Real enforcement belongs to the machine build.
failure_states:
  - "Timeout or offline while revising: the typed feedback survives, no success is faked, and retry does not erase history (A19, S13)"
  - "REVISION_CONFLICT: the UI asks for a refresh and re-submit; it is never blind-retried, and GatewayError's retryable default must not acquire it"
  - "A read-only actor's command is rejected with no mutation, proven by invoking the application service directly rather than by a hidden button (A16, S14)"
  - "A regeneration failure after a rejection neither erases the decision nor duplicates it on retry (ADR-0019 D4)"
  - "Assembly failure is retryable without regenerating any content (S23); a retry produces the same package key, not a second family"
  - "A stale package stays downloadable as a labelled historical snapshot and can never be presented as the current ready package"
  - "No dead download button and no empty archive: a package whose bytes would be empty fails the export instead of handing back a zero-entry file (ADR-0019 D17)"
  - "Offline keeps stale content visible with its last-sync timestamp and disables mutations with an explanation (V2 02 §10)"
test_seams:
  - "Adapter-contract seam: the P2 sibling suites for PanelCommandGateway, RevisionGateway and the review facade — the ADR-0019 D19 invariants, each with its paired broken-stub break and unbroken control"
  - "Component seam: review sheet footer, request-changes and reject dialogs, pending button state, feedback preservation across conflict and offline, degraded banners, graph shortcuts, explicit download click"
  - "Scenario seam: S06, S08, S09, S10, S13, S14, S17, S18, S19, S20, S21, S22, S23, S24 and journeys A03, A04, A05, A07, A09–A16, A19"
  - "Seam A (contract): every outgoing envelope validates against commandEnvelopeSchema and every receipt against commandReceiptSchema before it is trusted; the synthesized manifest.json parses as a package snapshot with bodies stripped"
  - "Seam E (e2e): the command tour and the degraded tour in Persian RTL, including a real ZIP downloaded and inspected against its manifest"
  - "Seam F (repo): the verbatim MachineGateway check, workspace-integrity at sixteen packages, check-pinned.mjs, placeholder-purity, ESLint boundary zones, and a static check that ApprovalCommand is constructed in exactly one place"
acceptance_criteria: "AC-P6.1 through AC-P6.14 — see the checkbox list below"
dependencies: ["P5"]
files_owned:
  - "apps/web — command modules behind the P4 surfaces: review actions, request-changes and reject dialogs, revision routing, plan amendment, calendar date edit and relink, the explicit download click that constructs the Blob from PackageExport, and the TanStack Query invalidation map"
  - "packages/machine-gateway/src/mock/** — MockPanelCommandGateway, MockRevisionGateway, the review-facade implementation and the transport-free archive writer (additive; P2's interface files and the verbatim MachineGateway stay frozen)"
  - "packages/mock-data/** — deterministic command handlers, package assembly, calendar idempotence, stale propagation and the S15–S24 scenario overlays (extends P3 under the frontier rule; no parallel lane touches them)"
  - "packages/workflow-ui/** — enabling P5's already-rendered review shortcuts against the facade; no new node type, no new edge type"
  - "tests/e2e/panel/** — the command and degraded journeys (extends P4's directory)"
handoff_required: true
```

## What to build

The ticket where the panel stops being a rendering of a fixture and starts being a machine the
demo operator drives. P4 built the journey and P5 built the graph with its review shortcuts
deliberately disabled; here every write becomes real against the mocks — one approval path, one
targeted-regeneration path, idempotent commands, honest failures, an archive with actual bytes in
it, and a calendar that refuses to duplicate itself.

Tracer-bullet: on S17 the reviewer comments on a concept without changing its status, approves
c2-v2 at exactly that version, rejects c3-v1 with a reason and chooses «Reject and revise» — the
decision lands first, then a revision is queued for that card alone, and c3-v2 comes back to
review without inheriting anything. On S18 one content item is revised through
`content_rewrite` while o1 and o3 keep their approvals byte-for-byte. On S19 the last required
approval trips automatic assembly, the same commandId submitted twice produces one package, and
the download click hands over a ZIP whose four entries match its three-entry `files[]` plus the
synthesized manifest. On S22 a stale `expectedRevision` comes back REVISION_CONFLICT with the
typed feedback still in the textarea. On S13 and S14 the same actions fail truthfully.

**Demoable when done:** the command tour on S17 → S18 → S19 → S20 → S21 → S23, then the degraded
tour on S13, S14 and S22, then the same approval issued from the inbox, the card and the graph
shortcut, producing one audit event and identical state each time.

Key mechanics:

1. **The facade is above the gateways, and it is the only door.** `reviewItem` resolves the
   approval request and the exact version, constructs the one `ApprovalCommand` this codebase
   ever constructs, and calls `MachineGateway.submitApproval`. It is a member of no gateway
   interface (ADR-0019 D3, D4). The mechanical proof is ADR-0019 D19's: swap `submitApproval`
   for a rejecting stub and the decision list must be **unchanged**. Any surface that writes a
   decision another way — a mock repository call, an optimistic cache write that survives — turns
   that test green-to-red, which is the point.
2. **Comment is not a decision.** `Comment` is structurally incapable of carrying an outcome
   (ADR-0019 D11), so commenting goes to `PanelCommandGateway.addComment` and never through the
   facade. A05 asserts the approval status is untouched afterwards.
3. **The reason is mandatory and is never coerced.** `approvalCommandSchema.reason` is
   `displayTextSchema` (min 1), so an empty string fails at the boundary — but the trap is
   upstream: a `null` `reasonFa` must be rejected before transport, not turned into `""` to make
   the parse pass (ADR-0019 D5). Reject and request-changes both require it; approve does not.
4. **A revision is not a retry.** `retryStage` repeats a failed attempt with the same input
   (S09); `requestRevision` applies new feedback and creates a new version (S18). Do not reach
   for `retryStage` because it already exists — and do not add `requestRevision` to
   `MachineGateway`: `tests/repo/verbatim-machine-gateway.test.ts` compares the exported
   declaration block against the committed 18 §6 text character-for-character and goes red on the
   first added member.
5. **Order matters in reject-and-revise.** Record the decision first and durably, then request
   regeneration. Force the revision to fail and assert exactly one decision row exists; retry it
   and assert there is still exactly one (ADR-0019 D4). Writing both inside one optimistic block
   is how the rejection silently disappears when the second call throws.
6. **Idempotency returns the original receipt, not a fresh success.** `commandId` derives the
   `idempotencyKey` (ADR-0019 D10); a repeat returns the first receipt — same `occurredAt`, same
   `correlationId`, same `status` — and performs no second effect. Mint the `commandId` when the
   dialog opens, not per click, and hold the button in its pending state; that is what makes A15's
   double submit produce one run, one approval, one package and one calendar entry.
7. **REVISION_CONFLICT is deliberately not retryable.** `GatewayError`'s constructor computes its
   retryable default from the reason (`MACHINE_SYSTEM_DISCONNECTED`, `TIMEOUT`, `STALE_DATA`);
   `REVISION_CONFLICT` must not join that branch (ADR-0019 D10). A conflict is resolved by
   refresh-then-resubmit. The user's typed feedback must live above the mutation — keyed by
   target plus version in the command store, not in component state that unmounts when the
   refetch re-renders the sheet.
8. **Assembly is a scripted response to readiness, not a Machine 06.** Readiness counts the
   included branches' latest active required content from the frozen output plan's
   `requiredContentIds`; candidate concepts never selected for research are not in the
   denominator (V2 01 §6). The package key is project + included content-version ids + plan
   revision (V2 03 §7), which is what makes S19's repeated assembly one package and S23's retry a
   retry rather than a second family. No new approval gate is introduced.
9. **The archive is real, and the manifest is synthesized.**
   `docs/frontend-v2/mock/DEMO_PACKAGE_p2_v1.zip` is the reference shape: **4 entries where
   `files[]` lists 3**, because `manifest.json` is the snapshot with `body` stripped, not a
   `files[]` member. An assertion of `entries.length === snapshot.files.length` is therefore
   wrong by exactly one. `exportPackage` returns `PackageExport { bytes, filename, mediaType }`
   and `apps/web` builds the `Blob` — `tsconfig.base.json` has `lib: ["ES2023"]` and is not
   widened (ADR-0019 D17), so `Blob`, `File` and `TextEncoder` have no type declarations inside
   the packages: produce the bytes without depending on a DOM-typed global. If an archive library
   is used at all it is added with `pnpm add -E` (or `scripts/check-pinned.mjs` fails on the
   range), into an existing workspace — `workspace-integrity.test.ts` pins exactly sixteen
   packages.
10. **The calendar entry is keyed by family, not by package version.** One entry per package
    family, idempotent (ADR-0019 D7). No date is `PLANNED` with `date === null` in the
    unscheduled tray behind «تعیین تاریخ»; a date makes it `PLANNED` with a date. ADR-0015 D5's
    set is not amended and nothing ever reads «published» because a date was chosen. A v2 package
    offers `updateCalendarPackage` as an explicit replace-linked-version action; creating a second
    entry is the A13 failure.
11. **Staleness is the freshness axis, not a review status.** A new upstream concept version
    marks only dependent latest outputs stale (ADR-0019 D5's separate `current | stale` field);
    historical approvals stay intact, the old package stays downloadable and labelled historical,
    current readiness is revoked, and p1's branch is untouched while S21 restages p2's. Show the
    impact list **before** creating the version — after is a fait accompli, not a choice.
12. **Events stay inside the closed taxonomy.** `AUDIT_EVENT_NAMES` is closed at 35 and
    `auditEventSchema` is `.strict()` with no `data` field (ADR-0019 D9): a new panel action never
    mints an audit name. `revision.requested`, `feedback.submitted` and `approval.decided` already
    exist; anything without a counterpart is a `null` row in the mapping table and a P8
    coordination item. `PanelEvent` carries the panel's own `type` and `data`; subscribers dedupe
    by `eventId` and ignore an older `aggregateRevision`.
13. **Degraded means scenario-driven.** Latency, offline, forbidden, retryable and non-retryable
    failure and conflict come from S13, S14, S22 and S23 — never from a random draw, a real timer
    or a network call. `Date.now` and `Math.random` stay unreachable from fixture and adapter code
    and the clock stays 2026-09-06T09:00:00Z (ADR-0019 D16), so a screenshot taken twice is the
    same screenshot.

## Blocked by

P5 (graph surfaces, whose review shortcuts were rendered disabled precisely so this ticket could
wire them, ADR-0019 D18). P1-R, P2, P3 and P4 are transitively complete; this ticket extends
`packages/mock-data` and the mock half of `packages/machine-gateway` under the one-ticket-at-a-time
frontier rule (ADR-0019 D20), so no parallel lane is touching them.

## Acceptance criteria

- [ ] **AC-P6.1 Four review commands, one path** — comment leaves the approval status unchanged
  (A05); approve binds exactly the current reviewable version; request changes requires a reason
  plus actionable feedback and queues regeneration for that card only; reject requires a reason.
  Each review affordance — card, sheet footer, global Reviews, inbox row, graph shortcut — issues
  exactly one `submitApproval` per `reviewItem`. *Seam: adapter-contract, component.*
- [ ] **AC-P6.2 The single write path is proven, not asserted** — replacing `submitApproval` with
  a rejecting stub leaves the decision list unchanged (ADR-0019 D19); a static check proves
  `ApprovalCommand` is constructed in exactly one module; `reviewItem` appears on no gateway
  interface; no gate verb exists as a run command anywhere. *Seam: adapter-contract, Seam F.*
- [ ] **AC-P6.3 Rejection routes** — «Reject and revise» keeps the concept id and produces a new
  version that returns to review without inheriting approval (A03); «Reject and replace» mints a
  new concept id with `replacesConceptId` while the original stays visible in history (A04);
  rejection never deletes and never starts an unreviewable loop; S24 leaves «continue» disabled
  and offers a replacement batch. *Seam: scenario, component.*
- [ ] **AC-P6.4 Targeted regeneration** — `requestRevision` creates a new version with prior
  versions byte-identical; revising o4 leaves o1 and o3 and their approvals untouched (A07, S18);
  a `research_refresh` preserves earlier source evidence and records a new attempt, while
  `retryStage` repeats S09's failed attempt with the same input and S10's non-retryable failure is
  refused with a stable code. *Seam: adapter-contract, scenario.*
- [ ] **AC-P6.5 Reject-and-revise durability** — the decision is recorded before regeneration is
  requested; with the revision forced to fail, exactly one decision exists, and retrying the
  revision adds none. *Seam: adapter-contract, scenario.*
- [ ] **AC-P6.6 Idempotency and conflict** — repeating a `commandId` returns the original receipt
  with no repeated effect; a stale `expectedRevision` is rejected as `REVISION_CONFLICT` with
  state untouched, the UI prompting a refresh and the typed feedback still present; a rapid double
  submit produces one run, one approval, one package and one calendar entry (A15, S22).
  *Seam: adapter-contract, component.*
- [ ] **AC-P6.7 Envelope and receipt discipline** — every outgoing command validates against
  `commandEnvelopeSchema` (commandId, workspaceId, actorId, closed-enum `actedAsRole`,
  expectedRowVersion) and every receipt against `commandReceiptSchema` with `origin`, `occurredAt`
  and `idempotencyKey` present and `status` one of ACCEPTED | SUCCEEDED | REJECTED; an ACCEPTED
  receipt never renders as completed. *Seam: Seam A.*
- [ ] **AC-P6.8 Automatic assembly** — the last required approval assembles a package keyed by
  project + included content-version ids + plan revision; unselected candidate concepts are absent
  from the denominator; assembly failure is retryable without regenerating content and the retry
  yields the same key, not a second family (A09, S19, S23). *Seam: adapter-contract, scenario.*
- [ ] **AC-P6.9 A real ZIP** — the export contains README, concept summaries and Bible reference,
  research index and coverage gaps, approved per-item Markdown, social and landing payload JSON,
  production briefs when selected, plus a synthesized `manifest.json`; entry count equals
  `files[]` plus one; bytes are non-empty and match the manifest; the download needs an explicit
  click; `exportPackage` returns `PackageExport` and only `apps/web` names `Blob`. *Seam:
  adapter-contract, Seam E.*
- [ ] **AC-P6.10 Calendar idempotence** — completing a package with a target date creates exactly
  one PLANNED entry linked to it (A11); without a date it lands in the unscheduled tray as PLANNED
  with `date === null` behind «تعیین تاریخ», and choosing a date places it (A10); a v2 package
  creates no second entry and offers replace-linked-version (A13); a scheduled historical version
  carries the outdated-content warning; no item ever reads «published». *Seam: scenario,
  component.*
- [ ] **AC-P6.11 Stale dependencies** — editing an approved upstream concept shows the impacted
  content before the new version is created, keeps historical approvals, marks only dependent
  latest outputs stale, revokes current readiness, leaves the old package downloadable as a
  labelled historical snapshot, and changes nothing in unrelated branches (A12, S21). *Seam:
  scenario.*
- [ ] **AC-P6.12 Degraded states, scenario-controlled** — latency, offline, forbidden, retryable
  and non-retryable failure each render their distinct truthful state; stale content stays visible
  with its last-sync timestamp and mutations are disabled with an explanation; a read-only actor's
  action is unavailable AND the command is rejected with no mutation, proven by calling the
  service directly (A16, S13, S14); timeout or offline while revising preserves feedback, fakes no
  success and its retry erases no history (A19). *Seam: scenario, component.*
- [ ] **AC-P6.13 One action, one event, every view** — the same decision from inbox, card and
  graph shortcut yields identical results and exactly one audit event, and updates card, inbox,
  counts, graph, package readiness, calendar and activity (A14); `PanelEvent` deliveries dedupe by
  `eventId`, ignore an older `aggregateRevision`, and unsubscribe stops delivery; no event name
  outside the closed 35 is emitted. *Seam: adapter-contract, Seam E.*
- [ ] **AC-P6.14 Checks green and nothing frozen moved** — `pnpm typecheck && pnpm lint &&
  pnpm test && pnpm test:e2e && pnpm build` pass; the verbatim MachineGateway check,
  workspace-integrity at sixteen packages, `check-pinned.mjs`, placeholder-purity over apps/worker
  and the eleven machine packages, and the ESLint boundary zones are all green; every mock receipt
  carries `origin: "MOCK"` and no UI copy claims real machine work occurred (18 §12). *Seam:
  Seam F.*
