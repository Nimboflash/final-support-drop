```yaml
ticket_id: "P8"
title: "Integration boundary handoff: RealMachineGateway connection points, provisional contracts, event mapping, and the doc-18 completion checklist"
release: "P"
owner_lane: "contracts"
source_requirements:
  - "18 §9 future connection to the real machines: capability list, event families, payload envelope fields, and the closing rule — the panel may define provisional contracts and contract tests but must not silently impose internal choices on the machine system"
  - "18 §11 step 8 and the hard stop: 'Do not start machine implementation after step 8. Stop and hand off the completed panel for review'"
  - "18 §12 acceptance criteria — evaluated item by item as this ticket's exit review"
  - "ADR-0014 D1 (the closed run-execution event taxonomy the mapping targets); ADR-0012 D2/D3 (state and aggregation vocabulary the contracts carry); ADR-0013 (approval exchange semantics)"
adr_constraints:
  - "ADR-0017 D4: the ADR-0012 state machine and ADR-0014 event taxonomy are the provisional contract set of 18 §9; the panel may rely on them but must not impose them on the machine build without coordination (18 §9 last paragraph) — divergences are recorded as OPEN decisions, never silently reconciled"
  - "ADR-0014: the taxonomy is closed and may be extended only by a subsequent ADR — no event from the 18 §9 list is added to it here; unmatched families stay OPEN"
  - "ADR-0017 D3/D5: no machine implementation packages, no transport code, no provider SDKs, no queues; the three panel packages plus frozen placeholders remain the entire repository boundary"
  - "ADR-0011: any future resolution of an OPEN decision that amends recorded semantics requires a new ADR under the authority order"
in_scope:
  - "docs/integration-boundary.md (new): the RealMachineGateway connection points — where dependency injection swaps the adapter, configuration surface, per-method notes for every MachineGateway method, and the rule that transport details (HTTP, webhooks/events, queues, or a combination) stay behind the adapter (18 §9)"
  - "Provisional Zod contracts in packages/machine-gateway for the eight 18 §9 capabilities: machine/capability discovery; workflow-definition retrieval; run creation and command submission; run and stage status retrieval; artifact metadata and secure artifact access; approval request and approval-result exchange; event subscription or polling fallback; health, version, and compatibility reporting"
  - "The 18 §9 event-family list mapped onto the ADR-0014 taxonomy in a two-way table, every row Mapped or OPEN — divergences flagged, not reconciled: e.g. workflow.stage.progressed and approval.resolved have no ADR-0014 twin; naming prefixes differ (workflow.run.* vs run.*); workflow.stage.blocked corresponds to no single event (BLOCKED is a UI category over WAITING_* + reason codes per ADR-0012 D4); workflow.run.created and artifact.created are outside the closed run-execution taxonomy; run.paused, run.resumed, run.cancelled, stage.queued, stage.skipped, stage.cancelled exist in ADR-0014 but not in the 18 §9 list"
  - "Provisional payload envelope schema carrying exactly the 18 §9 fields: schema version, event ID, occurred-at timestamp, correlation/run ID, workspace ID, and originating machine/version where applicable"
  - "Contract tests pinning every provisional shape (capability contracts, envelope, event mapping completeness) so drift is detected, plus the adapter-contract suite (P7) documented as the conformance bar RealMachineGateway must pass unchanged"
  - "The 18 §12 completion checklist evaluated item by item with evidence links (test names, P7 traceability table, screenshots)"
  - "The consolidated list of unresolved contract decisions for the machine-build coordination, each with what it blocks and who decides"
  - "The structured handoff closing the P-series, recording the hard stop"
out_of_scope:
  - "Implementing RealMachineGateway or any transport (HTTP client, webhook receiver, queue consumer)"
  - "Creating machine implementation packages (18 §10, ADR-0017 D3)"
  - "Finalizing machine-owned schemas or resolving any OPEN divergence unilaterally (18 §9)"
  - "Extending the ADR-0014 taxonomy — that requires a subsequent ADR after coordination"
  - "Any work beyond the handoff: Machine 01–05 work is a separate build and does not start here (18 §11)"
contracts_changed:
  - "Provisional integration contracts added in packages/machine-gateway, explicitly versioned and marked provisional/non-final per 18 §9; the P2 panel DTOs are unchanged"
database_changes: "None — panel scope has no database (ADR-0017 D5)"
permission_requirements:
  - "None new. The boundary document records that approval-result exchange must preserve the ADR-0013 semantics (single write path, N distinct HUMAN approvers) when the real gateway connects — as a documented contract requirement, not panel-side enforcement"
failure_states:
  - "An 18 §12 checklist item that cannot be evidenced is a blocking finding: the handoff is not issued until the item is green or the human owner records an explicit exception"
  - "A provisional contract found to conflict with recorded semantics (ADR-0012/0013/0014) is itself logged as an OPEN decision — never patched by inventing new names"
test_seams:
  - "Seam A: fixture-based contract tests for the eight capability contracts, the payload envelope (all six fields required), and the event-mapping table's completeness in both directions"
  - "Adapter-contract seam: the P7 conformance suite green against MockMachineGateway, documented as RealMachineGateway's acceptance bar"
  - "Seam F: repository checks proving no machine package, transport code, or provider SDK entered; placeholder purity green; docs/integration-boundary.md present and complete against the 18 §9 capability and field lists"
acceptance_criteria:
  - "See checkbox list in the body; each maps to a named seam"
dependencies: ["P7"]
files_owned:
  - "docs/integration-boundary.md (new)"
  - "packages/machine-gateway/src/integration/** (provisional capability, envelope, and event-mapping schemas plus their contract tests)"
handoff_required: true
```

# Ticket P8 — Integration boundary handoff

## What to build

The panel's final ticket: not a surface but a boundary. Tracer-bullet: a machine-build
engineer who has never seen this repository reads `docs/integration-boundary.md` and can say
exactly (a) where their `RealMachineGateway` plugs in, (b) which conformance suite it must
pass unchanged, (c) which contracts are provisional and which decisions are still theirs to
make. Alongside it, the 18 §12 completion checklist is evaluated item by item with evidence,
and the P-series closes with a structured handoff.

The three deliverables:

1. **Connection points.** Where DI swaps `MockMachineGateway` for `RealMachineGateway`,
   per-method notes for the full 18 §6 interface, and the adapter rule: the final transport
   may be versioned HTTP, webhooks/events, queues, or a combination, but transport details
   never leak past the adapter (18 §9).

2. **Provisional contracts, honestly labelled.** Zod schemas for the eight 18 §9
   capabilities and the payload envelope (schema version, event ID, occurred-at,
   correlation/run ID, workspace ID, origin machine/version), each pinned by contract tests
   so drift is loud. The event-family mapping confronts the 18 §9 list with the closed
   ADR-0014 taxonomy in both directions and marks every divergence **OPEN** rather than
   reconciling it — per the last paragraph of 18 §9, the panel must not silently impose its
   internal choices on the machine system. Known OPEN rows at minimum:

   - `workflow.stage.progressed` — no ADR-0014 twin (ADR-0014 has no intra-stage progress
     event);
   - `approval.resolved` — no ADR-0014 twin; the recorded approval events are
     `approval.requested`/`approval.decided` emitted from the ADR-0013 single write path;
   - naming prefix: `workflow.run.*` / `workflow.stage.*` (18 §9) vs `run.*` / `stage.*`
     (ADR-0014);
   - `workflow.stage.blocked` — BLOCKED is a UI category over `WAITING_*` states plus reason
     codes (ADR-0012 D4), so one 18 §9 family fans out over several ADR-0014 events
     (`stage.waiting_for_input`, `stage.waiting_for_approval`);
   - `workflow.stage.failed` / `workflow.stage.completed` — single families where ADR-0014
     distinguishes `stage.failed_retryable`/`stage.failed_final` and names success
     `stage.succeeded`;
   - `workflow.run.created` and `artifact.created` — outside the closed run-execution
     taxonomy (ADR-0014 emits nothing before `run.started`, and no artifact event);
   - `run.paused`, `run.resumed`, `run.cancelled`, `stage.queued`, `stage.skipped`,
     `stage.cancelled` (and the transport-only `heartbeat`) — present in ADR-0014, absent
     from the 18 §9 list.

   Resolving any row requires machine-build coordination and, where recorded semantics are
   amended, a subsequent ADR (ADR-0011, ADR-0014's closing rule).

3. **Completion and stop.** The 18 §12 checklist walked item by item with evidence links
   (P7's traceability table carries most of the weight), the unresolved-decisions register,
   and the structured handoff. **HARD STOP (18 §11): after this ticket the panel is handed
   off for review. Machine implementation does not start — not in this repository, not in
   this delivery, regardless of frontier availability.**

## Blocked by

P7. The completion checklist can only be evidenced against a fully hardened panel.

## Acceptance criteria

- [ ] `docs/integration-boundary.md` documents the DI swap point, configuration surface, and
      per-method connection notes for every `MachineGateway` method of 18 §6, and states the
      transport-behind-the-adapter rule — Seam F (completeness checked against the 18 §6 and
      18 §9 lists).
- [ ] Provisional Zod contracts exist for all eight 18 §9 capabilities, each explicitly
      marked provisional/non-final with its own version, each with fixture-based contract
      tests — Seam A.
- [ ] The payload envelope schema requires schema version, event ID, occurred-at,
      correlation/run ID, and workspace ID, with origin machine/version where applicable;
      contract tests reject payloads missing any required field — Seam A.
- [ ] The event-mapping table covers all twelve 18 §9 families and all ADR-0014 D1 events
      (plus `heartbeat`) in both directions; every row is Mapped or OPEN; at minimum
      `workflow.stage.progressed` and `approval.resolved` are OPEN; the mapping is encoded as
      tested data so an unmapped addition fails a test; no event is added to the ADR-0014
      taxonomy — Seam A.
- [ ] The P7 adapter-contract suite is documented as the acceptance bar `RealMachineGateway`
      must pass unchanged, and runs green against `MockMachineGateway` at handoff —
      adapter-contract seam.
- [ ] The 18 §12 checklist is evaluated item by item with evidence links; every item is green
      or carries a human-owner-recorded exception; the evaluation is included in the
      handoff — Seam F.
- [ ] The unresolved-contract-decisions register lists every OPEN item (event mapping rows,
      gateway command-surface gaps recorded by P6, DTO gaps recorded by P5–P7), each with
      what it blocks and the coordination needed — Seam F.
- [ ] No machine implementation package, transport code, queue, or provider SDK entered the
      repository; placeholder-purity, workspace-integrity, and dependency checks green
      (ADR-0017 D3/D5) — Seam F.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` green —
      Seam F.
- [ ] The structured handoff closes the P-series and records the 18 §11 hard stop: the next
      step is human review and machine-build coordination, not machine work — Seam F.
