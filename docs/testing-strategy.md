# DROP Studio OS — Testing Strategy (TDD)

**Status:** Active build document — derives from the implementation bundle, primarily
`14_TESTING_QA_AND_ACCEPTANCE.md`.
**Authority:** This document never overrides the bundle silently. Where it departs from a
bundle document, the departure is a recorded repair and the governing ADR is cited
(ADR-0011 through ADR-0016). Authority between bundle files follows `DELIVERY_README.md`'s
hierarchy, to which `00_READ_ME_FIRST.md` §3 defers (ADR-0011, pending human-owner
ratification).
**Audience:** Every Claude Code build session and every independent reviewer. Ticket authors
must map each ticket's `test_seams` field (15 §9) into the canonical seam list in §3 below.

---

## 1. The loop

The bundle already commits the build to test-first discipline: "Tests are written before
implementation at the agreed seam and are not weakened merely to make the code pass" (14 §1);
"Write tests at the machine/stage and HTTP seams before implementation" (00 §5); "State the
test seam and write/freeze behavior tests" before implementation in every ticket prompt
(16 §4); "freeze tests/contracts" precedes "implement shared business logic" in the per-ticket
loop (15 §10). This section makes that discipline operational.

### 1.1 Red before green

No production line is written until a failing test exists for the behavior it implements.

1. **Red.** Write exactly one test at the seam the ticket's `test_seams` field names. Run it.
   Watch it fail, and confirm it fails **for the specified reason** — a missing behavior, not a
   typo, a broken import, or a fixture error. A test that fails for the wrong reason proves
   nothing and must be fixed before proceeding.
2. **Green.** Write the smallest implementation that makes that one test pass while keeping
   every previously green test green. Do not implement ahead of the test.
3. **Repeat.** Next behavior, next test, next implementation.

### 1.2 One seam, one test, one implementation per cycle

Each red→green cycle targets a single seam and a single behavior. Do not write a batch of
tests across three seams and then implement against all of them at once: batching hides which
test drove which line, invites speculative implementation ("no business-domain implementation
beyond safe package placeholders" is the Ticket 0.1 form of this rule, 16 §3), and makes it
impossible for the independent reviewer to verify that tests were not retro-fitted. A ticket
normally cycles through many red→green iterations, but every iteration is one seam wide.

Contract-freezing is the exception that proves the rule: a ticket that changes
`packages/contracts` freezes the full contract fixture set first (15 §10, 16 §12 "Freeze Zod
contract before migration") because contracts are the shared authority other lanes build
against (15 §11). Freezing contracts is red-phase work — the fixtures are failing tests until
the schemas exist.

### 1.3 Refactoring belongs to review, not the loop

The classic third step ("refactor") is deliberately **not** part of the in-loop cycle here.
Structural cleanup is deferred to the end-of-ticket independent review pass (16 §8), for two
reasons specific to this build:

- Every ticket ends with an independent review whose explicit job includes structural findings
  with "the smallest safe fix" (16 §8). Refactoring inside the loop duplicates that pass with
  no reviewer, in a codebase where approved/published history is immutable and business rules
  must live in shared packages (00 §5) — misplaced code is a review finding, not an in-flight
  judgment call.
- In-loop refactoring by a coding agent is the primary mechanism by which tests get quietly
  weakened "merely to make the code pass" (14 §1). Separating implementation from cleanup
  keeps the test suite the fixed point.

Consequence: during the loop, prefer the direct implementation over the elegant one. Record
cleanup candidates in the handoff (16 §9 "Known limitations") and let review order them.
A refactor applied after review must run the full affected suites again before commit (16 §7).

---

## 2. What a good test is here

### 2.1 Behavior through public interfaces

Tests assert "artifacts, states, events, permissions, HTTP responses and rendered critical
journeys — not internal call counts or private implementation details" (14 §1). The public
interfaces of this system are exactly the seams of §3: exported Zod contracts, the run/stage
command surface, the versioned HTTP API (10 §1), the database's persisted rows and
constraints, and the rendered FA/RTL UI. If a behavior cannot be observed at one of those
surfaces, it is not a behavior — it is an implementation detail, and no test may reach around
the seam to grab it.

### 2.2 The tautology ban

**The expected value of a test comes from the spec or the bundle — never from the code under
test.** A test that computes its expectation by calling the same logic it verifies is a
tautology: it can only ever prove the code equals itself.

- A state-transition test asserts the literal end state named in ADR-0012's transition table
  (e.g. `PAUSE_RUN` on a `RUNNING` stage yields persisted `PAUSED`), written as a constant in
  the test. It does not ask the state machine what the result "should" be.
- A contract test's rejection fixtures encode the invalid shapes the spec forbids (e.g. an
  edge type outside the ten allowed values, 07 §11), not shapes generated by inverting the
  schema.
- A manifest-freeze test asserts the exact registry versions seeded into the fixture
  (07 §6), not whatever versions the freezing code happened to resolve.
- Snapshot-style baselines captured from the code's own current output are banned as behavior
  tests. The single exception is the visual regression set (14 §13), whose baselines are
  explicitly human-approved screenshots — an approved baseline is a spec artifact; an
  auto-captured one is a tautology.

When the spec does not state the expected value, that is a stop condition ("the ticket cannot
be tested through an agreed seam", 16 §6), not a license to derive the expectation from the
implementation.

### 2.3 The implementation-coupling ban

**The tell: a test that breaks on a refactor that changes no behavior is coupled to the
implementation, and is a defect in the test.** Concretely banned:

- Asserting internal call counts, call order, or that a private collaborator was invoked
  (14 §1).
- Spying on or stubbing internal modules to "observe" behavior the seam already exposes.
- Asserting Drizzle row shapes, provider SDK shapes, or React Flow objects through the HTTP
  seam — those are explicitly not public DTOs (10 §1).
- Asserting incidental ordering, generated-ID formats, or timestamps beyond what the contract
  guarantees (events guarantee sequence and IDs, 10 §9 — assert those; do not assert the
  microsecond).

The symmetric rule also holds: when a refactor **does** break a well-formed seam test, the
behavior changed, and that is either a bug or an unrecorded contract change — stop and check
the ticket's `contracts_changed` scope (15 §9). Tests are never weakened to absorb it (14 §1).

---

## 3. The five pre-agreed seams

This is **the** canonical seam list. Every ticket's **behavioral** `test_seams` entry
(15 §9) maps into it; a behavioral seam outside this list is malformed. Alongside the five
behavioral seams there is one **non-behavioral family, Seam F — repository/infrastructure
checks**: toolchain and workspace-integrity checks (ticket 0.1), compose smoke and health
probes (0.2), typed-config unit tests, supply-chain/registry scans (0.2, 0.15 per ADR-0016),
nginx/CSP config checks, static boundary and lint-rule guards (0.9, 0.12), and Pro-license
repo scans (0.15). Seam F entries assert facts about the repository and its infrastructure,
not domain behavior — they are executable and named per ticket, but the TDD loop below applies
to Seams A–E. The list consolidates doc 14's primary
seams (14 §2) and thirteen test layers (14 §3) into five addressable surfaces; §3.6 gives the
layer-to-seam mapping.

### 3.1 Seam A — Contract

Zod schemas in `packages/contracts` validated against fixture sets: every schema has accepting
fixtures and rejecting fixtures, and the rejection reasons are asserted (14 §3 layer 1).
Contracts are frozen before migrations (16 §12) and before parallel lanes open (15 §11).
Covers: domain envelopes (15 ticket 0.3), workflow definition/version/node/edge/layout
contracts, the `WorkflowDraftOperation` union (10 §5), command payloads (10 §6), event
envelopes including the ADR-0014 additions, and the status enums for projects, programs,
weekly lenses, requests and calendar items enumerated in ADR-0015 — a fixture using a status
outside the ADR-0015 enum must reject.

### 3.2 Seam B — Machine/stage

The real pipeline runtime driven via its command surface with a **mock executor** registered
through the real registry, asserting **persisted** state transitions against ADR-0012's
completed table (which repairs 07 §3.1's gaps). Fixture inputs, frozen configuration and the
mock AI gateway (14 §2 Seam 1). Assertions read durable rows and run events — never in-memory
runtime state.

Blocking coverage at this seam:

- Every transition in ADR-0012's table, positively and negatively: `PAUSE_RUN` produces
  `PAUSED` from `RUNNING|READY|QUEUED` and `RESUME_RUN` recovers it; `CANCEL_RUN` reaches
  `CANCELLED` from every non-terminal state; `SKIPPED` is produced by `CONDITION_FALSE` edges
  and by governed, capability-gated manual skip — and by nothing else; illegal transitions are
  rejected with the row unchanged.
- Run-level status aggregation: the run enum
  `DRAFT|QUEUED|RUNNING|WAITING_INPUT|WAITING_APPROVAL|PAUSED|SUCCEEDED|FAILED|CANCELLED` and
  the stage→run aggregation rule per ADR-0012, asserted from stage-state fixtures.
- `PROVIDER_CONFIGURATION_REQUIRED` (11 §7) maps to `WAITING_INPUT` with its reason code
  (ADR-0012); the run stays usable manually (00 §4).
- `SUBMIT_INPUT` satisfies an automated stage **only** when the published definition flags the
  stage `manual_fallback: allowed` (ADR-0012); otherwise it is rejected.
- The twelve runtime scenarios of 14 §6 (happy run, dependency wait, approval park with no
  queue job, exactly-once resume, one-repair rule, bounded retry, budget escalation, cancel at
  three phases, Redis flush reconstruction, duplicate-delivery idempotency, historical version
  retention).
- Manifest freezing: run creation fails closed when any registry version is unresolvable
  (07 §6), including executor/validator identity as code-version + checksum per ADR-0015.
- Golden prompt-version comparisons on frozen fixtures when prompt/rule/example versions
  change (16 §10).

Note on approvals at this seam: per ADR-0013 the runtime command set contains **no** gate
verbs — `APPROVE_GATE`/`REQUEST_CHANGES` are removed from 07 §12's list. A machine/stage test
drives a run to `WAITING_FOR_APPROVAL` and then satisfies the gate through the approval
application service (the same service the Seam C endpoint adapts), asserting exactly-once
resume (14 §6 scenario 4). Any test that "approves" by issuing a run command is asserting a
removed write path and must fail.

### 3.3 Seam C — HTTP

Route handlers exercised via real requests against a real test PostgreSQL instance (14 §2
Seam 2), asserting status code, response body against the envelope contract (10 §2), and the
resulting **audit rows** (11 §12) — an authorized mutation without its audit row is a failing
test. Minimum coverage is 10 §12's list: authentication and tenant isolation, role/capability
scope, approval policy and acted-as role, optimistic concurrency, idempotent duplicate
commands, immutability rejections, state-transition guards, SSE ordering/gap recovery, and
Persian error mapping without internal leakage.

Ticket 0.16 (ADR-0014) owns the R0 band this seam exercises: workflow definition/version
CRUD + validate + publish engine (10 §5, 07 §13's full checklist as rejection tests), run
command endpoints (10 §6), the SSE stream, and the approval request/decision endpoints
(10 §7). SSE tests assert the extended taxonomy — `run.completed`, `run.failed`,
`run.cancelled`, `run.paused`, `run.resumed`, `stage.skipped`, `stage.cancelled`, heartbeat —
and snapshot + event-id resume semantics (ADR-0014 repairing 10 §9): a client that replays
from its last event ID after a forced disconnect converges on the same terminal state as the
snapshot, and a sequence gap forces a snapshot refetch (10 §8.2).

Approval-path negative tests at this seam (ADR-0013): a gate decision attempted through
`/runs/:runId/commands` is rejected; a decision by a `MACHINE` or `SERVICE` actor is rejected
(11 §2); a `DISTINCT_REVIEWER_REQUIRED` decision by the subject creator is rejected (11 §6.1);
the N-th approval by an actor who already decided does not satisfy `minimum_approvals`.

### 3.4 Seam D — Database constraint

Constraints proven by direct `INSERT`/`UPDATE`/`DELETE` attempts **that must fail** at the
database, not merely at the service layer — immutability is implemented in the database
(06 §11), so it is tested there (14 §3 layer 2). Blocking coverage:

- Published workflow versions and approved artifact versions reject in-place edits (00 §4,
  06 §11).
- `core.audit_events` and `core.approval_events` reject `UPDATE` and `DELETE` (append-only,
  06 §2, 11 §13).
- Approver distinctness: with a policy requiring `minimum_approvals: 2`, a second approval row
  by the same actor identity violates the ADR-0013 DB constraint — asserted by the raw insert
  failing, independent of any endpoint check.
- FK integrity for the ADR-0015 registry tables: `programs.constitution_version_id` resolves
  to a real constitution version row; constitution/rule/prompt/example version tables enforce
  their publish-flow invariants; manifests referencing unresolvable registry versions cannot
  be inserted.
- Migration upgrade tests from the previous committed state (16 §12).

### 3.5 Seam E — UI (Playwright e2e on critical FA/RTL journeys only)

Playwright is "a thin but real browser layer" (14 §2 Seam 3): FA-first RTL rendering, keyboard
operation, workflow template and execution views, review/approval/feedback forms, file preview
boundaries, Jalali dates and bidi-safe identifiers. Behavior logic remains covered at Seams
A–D; an e2e test that is the *only* coverage for a business rule indicates a missing test at a
lower seam. The blocking journey set per release is defined in §5; component-level render and
accessibility tests (14 §3 layers 10–11, 14 §11) are supporting tests inside this seam family
and follow the same bans of §2 — they assert rendered output and accessible names, never
component internals.

### 3.6 Layer-to-seam mapping

| Doc 14 §3 layer | Seam |
|---|---|
| 1 Contract/schema | A |
| 2 DB constraint/migration | D |
| 3 Domain rule | B (runtime-observable) / C (endpoint-observable) |
| 4 State transition | B |
| 5 Prompt/gateway contract | A + B |
| 6 Source validation / evidence slots | B + C |
| 7 Provenance / immutability | B + D |
| 8 Permission / approval policy | C + D |
| 9 Workflow integration | B |
| 10 UI component / accessibility | E (supporting) |
| 11 Visual RTL regression | E (approved baselines) |
| 12 End-to-end vertical slice | E |
| 13 Golden creative regression | B (frozen fixtures, real examples only — §6) |

Suites run under the command names established in Ticket 0.1 (16 §7): `pnpm test` (Seams A,
B), `pnpm test:db` (Seams C, D — real PostgreSQL), `pnpm test:e2e` (Seam E).

---

## 4. Mocking policy

### 4.1 The mock AI adapter is a real adapter

The mock adapter is **production code**, not a test double. It is a first-class provider
adapter behind the provider-agnostic gateway (12 §1), shipped in the product (00 §6, ticket
0.9), because the system must remain useful in manual/mock mode when no live provider is
configured (00 §4, 00 §7). It implements the full `AiGateway` contract — structured output,
raw-response separation, the one-repair rule, budget accounting (12 §3) — deterministically
from fixtures. Tests exercise it the way production does: through the gateway, selected by
model-profile configuration (12 §2). It is itself under test (Seam A/B), which a test double
never is. The same logic applies to the mock **stage executor** used at Seam B and to
specialized-agent stubs (07 §9 Machine 04, 12 §13): each is a real implementation of a public
contract (`StageExecutor`, `SpecializedOutputAgent`), registered through the real registry and
frozen into real run manifests — never a monkey-patched internal.

### 4.2 Never mock internal collaborators

No test may stub, spy on, or replace the system's own repositories, application services,
registries, validators, or queue/outbox logic. Doing so both violates the coupling ban (§2.3)
and un-tests exactly the plumbing the standing invariants exist to protect (idempotency,
fail-closed gates, provenance — 14 §4). PostgreSQL is never mocked: Seams B, C and D run
against a real test instance (14 §2). Redis is never mocked: the Redis-loss and
duplicate-delivery scenarios (14 §6) are only meaningful against the real dispatch layer.

### 4.3 What may be faked: time and external transport, nothing else

- **Time.** Fake clocks/timers for retry backoff profiles, timeouts, SSE heartbeat intervals
  and budget windows (07 §8). Never `sleep` in a test to "wait for" a transition.
- **External transport.** Systems the product does not own, faked at their adapter boundary:
  live AI providers (via the mock adapter, §4.1), outbound HTTP fetch targets for
  retrieval/reachability tests (a local fixture server standing in for the remote host —
  which is also how the ADR-0016 SSRF negative suite serves redirect and DNS-rebinding cases),
  and mail transport for invitation flows (11 §8) via a capturing sink. S3-compatible storage
  runs real (MinIO is in the reference stack, ticket 0.2); it is not external transport.

---

## 5. Per-release testing gates

Every release exit requires green tests for affected layers, typecheck/lint/build, migration
verification, independent review, and human-owner acceptance (14 §14); the standing invariant
tests of 14 §4 are release blockers **from the release that introduces the invariant's subject
onward, forever** — they "may never be waived silently". The table below names the suites that
block each release exit, incorporating the ADR-0011 restoration of the four dropped R0
criteria and the negative suites mandated by ADR-0013 and ADR-0016.

### R0 — Foundation plus workflow shell

Blocking suites:

- **Seam A:** full contracts-v1 fixture suite (ticket 0.3), including ADR-0015 status enums
  and ADR-0014 event envelopes.
- **Seam D:** immutability + append-only set; **the ADR-0013 approver-distinctness negative
  test** (§3.4) — a raw duplicate-actor approval insert must fail at the constraint; ADR-0015
  registry FK suite; migration upgrade tests.
- **Seam B:** ADR-0012 full transition table (positive and negative); run-level aggregation;
  the twelve 14 §6 scenarios; fail-closed manifest freeze with ADR-0015 executor/validator
  checksums.
- **Seam C:** the ticket 0.16 band (ADR-0014): workflow validate/publish rejection suite
  (07 §13), run commands, SSE extended taxonomy + heartbeat + snapshot/event-id resume,
  single-write-path approval endpoints with the ADR-0013 negatives (§3.3); the 10 §12 minimum
  list; tenant-isolation negatives for every R0 resource group (11 §9).
- **Restored R0 exit criteria (ADR-0011),** each mapped to a seam:
  1. Mock structured output validates and stores → Seam B (gateway result → validated,
     persisted artifact version with provenance, 12 §3).
  2. Failed runs visible with stage states → Seam C (run/graph endpoints expose `FAILED` runs
     with per-stage states) + Seam E (execution view journey).
  3. Prompt versions come from configuration → Seam B (manifest freezes prompt registry
     versions resolved from ADR-0015 tables; a hard-coded prompt string is a failing test).
  4. Disabled-user sign-in blocked with history intact → Seam C (sign-in rejected, session
     revoked, 11 §8) + Seam D (the actor's historical audit/approval rows still present,
     11 §13).
  Note "Program" in the R0 exit means Project/Program records exist as versioned rows via
  schema + API (tickets 0.4/0.7); the Program creation flow remains Release 1 (ADR-0011).
- **Seam E:** the R0 vertical demo journey (15 §2) as a Playwright run — draft → validate →
  publish → run → approve under a named role → inspect audit — in Persian RTL, plus the
  two-user permission-correct UI criterion.
- **Security review** scope: identity, RBAC, audit, secrets, fail-closed runtime (11 §15).

### R1 — Machine 01 vertical slice

- Seam B: Machine 01 template scenarios — distinct candidates, provenance, theme-vs-concept
  critique separation, structured feedback, candidate rules never auto-active, human gate and
  rerun/version behavior (15 §3) — all on synthetic fixtures (§6).
- Seam A/B: golden fixture comparison harness live for prompt version changes (16 §10).
- Seam C/E: Program creation flow, Reference Board, Program overview with live execution graph.
- Creative acceptance on the client's one real brief is a **human** gate (15 §3, 15 §12) — it
  is not a test suite and no suite may claim it (§6).

### R2 — Controlled research

- Seam B/C: the full research suite (14 §10) — plan freeze before retrieval, `CANDIDATE`
  quarantine, blocked slots staying in the denominator, substitution rules, critical-gap
  blocking, dual-coverage invariant (14 §4).
- **ADR-0016 SSRF negative suite blocks R2 exit** — this release ships the first outbound
  fetch path (deployment-origin reachability + three-pass retrieval, 15 §4, 12 §7–8), and the
  suite is standing thereafter. Required negatives, each asserting rejection **and** the
  recorded failure reason (12 §8): non-`http/https` schemes (`file:`, `ftp:`, `gopher:`);
  hostnames resolving to loopback, RFC 1918, link-local/metadata ranges — asserted **after**
  DNS resolution, including a DNS-rebinding fixture; redirects landing on a private IP
  (re-validation per hop); response-size cap and time cap exceeded; credentials present in
  the outbound URL or ambient headers (no credentials on outbound fetches).
- Reachability field recording (12 §8) and prompt-injection strings in reference content
  treated as data (11 §10, 14 §9).

### R3 — Synthesis and Concept Bible

- Seam B: hard-gate invariants — DROP FIT / LENS RELEVANCE failure cannot be offset by score
  (07 §9, 14 §4); versioned weight profiles frozen in manifests.
- Seam C/D: Guardian approval through the single write path with distinctness enforced;
  Concept Bible immutability (15 §5).
- Seam E: comparison workspace journey.

### R4 — Output and production control

- Seam B: specialized-agent registry + stub production path, embedded validators, schema-valid
  artifact with full provenance (15 §6).
- Seam C: `FA_EDITORIAL` gate — missing capability holder produces the named blocked state,
  never a pass-through (11 §7, 14 §4).
- Security suite (14 §9): generated preview cookie/network isolation, stored/rendered XSS,
  signed-access expiry/scope; **security review** scope: generated output and artifact
  boundary (11 §15).

### R5 — Calendar, feed and Weekly Lens

- Seam B/C: requests/calendar generation, dependency-blocked work cannot start, scoped
  revision to the exact Machine 04 job/artifact version without rewriting history (15 §7).
- Seam E: Weekly Lens journey — derivation with mandatory current-context scan, approval,
  commissioning (07 §10); Solar Hijri display against stored UTC (14 §8).

### R6 — Hardening

- Golden creative regression suite on real approved examples (14 §3 layer 13; §6 below).
- Performance budgets measured on the agreed baseline and recorded as CI thresholds (14 §12);
  subsequent regressions require an explicit decision, not a threshold edit.
- Full visual regression set with approved baselines (14 §13).
- Full standing-invariant suite (14 §4), the ADR-0013 and ADR-0016 negative suites re-run,
  penetration-style review, backup/restore and second-host migration drill (11 §15, 15 §8).
  Note the drill exercises the mirror-capable build configuration (doc 13 amendment,
  ADR-0016): a build that silently reaches a Western registry fails the drill.

---

## 6. Fixtures policy

**Synthetic fixtures prove mechanics, never taste** (16 §10; 00 §7: "use synthetic fixtures
for mechanics only, never taste calibration"; 15 §12). A synthetic brief can prove that a run
freezes its manifest, that a gate parks, that a contract rejects — it can never prove that a
Concept Card is good. The two acceptance tracks never blur:

- **Mechanics** — automated, on versioned synthetic fixtures, blocking per §5. Fixtures live
  in `packages/testing` (05 §3) as the single shared source of builders, seeded
  registries and seam harnesses; they are deterministic, referenced by version, and changing a
  fixture that a golden comparison depends on is a contract change, not a tweak.
- **Taste** — human, on real client material: creative R1 acceptance requires the client's one
  real brief (15 §3, 15 §12); golden creative regression exists only "after real approved
  examples exist" (14 §3 layer 13) and compares old/new prompt versions on the **same frozen
  fixtures** (16 §10). No automated suite may claim creative acceptance, and no creative gap
  may block a mechanics release.

Fixture standards:

- Persian-first: fixtures carry realistic FA content — long Persian strings, mixed-direction
  text, Jalali-relevant instants, glossary terms — so Seam A–E tests exercise the RTL rules by
  default (14 §8, 14 §13), while remaining synthetic in substance.
- Fixtures never contain secrets, live provider identifiers, or real personal data (16 §5).
- The Example Library's accepted/rejected/borderline records (12 §5) are **production data**,
  not test fixtures; when R6 golden suites consume them, they are read through the real
  registry at frozen versions, never copied into `packages/testing`.
- Every rejection fixture states which rule it violates, citing the bundle section or ADR — a
  rejection fixture nobody can trace to a rule is dead weight and gets deleted.

---

*Cross-references: ADR-0011 (authority, R0 acceptance restoration), ADR-0012 (execution state
machine), ADR-0013 (approval write path and distinctness), ADR-0014 (SSE taxonomy, ticket
0.16), ADR-0015 (registry storage and status enums), ADR-0016 (supply chain and SSRF policy).*
