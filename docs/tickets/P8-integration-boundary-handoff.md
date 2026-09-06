# Ticket P8 — Future integration mapping, unresolved contracts and the frontend handoff (hard stop)

```yaml
ticket_id: "P8"
title: "docs + packages/machine-gateway: record the ten open machine-team decisions, publish the provisional contract register, document the RealMachineGateway connection points as unimplemented seams, emit the final build report, and stop"
release: "P"
owner_lane: "contracts"
source_requirements:
  - "V2 03 §8 — document open decisions for the machine team: final DTO mapping and endpoint ownership; review policy; capability discovery; targeted regeneration/cancellation; input upload and extraction; immutable artifact access; event sequencing; live calendar persistence; source coverage metadata; run/product-stage mapping. No backend transport, token management, webhook receiver, queue, production schema migration or provider configuration is built now — only adapter interfaces, mappings and contract tests. Replacing mocks must not require redesigning cards, navigation, graph or calendar"
  - "V2 03 §1 — future real adapters are unimplemented connection points, not stubs returning fake production success; `mock/panel-contracts.ts` is an additive panel-oriented proposal, not a finalized machine API"
  - "V2 04 §3 — P8 scope: «future integration mapping, unresolved contracts and frontend handoff; stop before machine work»"
  - "V2 04 §5 — the final build report distinguishes implemented features, actual checks, remaining gaps and live-integration exclusions; include run commands, the preview URL when available and the selected demo scenario; do not claim E2E success if no browser run occurred; verify external network calls are absent in demo mode. After P8, hand off the frontend; machine work never starts automatically"
  - "V2 01 §5 — «Machine-stage identities remain external IDs from the workflow definition. Product stages must not renumber Machines 01–05 or claim a newly inferred mapping»"
  - "18 §9 — the RealMachineGateway connection: transport may be versioned HTTP, webhooks/events, queues or a combination, but transport details stay behind the adapter; the eight provisional integration capabilities; the twelve event families; the six payload envelope fields; and the closing rule — the panel may define provisional contracts and contract tests but «must not silently impose internal implementation choices on the machine system»"
  - "18 §11 step 8 and its hard stop — «Do not start machine implementation after step 8. Stop and hand off the completed panel for review»"
  - "18 §12 — the ten completion criteria, walked item by item as this ticket's exit review"
  - "16 §9 — the structured ticket handoff block"
adr_constraints:
  - "ADR-0019 D3 — PanelGateway keeps its seven read-only members and gains no mutation; the eight write capabilities live on PanelCommandGateway and targeted regeneration on RevisionGateway; MachineGateway gains no members, ever. All three are PROVISIONAL and are reported here, never imposed"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict() with no data field; PanelEvent is the panel's own subscription DTO, mapped through a null-tolerant table modelled on DOC18_EVENT_FAMILY_MAPPING; the mapping is «reported as a P8 coordination item». The subscription transport is PROVISIONAL: mock subscriptions now, polling/SSE deferred to the machine team's contract"
  - "ADR-0019 D12 — PRODUCT_STAGES is PROVISIONAL and orthogonal to STAGE_STATUSES and RUN_STATUSES; the run-stage-to-product-stage mapping is a null-tolerant table and «a named P8 open decision»; the panel does not renumber Machines 01–05 and claims no inferred mapping"
  - "ADR-0019 D20 — the frontier is P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8, strictly one at a time; «P8 remains a hard stop: after the handoff, machine work never starts automatically»"
  - "ADR-0019 D4 / ADR-0013 D1–D5 — ReviewApplicationService.reviewItem is a facade above the gateways, the sole constructor of ApprovalCommand, delegating to MachineGateway.submitApproval, and a member of no gateway interface; the absence of a second decision path is mechanically proven (D19), not asserted"
  - "ADR-0019 D6 — stored codes stay UPPER_SNAKE; the V2 lowercase literals are the mock-JSON wire form normalized at the loader boundary; the V2 capability and role strings are demo profiles mapped onto the closed CAPABILITIES and ACTOR_ROLES, neither of which gains a member"
  - "ADR-0019 D16 — the demo clock is 2026-09-06T09:00:00Z; Date.now and Math.random stay unreachable from fixture and adapter code; mock discovery rotates an authored finite batch table, never a PRNG"
  - "ADR-0018 D3 — apps/worker and the eleven machine-oriented packages are implementation-frozen through P8 and must be provably byte-identical to their ticket-0.1 placeholders"
  - "ADR-0014 D1 / ADR-0011 — the taxonomy is closed and may be extended only by a subsequent ADR; any future resolution of an OPEN row that amends recorded semantics needs a new ADR under the authority order, not a patch here"
  - "ADR-0017 D5 / ADR-0019 D2 — no PostgreSQL, Redis, queues, workers or providers; no backend at all. database_changes is None"
in_scope:
  - "docs/integration-boundary.md (new) — the machine team's document. Part 1: the RealMachineGateway connection points, one entry per MachineGateway member (18 §6) plus one per PanelGateway/PanelCommandGateway/RevisionGateway member, each naming the single DI composition module that swaps the adapter and the transport-behind-the-adapter rule. Part 2: the ten open decisions of V2 03 §8, each a question + the panel's provisional answer + what changes if the machine team rules otherwise. Part 3: the provisional contract register. Part 4: what is deliberately NOT built"
  - "docs/build-report-v2.md (new) — the V2 04 §5 final build report: implemented features, actual checks run with their evidence, remaining gaps, live-integration exclusions, the run commands, the preview URL when a browser run happened (and an explicit «no browser run» line when it did not), and the selected demo scenario"
  - "packages/machine-gateway/src/integration/** (new, inside the existing package) — provisional Zod schemas for the eight 18 §9 capabilities and the six-field payload envelope; the PanelEvent→AUDIT_EVENT_NAMES null-tolerant mapping table; the RUN_STATUSES/STAGE_STATUSES→PRODUCT_STAGES null-tolerant mapping table; the demo-profile mapping of V2 capability and role strings onto CAPABILITIES and ACTOR_ROLES; and the OPEN_DECISIONS register as tested data. Every export carries an explicit PROVISIONAL marker and its own version literal"
  - "tests/repo/integration-boundary.test.ts (new, Seam F) — completeness of docs/integration-boundary.md against the 18 §6 member list, the 18 §9 capability and envelope-field lists and the V2 03 §8 decision list; the no-RealMachineGateway-class check; the single-composition-module check; the no-CI advisory statement present in the build report"
  - "An adapter-substitution test proving the V2 03 §8 no-redesign claim: a second conformant in-memory adapter is injected through the one composition module, the P7 component and scenario suites re-run unchanged, and no file under apps/web/app/**, packages/workflow-ui/src/** or the calendar surface is touched"
  - "The 18 §12 ten-item completion checklist and the V2 04 §4 journeys A01–A20, each walked with an evidence link into P7's traceability table"
  - "The structured 16 §9 handoff closing the P-series and recording the hard stop"
  - "docs/tickets/README.md status column updated to done for P8 (no other edit)"
out_of_scope:
  - "Implementing RealMachineGateway, or any transport: HTTP client, webhook receiver, queue consumer, SSE endpoint, polling loop, token or credential management"
  - "Backend of any kind, production schema migration, provider configuration (V2 03 §8; ADR-0019 D2; ADR-0017 D5)"
  - "New workspace packages — workspace-integrity.test.ts pins exactly sixteen; the integration contracts live inside packages/machine-gateway"
  - "Adding any member to MachineGateway or PanelGateway; adding any name to AUDIT_EVENT_NAMES, CAPABILITIES, ACTOR_ROLES, APPROVAL_DECISIONS or the ADR-0015 D5 status sets"
  - "Resolving any OPEN row unilaterally, or closing a null in a mapping table to make a test green (18 §9 closing rule; ADR-0014 D1)"
  - "Any machine work whatsoever — Machines 01–05 are a separate build and do not start here or after here (18 §11; ADR-0019 D20)"
contracts_changed:
  - "Additive, provisional, inside packages/machine-gateway: the eight 18 §9 capability schemas, the payload envelope schema, three null-tolerant mapping tables (event, run-stage→product-stage, demo-profile) and the OPEN_DECISIONS register. MachineGateway is byte-frozen and untouched; PanelGateway keeps its seven read-only members; PanelCommandGateway (createProject, addComment, selectConcepts, amendOutputPlan, updateCalendar, updateCalendarPackage, exportPackage, subscribe) and RevisionGateway (requestRevision) are unchanged from P2 and are re-exported here only as register entries"
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None new. The boundary document records, as a contract requirement on the machine build rather
  than a panel-side enforcement point, that approval-result exchange must preserve ADR-0013:
  the single write path through MachineGateway.submitApproval, N distinct HUMAN approvers,
  mandatory non-null reasons, and self-approval constraints supplied by the policy DTO. Panel-side
  role checks are UX only and are never a security boundary (18 §4.2; V2 03 §5).
failure_states:
  - "An 18 §12 or A01–A20 item that cannot be evidenced is a blocking finding: the handoff is not issued until the item is green or the human owner records an explicit exception in the build report"
  - "A provisional contract that conflicts with recorded semantics is logged as an OPEN row — never patched by inventing a name or by widening a closed set"
  - "A check that was not run is reported as not run. pnpm test:db exits 0 through scripts/inert-gate.mjs and is reported as intentionally inert, never as a passing database suite; pnpm test:e2e is reported as passing only if a browser run actually occurred (V2 04 §5)"
test_seams:
  - "Seam A (contract fixtures): the eight capability schemas, the six-field envelope, and the three mapping tables — every table total over its key set, every null explicitly asserted as OPEN"
  - "adapter-contract seam: the P7 conformance suite green against the mock adapter and against the substitution adapter, documented as the bar RealMachineGateway must pass unchanged"
  - "component seam + scenario seam: re-run unchanged under the substitution adapter — this is what proves «no page-level redesign»"
  - "Seam E: the browser walkthrough that produces the build report's screenshots and preview URL"
  - "Seam F (repo): boundary-doc completeness, no RealMachineGateway declaration, single composition module, placeholder-purity over the twelve frozen workspaces, workspace-integrity at sixteen, verbatim-machine-gateway, vocabulary-parity, check-pinned.mjs, check-token-literals.mjs"
acceptance_criteria: "AC-P8.1 through AC-P8.12 — see the checkbox list below"
dependencies: ["P7"]
files_owned:
  - "docs/integration-boundary.md (new)"
  - "docs/build-report-v2.md (new)"
  - "packages/machine-gateway/src/integration/** (new; provisional schemas, mapping tables, OPEN_DECISIONS register and their contract tests)"
  - "packages/machine-gateway/src/index.ts (additive exports only)"
  - "tests/repo/integration-boundary.test.ts (new)"
  - "docs/tickets/README.md (status column only)"
handoff_required: true
```

## What to build

Not a surface — a boundary, a register and a stop. Tracer-bullet: a machine-build engineer who
has never opened this repository reads `docs/integration-boundary.md` and can state, without
asking anyone, (a) which single module they replace to connect a real system, (b) which
conformance suite their adapter must pass unmodified, (c) which contracts the panel invented
provisionally and is explicitly *not* imposing, and (d) which ten decisions are still theirs.
Alongside it, `docs/build-report-v2.md` says truthfully what was built, what was actually run,
what is missing and what is excluded.

Then the delivery stops. P8 is the last ticket in this repository under this scope.

### The ten open decisions (V2 03 §8)

Each is written as a question, the panel's provisional answer, and the cost of a different
ruling. The panel's answer is a *reading*, never a requirement on the machine build.

1. **Final DTO mapping and endpoint ownership.** *Who owns the wire shapes — this panel's DTOs
   or the machine system's?* Provisional: the machine system owns them; the panel's
   `panel-domain` schemas are a projection normalized at the adapter boundary, and V2's
   lowercase literals (`draft`, `in_review`, `approved`, `unscheduled`, `iran`) are the mock-JSON
   wire form only — stored codes are UPPER_SNAKE (ADR-0019 D6). *If ruled otherwise:* the
   normalization moves, but no closed enum changes; a machine-owned shape that needs a new code
   requires a new ADR, not a rename.
2. **Review policy and eligible-reviewer thresholds.** *Who computes eligible reviewers and the
   N-distinct-approver threshold?* Provisional: the policy DTO supplies them and the panel only
   renders them — it never computes a threshold, never invents a role count, and never resolves
   the recorded eight-roles-versus-seven conflict (V2 03 §5). Self-approval constraints and
   repeated-approvals-by-one-human-are-one-actor are preserved as presented facts. *If ruled
   otherwise:* the panel's presentation adapts; ADR-0013's single write path does not, and
   `reviewItem` stays the sole constructor of `ApprovalCommand`.
3. **Capability discovery.** *Is the capability set static or discovered at runtime?* Provisional:
   static and closed — `CAPABILITIES` has thirteen members, `ACTOR_ROLES` seven, and the V2
   strings (`concept.review`, `content.review`, `fa.editorial`, `comment.create`, `calendar.edit`,
   `read`) plus the demo roles (`demo_concept_reviewer`, `demo_fa_editorial`) are demo profiles
   mapped onto them (ADR-0019 D6). Machine discovery is `MachineGateway.listMachines()`.
   *If ruled otherwise:* the demo-profile table becomes the adapter's normalization point; adding
   a capability member needs a new ADR.
4. **Targeted regeneration and cancellation.** *Which endpoint performs a targeted revision, and
   which performs a cancellation?* Provisional: revision goes to the new
   `RevisionGateway.requestRevision`, never aliased to `retryStage` (a retry repeats a failed
   attempt with the same input; a revision applies new feedback and creates a new version —
   ADR-0019 D4). **Cancellation has no member at all**: `RUN_COMMAND_VERBS` names `CANCEL_RUN`
   and `RESUME_RUN`, `AUDIT_EVENT_NAMES` names `run.cancelled`, `run.resumed`, `stage.cancelled`
   and `stage.skipped`, and the byte-frozen `MachineGateway` has no method that can cause any of
   them. That gap is recorded, not closed. *If ruled otherwise:* a cancellation member lands on a
   machine-owned contract; it never lands on `MachineGateway`.
5. **Input upload and extraction.** *Who accepts the file, and who extracts its text?* Provisional:
   neither the panel nor this delivery. V2 01 §3 permits PDF/DOCX/MD/TXT metadata, 20 MB per file
   and five files, with no remote upload and no document extraction; URLs are HTTP(S)-only and are
   never fetched; ADR-0019 D2 forbids storing raw file bytes. *If ruled otherwise:* an upload
   endpoint and an extraction service are machine-side, and ADR-0016's SSRF policy binds every
   outbound fetch the moment one becomes real.
6. **Immutable artifact access.** *How does a client obtain artifact bytes?* Provisional: it does
   not. `MachineGateway.listArtifacts(runId)` returns `ArtifactSummary[]` — metadata only, no
   bytes and no signed URL. `PanelCommandGateway.exportPackage` returns a DOM-free
   `PackageExport { bytes, filename, mediaType }` assembled from panel-owned mock content
   (ADR-0019 D17), which is not machine artifact retrieval. *If ruled otherwise:* signed URL
   versus streamed bytes versus proxied download is the machine team's call; whichever it is, it
   stays behind the adapter and `tsconfig.base.json`'s `lib` is still not widened to DOM.
7. **Event sequencing and the subscription transport.** *What orders events, and how do they
   arrive?* Provisional: `PanelEvent` carries `aggregateRevision`; consumers dedupe by `eventId`
   and ignore an older `aggregateRevision` (V2 03 §4). Transport is **mock subscriptions now**;
   polling versus SSE is deferred to the machine team's contract (ADR-0019 D9). `heartbeat`
   remains a transport-only frame, never an audit event. *If ruled otherwise:* the subscription
   adapter changes; `AUDIT_EVENT_NAMES` stays closed at 35 and `auditEventSchema` stays `.strict()`
   with no `data` field either way.
8. **Live calendar persistence.** *Which system is the record of the calendar?* Provisional: the
   panel, as demo state only — creation is idempotent per package family, relinking a family to a
   new package version is an explicit update rather than a duplicate entry, `unscheduled` is
   `PLANNED` with `date === null`, and an item never reads "published" because a date was chosen
   (ADR-0019 D7). *If ruled otherwise:* the calendar gets a machine-side or third-system record;
   `CALENDAR_ITEM_STATUSES` is an ADR-0015 D5 set and is not amended to suit it.
9. **Source coverage metadata.** *Who computes coverage counts and gap classification?* Provisional:
   supplied, not computed — `Source.region` maps to `COVERAGE_CLASSES`
   (`IRANIAN_PERSIAN`, `INTERNATIONAL`) and V2's flat `Source.status` is split back onto
   `lifecycle`, `networkReachable` and `contentRetrievable` per 06 §5 (ADR-0019 D6). ADR-0018 D1
   already recorded that research sources and coverage gaps keep their fixtures and that their
   transport contract is an open P8 decision — this is that decision, still open. *If ruled
   otherwise:* the split does not collapse back to one field to match a fixture shape.
10. **Run-stage to product-stage mapping.** *Which machine run stage corresponds to which product
    stage?* Provisional: **unknown, and deliberately so.** `PRODUCT_STAGES`
    (`draft, concepts, research_content, package, calendar`) is orthogonal to `RUN_STATUSES` and
    `STAGE_STATUSES`; the mapping ships as a null-tolerant table with unmapped rows left `null`
    (ADR-0019 D12). Machine 01–05 identity comes only from the definition's optional machine
    number joined against `listMachines()` — never inferred from graph position (ADR-0019 D18).
    *If ruled otherwise:* the table gains values; the five product stages still do not renumber
    the five machines, and there is still no Machine 06.

### The provisional contract register

These are the panel's inventions. Each is listed with what it is, why it exists, and the explicit
statement that the machine build is free to reject it (18 §9 closing rule).

- **`PanelGateway`** — seven read-only members (`listPrograms`, `getProgram`, `listWeeklyLenses`,
  `getWeeklyLens`, `listApprovalRequests`, `listRetrievalRequests`, `listNotifications`). No
  mutation, by construction.
- **`PanelCommandGateway`** — eight members (`createProject`, `addComment`, `selectConcepts`,
  `amendOutputPlan`, `updateCalendar`, `updateCalendarPackage`, `exportPackage`, `subscribe`),
  created by ADR-0019 D3 so that `PanelGateway` could stay read-only.
- **`RevisionGateway`** — `requestRevision` only.
- **`PanelEvent`** and its null-tolerant mapping onto the closed `AUDIT_EVENT_NAMES`, alongside
  the existing `DOC18_EVENT_FAMILY_MAPPING` whose five `null` rows are already OPEN.
- **`PRODUCT_STAGES`** and its null-tolerant mapping from `RUN_STATUSES`/`STAGE_STATUSES`.
- **The demo-profile mapping** of the V2 capability and role strings onto `CAPABILITIES` and
  `ACTOR_ROLES`.
- Plus the ADR-0019 D10 envelope work: `commandEnvelopeSchema`, `commandReceiptSchema`'s
  tri-state `status`, and `GATEWAY_ERROR_REASONS`'s `REVISION_CONFLICT` (excluded from the
  retryable default — a conflict is resolved by refresh-then-resubmit, never blind retry).

The register also absorbs the contract-affecting findings P5, P6 and P7 deferred rather than
patched — each arrives with what it blocks, who decides it, and the ticket that raised it.

`MachineGateway` is **not** in this register. It is byte-frozen from 18 §6 and gains no members,
ever; `verbatim-machine-gateway.test.ts` compares it character-for-character against the fenced
`ts` block in doc 18 itself, so drift in either file is a red check.

Key mechanics:

1. **A stub that resolves is a lie.** V2 03 §1 requires unimplemented *connection points*, not
   "stubs returning fake production success", and 18 §12 requires that no UI state falsely claims
   a real machine operation occurred. The trap is writing
   `class RealMachineGateway implements MachineGateway` with bodies that `return Promise.resolve(…)`
   so `pnpm typecheck` goes green — that ships a gateway reporting `SUCCEEDED` with no machine
   behind it. **P8 ships no such class.** The connection point is a documented seam plus a Seam F
   check in `tests/repo/integration-boundary.test.ts` that fails if any non-comment, non-Markdown
   source declares the identifier.
2. **The no-redesign claim is verified, not asserted.** V2 03 §8 says replacing the mocks must not
   require redesigning cards, navigation, graph or calendar. Prove it three ways: the mock adapter
   is constructed in exactly **one** composition module (a Seam F check asserts the mock factory
   identifier appears in exactly one non-test source file); a substitution test injects one further
   conformant adapter — beyond the four P7 already runs the suites against — through that module
   and re-runs the P7 component and scenario suites **unchanged**; and the ESLint boundary zones
   already forbid the shortcut — the committed
   fixtures `tests/repo/boundary-fixtures-bad/component-imports-mock-data.ts` and
   `component-imports-panel-fixtures.ts` prove a component reaching a fixture is rejected.
3. **Every `null` in a mapping table stays `null`.** `DOC18_EVENT_FAMILY_MAPPING` in
   `packages/panel-domain/src/vocabulary/events.ts` already carries four: `workflow.run.created`
   (the taxonomy starts at `run.started`), `workflow.stage.progressed` (no intra-stage progress
   event), `workflow.stage.blocked` (the recorded model splits it into `stage.waiting_for_input`
   and `stage.waiting_for_approval`) and `workflow.stage.failed` (split into
   `stage.failed_retryable` and `stage.failed_final`). The reverse direction is unmapped too:
   `run.paused`, `run.resumed`, `run.cancelled`, `stage.queued`, `stage.skipped` and
   `stage.cancelled` exist in the taxonomy and appear in no 18 §9 family, and `heartbeat` is
   transport-only. The trap is closing a `null` by appending a name to `AUDIT_EVENT_NAMES` so a
   completeness test goes green. That fails `vocabulary-parity.test.ts` and
   `packages/panel-domain/src/vocabulary/vocabulary.test.ts`, and it violates ADR-0014 D1 and
   ADR-0019 D9. The set stays at **35**. Closing a row is a new ADR after coordination.
4. **`PanelEvent` is a distinct DTO, not an audit event.** `auditEventSchema` is `.strict()` and
   has no `data` field; `PanelEvent` has one. Do not reconcile them by loosening the audit schema.
   The two live side by side, joined only by the null-tolerant table.
5. **The register is tested data, not prose.** `OPEN_DECISIONS` and the three mapping tables are
   exported constants with exact-membership tests: a provisional contract added without a register
   row, or a mapping key added without a value or an explicit `null`, fails a Seam A test. Prose
   alone drifts silently; that is the whole reason 18 §9 exists.
6. **Report what ran, and only what ran.** `pnpm test:db` is `node scripts/inert-gate.mjs test:db 0.4`
   — it prints a notice and exits 0. Recording it as "passed" would claim database coverage that
   does not exist; record it as **intentionally inert** (no database in scope, ADR-0019 D2).
   `pnpm test:e2e` runs `pnpm --filter @drop/web build && playwright test`; V2 04 §5 forbids
   claiming E2E success if no browser run occurred. `apps/web` has **no `dev` script** — the
   preview comes from the standalone build (`output: "standalone"` in `apps/web/next.config.ts`);
   if no server was started, the report says "no preview URL — no browser run", it does not invent
   one.
7. **No CI exists. Say so.** There is no `.github/` directory and no workflow file anywhere in the
   repository. Every guard in this build — `check-pinned.mjs`, `check-token-literals.mjs`,
   `placeholder-purity.test.ts`, `workspace-integrity.test.ts`, `verbatim-machine-gateway.test.ts`,
   `vocabulary-parity.test.ts`, `logical-properties.test.ts`, `dependency-direction.test.ts`,
   `eslint-zone-terminality.test.ts` and the adapter conformance suite — is **advisory** until a
   human runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm test:e2e` and
   `pnpm build`. The handoff states this plainly as a standing risk; a green run at handoff time
   is evidence about that moment and nothing more.
8. **React Flow Pro stays unlicensed and unused.** The graph was built on open-source
   `@xyflow/react` with DROP-owned nodes and edges in `packages/workflow-ui` (18 §3; ADR-0019
   consequences). The Pro *AI Workflow Editor* template was a layout and interaction reference
   only; its AI execution layer was never imported and no Pro source was vendored. The license
   gate (15 §12; CLAUDE.md open client gates) therefore remains **open with its fallback intact**
   — record it as such rather than as closed.
9. **The twelve stay inert and the five stay numbered.** `tests/repo/frozen-set.manifest.json`
   hashes exactly twelve workspaces — `packages/{core,studio,contracts,db,pipeline,ai-gateway,retrieval,storage,config,observability,testing}`
   and `apps/worker` — against commit `3f58cf8`; `placeholder-purity.test.ts` must be green at
   handoff. `workspace-integrity.test.ts` pins **exactly sixteen** packages, so the integration
   contracts go inside `packages/machine-gateway/src/integration/`, never into a new workspace.
   Machines 01–05 were never renumbered and no Machine 06 was introduced (ADR-0019 D18;
   V2 01 §5; CLAUDE.md non-negotiables) — confirm both in the report.
10. **Adding a dependency here would be a smell, and must still be exact.** P8 needs none. If one
    is unavoidable, it is added with `pnpm add -E`; `scripts/check-pinned.mjs` fails any range that
    is not exact semver, and `pnpm lint` runs it.
11. **Stop.** 18 §11 and ADR-0019 D20: after the handoff, machine work never starts automatically —
    not in this repository, not in this delivery, regardless of frontier availability. The next
    action is a human review and machine-build coordination.

## Blocked by

P7. The 18 §12 checklist and the A01–A20 journeys can only be evidenced against a fully hardened
panel, and the adapter-substitution proof re-runs P7's component and scenario suites.

## Acceptance criteria

- [ ] **AC-P8.1 Ten open decisions** — `docs/integration-boundary.md` states each of the V2 03 §8
  decisions as a question, the panel's provisional answer, and what changes under a different
  ruling; a Seam F test fails if any of the ten V2 03 §8 topics is missing. *Seam: F.*
- [ ] **AC-P8.2 Provisional register** — the register lists `PanelGateway` (seven read-only
  members), `PanelCommandGateway` (eight), `RevisionGateway` (`requestRevision`), `PanelEvent` and
  its mapping, `PRODUCT_STAGES` and its mapping, and the demo-profile capability/role mapping, each
  marked PROVISIONAL and each stating that the machine build may reject it; `MachineGateway` is
  recorded as byte-frozen and absent from the register. *Seam: A, F.*
- [ ] **AC-P8.3 Connection points, not stubs** — every `MachineGateway` member of 18 §6 and every
  panel-contract member has a per-method connection note naming the single DI composition module
  and the transport-behind-the-adapter rule; no source file declares a `RealMachineGateway` class,
  proven by a Seam F check. *Seam: F.*
- [ ] **AC-P8.4 No redesign, proven** — the mock factory is constructed in exactly one non-test
  source file; a second conformant adapter injected there makes the P7 component and scenario
  suites pass **unchanged**, with no edit under `apps/web/app/**`, `packages/workflow-ui/src/**`
  or the calendar surface. *Seam: component, scenario, adapter-contract.*
- [ ] **AC-P8.5 Capabilities and envelope** — provisional Zod schemas exist for all eight 18 §9
  capabilities and for the payload envelope requiring schema version, event ID, occurred-at,
  correlation/run ID and workspace ID, with originating machine/version where applicable; contract
  tests reject a payload missing any required field; every export carries a PROVISIONAL marker and
  its own version literal. *Seam: A.*
- [ ] **AC-P8.6 Closed sets stay closed** — `AUDIT_EVENT_NAMES` is still 35 and `auditEventSchema`
  still `.strict()` with no `data` field; `CAPABILITIES`, `ACTOR_ROLES`, `APPROVAL_DECISIONS` and
  the ADR-0015 D5 status sets gained no member; every mapping table is total over its key set with
  each unmapped row an explicit `null` marked OPEN, and a test fails if a `null` is silently
  closed. *Seam: A, F.*
- [ ] **AC-P8.7 Single approval path, still proven** — the D19 invariant holds at handoff:
  `reviewItem` is the sole constructor of `ApprovalCommand`, exactly one `submitApproval` fires per
  `reviewItem`, and replacing `submitApproval` with a rejecting stub leaves the decision list
  unchanged. *Seam: adapter-contract.*
- [ ] **AC-P8.8 Completion checklist** — the ten 18 §12 criteria and the twenty V2 04 §4 journeys
  A01–A20 are each walked with an evidence link into P7's traceability table; every item is green
  or carries a human-owner-recorded exception; the walk is included in the build report.
  *Seam: F.*
- [ ] **AC-P8.9 Honest build report** — `docs/build-report-v2.md` separates implemented features,
  actual checks run with evidence, remaining gaps and live-integration exclusions; it lists the run
  commands, the selected demo scenario, and the preview URL when a browser run occurred (otherwise
  an explicit "no browser run" line); `pnpm test:db` is recorded as intentionally inert, never as
  passing; it confirms no external network call occurred in demo mode and that the demo clock is
  `2026-09-06T09:00:00Z` with `Date.now` and `Math.random` unreachable from fixture and adapter
  code. *Seam: E, F.*
- [ ] **AC-P8.10 Not built, on the record** — the report states that no backend transport, token
  management, webhook receiver, queue, production schema migration or provider configuration was
  built, and that the standing risk is the absence of CI: every guard is advisory unless a human
  runs `pnpm typecheck / lint / test / test:db / test:e2e / build`. It also records the React Flow
  position — open-source `@xyflow/react` with DROP-owned nodes, the Pro template's AI execution
  layer never imported, the Pro license gate still open with its fallback intact. *Seam: F.*
- [ ] **AC-P8.11 Frozen and unrenumbered** — `placeholder-purity.test.ts` proves the twelve frozen
  workspaces are byte-identical to their ticket-0.1 placeholders; `workspace-integrity.test.ts`
  still counts exactly sixteen packages; `verbatim-machine-gateway.test.ts` is green; the report
  confirms Machines 01–05 were never renumbered and no Machine 06 was introduced.
  `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` green. *Seam: F.*
- [ ] **AC-P8.12 Hard stop** — the 16 §9 structured handoff closes the P-series, names the next
  permitted ticket as **none**, and records the 18 §11 / ADR-0019 D20 hard stop: the next step is
  human review and machine-build coordination, and machine work never starts automatically.
  *Seam: F.*
