# Ticket P10 — Wire the machine to the panel: transport, a read-only world, then writes

```yaml
ticket_id: "P10"
title: "packages/machine-gateway + apps/web: reach the concept-portfolio service over HTTP through a same-origin proxy, render a live session as a PanelSnapshot, show it in Engine, and then let the panel's review and revision commands drive the machine"
release: "P"
owner_lane: "integration"
source_requirements:
  - "The owner's instruction (2026-09-10): develop the core machine on v2, wire it in, bring the system up, and have Engine show the workflow"
  - "services/concept-portfolio/README.md — the six endpoints and the five-call flow: create → generate → respond(n) → approve → build"
  - "docs/handoff/P8-frontend-to-machine-build.md §4 — the connection points: `createMockWorld` is the one constructor, `apps/web/lib/demo/session.ts` is the one composition root, and a real adapter must pass the exported conformance suites UNMODIFIED"
  - "docs/handoff/P8-frontend-to-machine-build.md §2 — the ten open decisions, which stop being hypothetical for Machines 01–02"
  - "18 §9 — transport stays behind the adapter; the panel may define provisional contracts but must not silently impose internal implementation choices on the machine system"
adr_constraints:
  - "ADR-0021 D1 — the machine build is open on `v2` only. `main` keeps doc 18 §11's hard stop and it stays true of v1"
  - "ADR-0021 D3 — scope is Machines 01 and 02. No Machine 03–05, no PostgreSQL, no Redis, no queue, no worker. The twelve frozen workspaces stay inert and placeholder-purity still guards them"
  - "ADR-0021 D4 — MachineGateway gains no members; PanelGateway keeps its seven read-only members; approval keeps its single write path; NO new workspace package; the adapter passes the conformance suites unmodified"
  - "ADR-0021 D5 — the mock world stays and stays DEFAULT. The real machine is an additional adapter selected by configuration; absent that selection the panel behaves exactly as it does on `main`"
  - "ADR-0021 D6 — the machine's vocabulary meets the panel's in ONE projection module. No enum member is invented and no closed set is widened"
  - "ADR-0021 D7 — the machine returns English into a Persian-only interface. This is an OPEN decision and this ticket does not resolve it"
  - "ADR-0019 D3 — MachineGateway is byte-frozen; verbatim-machine-gateway.test.ts proves it character-for-character"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict(). Machine lifecycle goes to PanelEvent with a null row in PANEL_EVENT_AUDIT_MAPPING, never to a new audit name"
  - "ADR-0019 D16 — the demo clock stays fixed for the MOCK world. Determinism is a property of that world and does not extend to a live service; determinism.test.ts still forbids Date.now inside the contract packages, so a real clock is injected from the composition root"
  - "ADR-0013 D1 — ReviewApplicationService.reviewItem is the sole constructor of ApprovalCommand and delegates to MachineGateway.submitApproval. The machine's own approve endpoint sits UNDERNEATH that path, never beside it"
  - "ADR-0020 D5 — the interface speaks the user's units. Machine output is DATA, not interface chrome, so interface-language.test.ts does not fail on it — and that is exactly why a person must look at the screen rather than at the test result"
in_scope:
  - "apps/web/app/api/machine/[...path]/route.ts — a same-origin proxy. MANDATORY, not a convenience: the service ships no CORS middleware (OPTIONS /sessions returns 405, no access-control-allow-origin header) so a browser fetch is blocked outright, and it has NO authentication of any kind, so this route is the only thing between the open internet and a service that spends the owner's model budget per request. Allow-list the six paths by regex; never forward a client-supplied URL; never expose DROP_MACHINE_BASE_URL to the client bundle"
  - "packages/machine-gateway/src/real/machine-http-port.ts — the port type. No transport, no URL, no fetch: panel-contract-invariants.test.ts keeps the contract packages transport-free, and determinism.test.ts forbids a clock there"
  - "packages/machine-gateway/src/real/machine-client.ts — six typed calls over the injected port, decoding BOTH `detail` shapes (a string on 400/404, an array on 422) and the four precondition strings the service raises; a session-id guard of ^[a-f0-9]{12}$ before any path interpolation"
  - "packages/machine-gateway/src/real/panel-world.ts — the PanelWorld supertype the composition root selects on, plus the local approval-surface type. Declared in a NEW file: mock-world.ts is what 24 scenarios, the visual baselines and every existing e2e run through, and ADR-0021 D5 says it is not allowed to break"
  - "packages/machine-gateway/src/real/real-world.ts — the adapters over one cached session. Slice 1: getSnapshot works and every other member throws a typed GatewayError"
  - "apps/web/lib/demo/session.ts — a two-branch selection on configuration. REAL mode supplies a real clock, the browser port, the text renderer and a NULL persistence: real machine state must never be written under a mock-discriminated browser key"
  - "apps/web/lib/demo/providers.tsx — a bounded refetch in REAL mode. Today's `staleTime: Infinity, refetchOnWindowFocus: false` is correct for a deterministic local world and silently fatal for a live one: a machine job completes and Engine never notices"
  - "The demo marker (apps/web/app/studio/layout.tsx) telling the truth in each mode, and the Settings Reset control disabled with an on-screen reason in REAL mode — no-inert-controls.test.ts exists precisely to stop a control that does nothing"
  - "Slice 2: a per-session write queue, submitApproval → POST /concepts/{id}/approve, requestRevision → POST /concepts/respond, and the review-path conformance suite run UNMODIFIED against a fake machine"
  - "docs/handoff/P10-machine-wiring.md — what was wired, what was refused, and every open decision reached"
out_of_scope:
  - "Machines 03 Synthesis, 04 Production and 05 Handoff. ADR-0021 D3 opens 01 and 02 only"
  - "PostgreSQL, Redis, queues, workers, or any infrastructure doc 18 §5 defers"
  - "Connecting a real AI provider. The provider gate (doc 15 §12) stays open and the service runs on its deterministic backend"
  - "Resolving ADR-0021 D7 (the language of machine output), OD-2 (packages and calendar), OD-5 (the two reading categories) or OD-6 (a generation axis for concepts). Each needs the owner"
  - "Widening `packageSnapshotSchema.isMock`. Until that is ruled on, a machine snapshot carries no package and no calendar entry"
  - "Adding a member to MachineGateway, PanelGateway, AUDIT_EVENT_NAMES, OUTPUT_TYPES, PRODUCT_STAGES or any recorded set"
  - "Editing packages/machine-gateway/src/mock/mock-world.ts"
contracts_changed:
  - "Additive only, inside packages/machine-gateway: the port type, the client, the PanelWorld supertype and the real world. panelSnapshotSchema.snapshotKind was already widened to an enum by the projection commit (ADR-0021); nothing else in panel-domain moves. MachineGateway stays byte-frozen"
database_changes: "None. The machine persists to its own run directory; the panel persists nothing in REAL mode."
permission_requirements: >
  The service has NO authentication. The proxy route is therefore a security
  boundary, not plumbing: it allow-lists paths, refuses client-supplied URLs, and
  is the only holder of the base URL. Panel-side role checks remain UX only and
  are never a security boundary; approval semantics are unchanged and still ride
  the single write path.
failure_states:
  - "The service is unreachable, or answers 500: a typed GatewayError with reason MACHINE_SYSTEM_DISCONNECTED, which the panel already renders as a degraded banner over stale content rather than an empty page"
  - "A session id that is not 12 hex characters is refused before it reaches a path. The service uses it as a filesystem path segment WITHOUT validating it"
  - "The machine has NO error state in its status enum: when a stage throws, the persisted status is unchanged and the failure exists only in the HTTP response. A failed build is indistinguishable from one never attempted on a later read, so the adapter must carry failure itself"
  - "A double-submit appends a second concept round and doubles spend — `generate` has no precondition of any kind. The write queue is not an optimisation"
  - "A check that was not run is reported as not run"
test_seams:
  - "Seam A (contract): machine-wire schemas with accepting and rejecting fixtures — LANDED with the projection"
  - "Seam A (projection): projectMachineSession against a real captured session — LANDED, 21 cases"
  - "adapter-contract seam: createReviewPathConformanceSuite run UNMODIFIED against the real world over a fake machine, a fresh session per case"
  - "Seam E (browser): a live session rendered in Engine, and the demo marker honest in both modes"
  - "Seam F (repo): the proxy allow-list, no base URL in the client bundle, no Date.now inside the contract packages, MachineGateway still byte-identical"
acceptance_criteria: "AC-P10.1 through AC-P10.12 — see the checkbox list below"
dependencies: ["P9"]
files_owned:
  - "apps/web/app/api/machine/[...path]/route.ts (new)"
  - "apps/web/lib/machine/** (new)"
  - "packages/machine-gateway/src/real/** (new)"
  - "packages/machine-gateway/src/index.ts (additive exports only)"
  - "apps/web/lib/demo/{session.ts,providers.tsx}"
  - "apps/web/app/studio/layout.tsx and apps/web/app/studio/settings/page.tsx (mode-aware honesty only)"
  - "tests/repo/machine-boundary.test.ts (new)"
  - "docs/handoff/P10-machine-wiring.md (new)"
handoff_required: true
```

## What to build

The panel was designed around this moment. `docs/handoff/P8-frontend-to-machine-build.md` §4 promised that a real system replaces `createMockWorld` and **nothing above it changes** — and the projection commit has already shown the strongest form of that promise holding: a real captured machine session renders as **46 Engine nodes, 67 edges and five REVISION edges** with no change to `buildProductGraph` at all.

What remains is the transport and the writes.

Tracer-bullet: a person sets the mode to REAL, opens `/studio/engine?session=<12 hex>`, and sees a live machine session drawn as a real workflow — then approves a concept in the panel and watches the machine's own state change.

### Slice 1 — read-only, and it is the whole of the visible win

Everything in this slice is achievable with no write path, no queue, no governance amendment and no ruling from the owner.

1. **The proxy.** The service has no CORS and **no authentication**. A browser cannot call it, and nothing but this route stands between the open internet and a service that spends money per request. Allow-list the six paths; never forward a client-supplied URL; keep the base URL server-side.
2. **The client.** Six typed calls over an injected port. Decode both `detail` shapes — a string on 400/404 and an array on 422 — because a decoder that assumes either throws on the other. Guard the session id before interpolating it into a path.
3. **The read-only world.** `getSnapshot()` fetches, projects and returns. Every other member throws a typed `GatewayError`, loudly, rather than pretending to succeed.
4. **The composition root.** One two-branch selection. The mock world stays default and untouched.
5. **The refetch.** `staleTime: Infinity` is right for a deterministic local world and wrong for a live one. Without a bounded refetch, a machine job finishes and Engine never notices.
6. **The marker.** «حالت نمایشی» is a lie in REAL mode. It must say which world it is showing, and Reset must be disabled with a visible reason rather than left inert.

**At the end of slice 1** a person sees INPUT → CONCEPT_GENERATION → concept reviews awaiting them, each labelled with a real machine title, and after a refine round a REVISION edge labelled «بازنگری» looping back — drawn from real machine data with no fixture anywhere.

### Slice 2 — writes

`submitApproval` and `requestRevision` reach the machine, underneath the panel's existing single write path.

**The write queue is not an optimisation.** Every machine method is load → mutate → whole-file overwrite with no lock and no version check, and FastAPI runs those synchronous endpoints on a threadpool, so real parallelism exists. Concurrent `respond` calls were observed destroying rounds while every response returned 200. Without a per-session queue, a double-click on refine starts eating the user's work and no test in this repository would notice.

### Slice 3 — blocked on rulings

Packages, the calendar and export need OD-2. The concept-generation axis needs OD-6. The two reading categories need OD-5. None of it starts before the ruling.

## What the machine will do to you

Found by reading its source and by running it, not by assuming. Build against these:

| Behaviour | Consequence for the panel |
|---|---|
| `status` is written but **never read as a guard**, and it regresses — `respond` after a portfolio is built sets it back to `CONCEPTS_READY` while leaving the portfolio in place | Derive stage from facts. Already done in the projection |
| `concept_id` is **minted by the model**, with no pattern, no uniqueness within a round and no stability across rounds | Namespace every id by session; never key on it alone |
| `round_index` is whatever the model echoed back — two rounds can both say `1` | Array position is the only reliable round number |
| `approve` searches **only the last round**, and re-approving silently overwrites, even after a portfolio was built | Disable approve on anything but the newest round |
| An approval **survives a new round**; nothing clears it | Carried as `freshness: STALE`. Already done |
| `generate` has **no precondition** — a double-submit appends a round and doubles spend | Queue writes; disable the control while in flight |
| There is **no error state** in the status enum | The adapter carries failure; a failed build otherwise looks like one never attempted |
| Blocking calls up to 180s, **no streaming, no cancel** | The UI must show real progress and must not appear frozen |
| `run_dir` — a **server filesystem path** — is in every response | Stripped by the projection. Never surface or persist it |
| `links` are **model-authored URLs** | Never a trusted href, never an id, never injected as HTML |
| Output is **English**, from both backends | ADR-0021 D7. Not resolved here |

## Blocked by

P9, and ADR-0021 for the authority to build any of it.

## Acceptance criteria

- [x] **AC-P10.1** — The panel never calls the service directly from a browser. The base URL appears in no client bundle, and the proxy allow-lists paths rather than forwarding a client-supplied URL. Asserted by a repo test.
- [x] **AC-P10.2** — A session id that is not `^[a-f0-9]{12}$` is refused before it reaches a path.
- [x] **AC-P10.3** — `getSnapshot()` against a live session returns a `PanelSnapshot` that `panelSnapshotSchema.parse` accepts, declaring `snapshotKind: "drop.panel.machine.v1"`.
- [x] **AC-P10.4** — `/studio/engine` renders that session: nodes, edges, and a REVISION edge after a refine round. Verified in a browser, not inferred.
- [x] **AC-P10.5** — In REAL mode every unimplemented gateway member throws a typed `GatewayError`; none returns a plausible fake success.
- [x] **AC-P10.6** — The mock world is byte-unchanged and remains the default. Every existing test, scenario and visual baseline passes untouched.
- [x] **AC-P10.7** — The shell says which world it is showing. Reset is disabled in REAL mode with an on-screen reason, never inert.
- [x] **AC-P10.8** — A completed machine job becomes visible without a manual reload.
- [ ] **AC-P10.9** — `submitApproval` reaches the machine through `ReviewApplicationService.reviewItem` and no other path. The rejecting-stub proof still passes.
- [ ] **AC-P10.10** — `createReviewPathConformanceSuite` passes **unmodified** against the real world.
- [ ] **AC-P10.11** — Concurrent writes to one session cannot lose a round. Proven by a test that issues them.
- [ ] **AC-P10.12** — All checks green, including the machine's own suite, with the browser evidence coming from an actual run.

**Slice 1 landed 2026-09-10.** AC-P10.1 through AC-P10.8 are met and verified in a browser
against a live session; see `docs/handoff/P10-machine-wiring.md`. AC-P10.9 through AC-P10.11 are
slice 2 (writes) and untouched. AC-P10.12 stays open until slice 2 closes, though all six
canonical checks are green as of that commit.

## Handoff

`docs/handoff/P10-machine-wiring.md`: what was wired, what was refused and why, and every open decision reached — appended to the P8 register in its existing format rather than resolved unilaterally.
