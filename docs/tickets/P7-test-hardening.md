# Ticket P7 — Behavior and contract checks, plus responsive, RTL, keyboard and visual QA

```yaml
ticket_id: "P7"
title: "Prove the panel: every acceptance journey A01-A20 as a behavior test against its bound scenario, the ADR-0019 D19 conformance invariants with paired broken stubs, browser walkthroughs at desktop and mobile, and the responsive/RTL/keyboard/contrast sweep"
release: "P"
owner_lane: "quality"
source_requirements:
  - "V2 04 §3 — P7's updated scope: behavior/contract checks plus responsive, RTL, keyboard and visual QA"
  - "V2 04 §4 — the twenty acceptance journeys A01-A20, each with its setup/action and its expected result"
  - "V2 04 §5 — meaningful adapter-contract and behavior tests; browser walkthroughs at desktop and mobile with screenshots of overview, concept review, content revision, graph and calendar; inspect the generated ZIP contents against its manifest; verify external network calls are absent in demo mode; DO NOT claim E2E success if no browser run occurred"
  - "V2 02 §10 — every destination supports loading, empty, error+retry, offline/stale, permission-denied and success; validate 1440, 1024, 768 and 390 px with no document overflow except intentional graph/table scroll areas; keyboard-reachable controls, clear focus, labels on icons, text alternatives, accessible dialogs, WCAG 2.2 AA contrast; test Jalali month boundaries and timezone edges; reduced motion disables decorative transitions"
  - "V2 01 §7 — Asia/Tehran default and a Saturday week start; Jalali display through a tested date library; all-day dates as ISO calendar dates, timed events as UTC instants plus timezone; a calendar item never reads «published» because a date was chosen"
  - "V2 01 §8 — the state and history invariants the behavior tests assert: version content immutable, appends against exact version IDs, one command one effect, every view of the same entity updated"
  - "V2 03 §4 — command envelope, receipt tri-state, event dedupe by eventId and older-aggregateRevision drop"
  - "18 §12 — the recorded acceptance list; P7 produces the evidence P8 walks item by item"
  - "docs/testing-strategy.md scope note — the six active seams; Seams B, C and D sleep with the machine build"
adr_constraints:
  - "ADR-0019 D19 — the conformance obligations, verbatim: MachineGateway cases are extended by APPENDING ONLY and their names are stable; sibling suites are added for PanelGateway, PanelCommandGateway, RevisionGateway and the review facade; the eleven load-bearing invariants are listed in the body; EACH new invariant ships with a paired broken-stub break and its unbroken control, so the suite is proven able to fail"
  - "ADR-0019 D15 — journeys A01-A20 extend 18 §12; every journey must be bound to a scenario world; S01-S14 are the recorded fourteen 1:1 and in order, S15-S24 additive"
  - "ADR-0019 D4 — ReviewApplicationService.reviewItem is a facade ABOVE the gateways, the sole constructor of ApprovalCommand, delegating to MachineGateway.submitApproval; the rejecting-stub test is the only mechanical proof of ADR-0013 D1 inside the panel"
  - "ADR-0019 D3 — MachineGateway gains no members (tests/repo/verbatim-machine-gateway.test.ts is the guard); PanelGateway keeps its seven read-only members; writes live on PanelCommandGateway and targeted regeneration on RevisionGateway"
  - "ADR-0019 D16 — the demo clock is 2026-09-06T09:00:00Z; Date.now and Math.random stay unreachable from fixture and adapter code; discovery rotates batches[seed mod batches.length] with no PRNG; latency, offline, forbidden, failure and conflict are scenario-controlled, never random"
  - "ADR-0019 D10 — REVISION_CONFLICT is deliberately EXCLUDED from the retryable default; a conflict is refresh-then-resubmit, never blind retry"
  - "ADR-0019 D5/D6 — the projection direction is revision_requested → CHANGES_REQUESTED, approved → APPROVED, rejected → REJECTED; stored codes stay UPPER_SNAKE and V2's lowercase literals are the mock-JSON wire form normalized at the loader boundary; a null reasonFa is rejected before transport and never coerced to an empty string"
  - "ADR-0019 D9 — AUDIT_EVENT_NAMES stays closed at 35 and auditEventSchema stays .strict(); a needed event name that is not in the set is a P8 open decision, never a new member"
  - "ADR-0019 D17 — exportPackage returns the DOM-free PackageExport { bytes, filename, mediaType } and apps/web constructs the Blob; tsconfig.base.json's lib is NOT widened to include DOM; the archive carries real sample files plus a synthesized manifest.json matching its actual contents"
  - "ADR-0019 D18 — the accessible equivalent stage list is mandatory and the graph is never the only way to act; graph review shortcuts call the same approval service as the inbox (P5 renders them disabled, P6 wires them)"
  - "ADR-0019 D2 — frontend only; demo state persists in one versioned browser key drop-panel-demo-v2, offering Reset Demo on corrupt or incompatible data; two tabs synchronize or show a refresh notice, and silent last-write-wins is forbidden"
  - "ADR-0018 D3 / ADR-0019 D20 — the twelve frozen workspaces (apps/worker plus eleven machine packages) stay inert; no new workspace package (workspace-integrity.test.ts pins exactly sixteen); P8 follows and is a hard stop"
  - "02 D11 (ADR-0010) — WCAG 2.2 AA on core journeys, every canvas action has a non-canvas equivalent, colour alone never communicates status"
  - "ADR-0012 / ADR-0013 / ADR-0014 — tests pin the recorded vocabularies; a test that needs a state, decision or event name these ADRs lack is a defect finding, not a new name"
in_scope:
  - "The journey suite: one named behavior test per journey A01-A20, each loading its bound scenario world through the P3 loader and asserting that journey's expected result from V2 04 §4 — no journey asserted against a hand-built fixture"
  - "A journey-index test that enumerates A01-A20 and fails if any journey has no bound scenario or no test; today mock/scenarios.json carries acceptanceId for fifteen journeys and A05, A13, A14, A17 and A20 are unbound (P3 binds them under ADR-0019 D15 — P7 proves the binding, it does not invent one)"
  - "The MachineGateway conformance suite extended by APPENDING cases; existing case names unchanged (conformance.test.ts locates cases by c.name.includes(...))"
  - "Sibling conformance suites for PanelGateway (read-only, seven members), PanelCommandGateway, RevisionGateway and the ReviewApplicationService facade, each written against the interface and never against mock internals, and each run against all four mock adapters UNMODIFIED"
  - "The ADR-0019 D19 invariants, each with a paired broken stub and its unbroken control in the same file, modelled on reference-stub.ts's breakage option and conformance.test.ts's two-half structure"
  - "Browser walkthroughs (Playwright) at desktop and mobile with committed screenshots of overview, concept review, content revision, graph and calendar"
  - "Programmatic ZIP inspection: unzip the PackageExport bytes in Node, list the entries, parse the embedded manifest.json and assert entry-set equality in both directions"
  - "Zero-external-network assertion in demo mode on every walkthrough route, extending the existing tests/e2e/rtl/shell-and-gallery.spec.ts request-listener pattern"
  - "Responsive validation at 1440, 1024, 768 and 390 px: no document horizontal overflow except the intentional graph and table scroll areas, each asserted as a scoped overflow container rather than a document-level one"
  - "Accessibility sweep: keyboard-reachable controls, visible focus, accessible names on icon-only controls, text alternatives, dialog focus trap and focus return to the triggering card, axe WCAG 2.2 AA clean in BOTH themes at all four widths, reduced motion disabling decorative transitions"
  - "Keyboard-only completion of A05 through A20 at 390 px, including the calendar date edit, with no graph drag and no pointer input (journey A20)"
  - "Jalali month-boundary and timezone-edge tests over the existing pinned date-fns-jalali and @date-fns/tz in packages/ui: Saturday week start, Esfand/Farvardin and 30/31-day month rollovers, an Asia/Tehran instant whose UTC date differs from its local date, and the rule that a formatted Persian date is never a canonical value"
  - "Seam F sweep: placeholder-purity, workspace-integrity (exactly sixteen packages), verbatim-machine-gateway, ESLint boundary zones, check-pinned.mjs, check-token-literals.mjs, and the no-fixture-imports-in-components zone"
  - "A traceability table mapping every 18 §12 item and every journey A01-A20 to its named test, carried into the handoff for P8 to walk"
  - "Small defect fixes surfaced by the new tests, only where they change no contract; contract-affecting findings are recorded for P8's open-decisions register"
out_of_scope:
  - "New surfaces, new commands or new fixtures — P4, P5, P6 and P3 own those; a missing world is returned to P3, never patched inline"
  - "Any change to MachineGateway, PanelGateway's seven members, or the P2 DTOs; a needed shape change stops this ticket and becomes a P8 open decision (ADR-0019 D3, D9)"
  - "Seams B, C and D — they sleep until the machine build connects; pnpm test:db stays intentionally inert (scripts/inert-gate.mjs), with the handoff recording that it is reserved, not broken"
  - "Weakening or deleting an existing assertion, or regenerating a snapshot, to reach green"
  - "Performance and load testing beyond the graph's existing pan/zoom sanity checks"
  - "A new workspace package for test utilities — workspace-integrity.test.ts pins exactly sixteen"
contracts_changed:
  - "None. P7 pins the shapes P2 froze as amended by ADR-0019; the conformance suites grow by appending only, and gaps found here become P8 open decisions rather than silent patches."
database_changes: "None — frontend only (ADR-0019 D2)."
permission_requirements: >
  None new. The read-only-actor journey (A16, scenario S14) proves enforcement by invoking
  the application service directly, not only by asserting a hidden button — panel-side checks
  are a UX demonstration and never a security boundary (18 §4.2), and the handoff repeats that.
failure_states:
  - "A journey with no bound scenario is a ticket failure, not a skipped test — the index test fails and names the journey"
  - "A new invariant shipped without its paired broken stub, or with a break but no unbroken control, is a vacuous green and fails review (ADR-0019 D19)"
  - "A conformance case renamed rather than appended breaks the c.name.includes(...) lookups silently — the toBeDefined guard on every break test is what turns that into a red check"
  - "Playwright browsers absent: every e2e fails with a misleading launch error rather than an assertion failure; the run is NOT evidence and E2E success is not claimed (V2 04 §5)"
  - "A component test placed where neither vitest project globs it never runs while pnpm test stays green"
  - "An axe violation, a document-level horizontal overflow, or a keyboard-unreachable control on any journey step blocks the ticket"
  - "A screenshot regenerated to absorb a diff, or an assertion relaxed to reach green, is a defect finding in itself"
test_seams:
  - "Seam A — every fixture, command payload and receipt used by the journey suite parses through the P2/ADR-0019 Zod schemas; the export manifest validates as the package snapshot with file bodies stripped"
  - "Adapter-contract seam — the MachineGateway suite (appended), the PanelGateway, PanelCommandGateway and RevisionGateway sibling suites, and the review-facade suite, each with its broken/unbroken pairs, run against all four mock adapters unmodified"
  - "Component seam — every routed surface and shared component in its default, empty, loading, error, offline/stale, permission-denied and success states; focus management; reduced motion"
  - "Scenario seam — S01-S24 each reproducible by name, and A01-A20 each exercised against its bound world"
  - "Seam E — Playwright walkthroughs at desktop and mobile: screenshots, ZIP inspection hand-off, zero external requests, four-width responsive sweep, axe in both themes, keyboard-only A05-A20"
  - "Seam F — placeholder-purity, workspace-integrity, verbatim-machine-gateway, ESLint zones, check-pinned, check-token-literals, and the vitest-project glob coverage check"
acceptance_criteria: "AC-P7.1 through AC-P7.14 — see the checkbox list below"
dependencies: ["P6"]
files_owned:
  - "packages/machine-gateway/src/conformance/** — appended MachineGateway cases, the sibling panel/command/revision/facade suites, their reference stubs and broken-stub breakage options"
  - "Component tests colocated with their surfaces in apps/web/**, packages/ui/src/** and packages/workflow-ui/src/**"
  - "tests/e2e/** — the walkthrough specs, the responsive and axe sweeps, the keyboard-only journey, and their platform-suffixed snapshots"
  - "tests/repo/** — the Seam F additions and the vitest-glob coverage check"
  - "vitest.config.ts and playwright.config.ts — project globs and projects only"
  - "Production files ONLY for defect fixes that change no contract"
handoff_required: true
```

## What to build

The proof layer. P1-R through P6 built the panel; this ticket makes its claims checkable, and
makes the checks themselves provably able to fail. Two halves: **behavior** — every acceptance
journey A01-A20 driven against its bound scenario world — and **conformance** — the ADR-0019 D19
invariants, each paired with a broken stub that must make the suite red.

**Demoable when done:** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build`
green; the journey index printing twenty bound journeys; a reviewer flipping one `breakage` flag
and watching exactly the intended conformance case go red while everything else stays green; and
the five committed walkthrough screenshots at desktop and mobile.

### The twenty journeys (V2 04 §4), each against its bound world

| ID | Bound scenario | What the test proves |
|---|---|---|
| A01 | S01, S02, S15 | `input: null` validates as null — never coerced to `""` or an empty reference array; the run reveals three distinct concept cards; the batch comes from `batches[seed mod batches.length]` and Reset Demo reproduces it (ADR-0019 D16) |
| A02 | S03, S16 | The reference snapshot is visible; an oversized or unsupported file and a non-HTTP(S) URL are rejected inline; **no upload and no fetch happen** — asserted by zero network requests during the walkthrough, not by reading the handler |
| A03 | S05, S06 | A `null` `reasonFa` is rejected before transport (ADR-0019 D5); the rejected version is retained byte-identical; the revision is a new version of the **same** concept id that returns to review and never inherits approval |
| A04 | S24 | The replacement carries a new concept id with `replacesConceptId`; the rejected original stays visible in history; «ادامه با کانسپت‌های تأییدشده (N)» stays disabled while the selection is empty |
| A05 | *unbound today — P3 binds it* | A comment appends against the exact version id and changes nothing else: `reviewStatus` and the decision list are identical before and after. `Comment` is structurally incapable of carrying a decision outcome (ADR-0019 D11) |
| A06 | S04, S17 | Two approved concepts produce two independent research/content branches; the third, still pending, blocks neither; the batch CTA requires at least one approved card |
| A07 | S18 | Revising `o4` produces `o4-v2` and leaves `o1` and `o3` byte-identical — asserted on a serialized snapshot taken before the command, not on spot-checked fields |
| A08 | S08 | Iranian/Persian and international counts read against the **frozen** coverage plan; a retrieval request exists; the affected required item is blocked from approval while unrelated branches stay reviewable; retry never marks a blocked source verified |
| A09 | S11, S23 | Assembly is automatic and keyed by project + included content-version ids + plan revision; the manifest is non-empty and versioned; the ZIP holds real sample files; S23 proves assembly retry does not regenerate content |
| A10 | S19 | Exactly one unscheduled entry — `PLANNED` with `date === null` (ADR-0019 D7), labelled «آماده برنامه‌ریزی», never «published»; «تعیین تاریخ» places it; assembling twice with the same `commandId` creates no second entry |
| A11 | S20 | Exactly one `PLANNED` entry carrying a date and linked to the exact package version |
| A12 | S21 | A new concept version marks only **dependent** active content stale; the old package stays downloadable as a labelled historical snapshot; current readiness is revoked; unrelated branches are unchanged |
| A13 | *unbound today — P3 binds it* | Calendar creation is idempotent per package family (ADR-0019 D7): package v2 produces no second entry, and relinking is an explicit `updateCalendarPackage`, never a duplicate |
| A14 | *unbound today — P3 binds it* | The inbox action, the card action and the graph shortcut all reach `ReviewApplicationService.reviewItem`; exactly one `submitApproval`, one audit event, and every view of the entity — card, inbox, counts, graph, readiness, activity — updated. The graph shortcut is the ADR-0019 D18 P5/P6 boundary: P6 wired it, P7 exercises it |
| A15 | S22 | One effect per `commandId` with the original receipt returned; a stale `expectedRevision` throws `REVISION_CONFLICT`, leaves state untouched, and is **not** retryable (ADR-0019 D10) |
| A16 | S14 | The affordance is absent **and** the command is rejected when the application service is invoked directly; no privileged data leaks into the denied view |
| A17 | *unbound today — P3 binds it* | Reload rehydrates the same data, versions, comments and date from `drop-panel-demo-v2` with no automatic reset; corrupt or incompatible data offers Reset Demo instead of crashing; two tabs synchronize or show the refresh notice — never silent last-write-wins (ADR-0019 D2) |
| A18 | S07, S12 | A Weekly Lens requires an approved parent and retains its inherited Bible version; S07 is the refusal with no parent, S12 the success with `bible-p2-v1` |
| A19 | S09, S10, S13 | A typed error surfaces, the typed feedback stays in the dialog, no fake success appears, and retry erases no history; S10's non-retryable failure refuses retry with its stable diagnostic code |
| A20 | *unbound today — P3 binds it* | **A05 through A20 are completable by keyboard alone** at 390 px, including the calendar date edit, with no graph drag and no pointer input — the ADR-0019 D18 accessible equivalent stage list is what makes the graph steps reachable |

Five journeys — **A05, A13, A14, A17, A20** — carry no `acceptanceId` in
`docs/frontend-v2/mock/scenarios.json` today. Under ADR-0019 D15 that binding is P3's to make.
P7 asserts the binding exists; it never smuggles one in by pointing a journey test at a
hand-built fixture.

### The ADR-0019 D19 invariants, each with its paired break

Run against all four mock adapters **unmodified**. Each row ships a broken stub whose named
`breakage` makes exactly that case red, plus the unbroken control run in the same file.

1. **Exactly one `submitApproval` per `reviewItem`.** *Break:* the facade delegates twice.
2. **Replacing `submitApproval` with a rejecting stub leaves the decision list unchanged** — the
   only mechanical proof of ADR-0013 D1 inside the panel (ADR-0019 D4). *Break:* the facade
   records the decision locally before delegating, i.e. a second write path.
3. **`revision_requested` arrives as `CHANGES_REQUESTED`** (ADR-0019 D5). *Break:* the projection
   maps it to `REJECTED`.
4. **A `null` reason is rejected**, before transport, never coerced. *Break:* the adapter
   substitutes `""`.
5. **Approval appends an observable audit event**, named from the closed 35 (ADR-0019 D9).
   *Break:* accepts and appends nothing — the silent no-op already caught for `pauseRun`.
6. **The same `commandId` twice yields the same receipt and no second effect.** *Break:* returns
   the cached receipt but appends the effect again — assert receipt equality **and** effect count,
   because that break passes a receipt-only test.
7. **A stale `expectedRevision` throws `REVISION_CONFLICT` and leaves state untouched.** *Break:*
   applies the write, then throws.
8. **`requestRevision` creates a new version with prior versions byte-identical.** *Break:*
   mutates the prior version in place.
9. **`subscribe`: unsubscribe actually stops delivery, a duplicate `eventId` dedupes, an older
   `aggregateRevision` is ignored.** *Breaks:* unsubscribe leaves the listener registered;
   dedupe keyed on `occurredAt` instead of `eventId`; the older revision overwrites the newer.
10. **Exported bytes are non-empty and match their manifest.** *Break:* the manifest lists a file
    the archive lacks — caught only by comparing the entry sets in **both** directions.

### Key mechanics

1. **Append to the MachineGateway suite; never rename.** `createGatewayConformanceSuite` prefixes
   each case with `${options.name}: `, and `conformance.test.ts` finds cases with
   `cases.find((c) => c.name.includes(...))`. Renaming a case makes `find` return `undefined` and
   the break test vacuous — the `expect(case, "…").toBeDefined()` guard is the only thing that
   turns that into a red check, so every new break test carries one. The existing
   `expect(cases.length).toBeGreaterThanOrEqual(15)` is a floor; appending is safe.
2. **The rejecting-stub proof needs both halves.** A break with no unbroken control proves nothing
   — the suite could be failing for an unrelated reason. ADR-0019 D19 requires the pair, and
   `conformance.test.ts`'s "the same two cases pass against the unbroken stub" is the shape to
   copy.
3. **`MachineGateway` is byte-frozen.** `tests/repo/verbatim-machine-gateway.test.ts` diffs the
   committed interface against the ```ts block in doc 18 §6 character-for-character. A test helper
   that "just adds" a method to the interface for convenience turns that check red. Sibling
   suites target `PanelCommandGateway` and `RevisionGateway` instead.
4. **`exportPackage` returns `PackageExport`, not a `Blob`** (ADR-0019 D17). `tsconfig.base.json`'s
   `lib` is not widened, so a test that constructs a `Blob` inside a contract package will not
   typecheck. Unzip `bytes` in Node, parse the embedded `manifest.json`, and assert that the
   manifest's file list and the archive's entry list are equal in both directions — a one-way
   subset check passes the exact break this invariant exists to catch. The manifest is the package
   snapshot with file bodies stripped; validate it as such at Seam A.
5. **Playwright browsers must be installed.** They are present in this environment
   (`~/Library/Caches/ms-playwright`), but on a fresh clone or a CI runner every e2e fails with a
   browser-launch error that reads like an app failure. Run `pnpm exec playwright install chromium`
   first, and if the browser did not launch, report "no browser run" — V2 04 §5 forbids claiming
   E2E success without one.
6. **Snapshots are platform-suffixed.** The committed baselines are
   `…-chromium-darwin.png`; a Linux runner writes `…-chromium-linux.png` and, absent a baseline,
   Playwright *creates* it and passes. Treat a first-run pass on a new platform as no evidence,
   and never regenerate a darwin baseline to absorb a diff.
7. **The vitest projects do not glob everything.** The `node` project includes
   `packages/*/src/**/*.test.ts` and **excludes `packages/ui/**`**; the `jsdom` project includes
   only `packages/ui/src/**/*.test.{ts,tsx}` and `apps/web/**/*.test.{ts,tsx}`. A component test at
   `packages/workflow-ui/src/**/*.test.tsx` therefore matches **neither project and silently never
   runs while `pnpm test` stays green.** Widen the `jsdom` include when P5's component tests land,
   and add a Seam F check that every `*.test.ts(x)` file in the repo is claimed by at least one
   vitest project or by Playwright's `testDir`. The mirror trap: a spec named `*.test.ts` under
   `tests/e2e/` is picked up by the `node` project's `tests/**/*.test.ts` glob **and** by
   Playwright — keep e2e files on `*.spec.ts`.
8. **Zero external requests is an assertion, not a claim.** Extend the existing
   `page.on("request")` listener from `tests/e2e/rtl/shell-and-gallery.spec.ts` — which already
   allows only `baseURL`, `data:` and `blob:` — across every walkthrough route with
   `waitUntil: "networkidle"`. Vazirmatn must still resolve from the app's own `/fonts` path.
9. **Overflow is scoped, not global.** V2 02 §10 permits scroll areas for the graph and tables and
   nothing else. Assert `document.documentElement.scrollWidth <= clientWidth` at 1440, 1024, 768
   and 390, and separately assert that the graph and table containers are the elements carrying
   the overflow. A test that only checks the containers will miss a body-level bleed.
10. **Jalali and timezone edges need no new dependency.** `date-fns-jalali@4.4.0-0` and
    `@date-fns/tz@1.5.0` are already pinned in `packages/ui`. Cover the Saturday week start, the
    Esfand→Farvardin rollover, a 30-versus-31-day Jalali month boundary, and an `Asia/Tehran`
    instant whose local date differs from its UTC date — the two things V2 01 §7 makes easy to get
    wrong. If any dependency is genuinely needed, add it with `pnpm add -E` or
    `scripts/check-pinned.mjs` fails the `lint` script.
11. **The clock is 2026-09-06T09:00:00Z and nothing else** (ADR-0019 D16). A test that reaches for
    `Date.now()` or `Math.random()` reintroduces the flake the fixtures were designed to remove;
    the static unreachability check covers fixture and adapter code, and the journey tests inject
    the same clock.
12. **Nothing here weakens anything.** No assertion is relaxed, no snapshot regenerated, and no
    frozen workspace touched — `placeholder-purity`, `workspace-integrity` (exactly sixteen
    packages) and the ESLint boundary zones stay green. A finding that needs a contract change is
    written down for P8's open-decisions register, not fixed in place.

## Blocked by

P6. This ticket hardens; it does not build. Every surface, command, degraded state and export it
exercises must already exist, and P6's graph review shortcuts must already be wired — A14 and A20
have nothing to drive otherwise. P3's journey bindings must be in place, or the index test in
AC-P7.1 fails by design rather than by oversight.

## Acceptance criteria

- [ ] **AC-P7.1 Twenty bound journeys** — A01 through A20 each have a named behavior test running
  against a bound scenario world; an index test enumerates all twenty and fails naming any journey
  that is unbound or untested. *Seam: scenario seam.*
- [ ] **AC-P7.2 Journey outcomes** — each journey asserts the V2 04 §4 expected result listed in
  the table above, including the ones that are easy to fake: `input: null` stays null (A01), no
  network request occurs on reference start (A02), untouched siblings are byte-identical (A07,
  A12), and the read-only rejection is proven at the service, not the button (A16). *Seam:
  scenario seam + component seam.*
- [ ] **AC-P7.3 Conformance across four adapters** — the MachineGateway suite (extended by
  appending, existing names unchanged) plus sibling suites for `PanelGateway`,
  `PanelCommandGateway`, `RevisionGateway` and the review facade run green against all four mock
  adapters **unmodified**, importing only interfaces and DTOs. *Seam: adapter-contract seam.*
- [ ] **AC-P7.4 The ten D19 invariants** — every invariant listed above is asserted, including
  exactly-one-`submitApproval`, the rejecting-stub proof of ADR-0013 D1, the
  `revision_requested → CHANGES_REQUESTED` projection, the `null`-reason rejection, the audit
  append, `commandId` idempotency with no second effect, `REVISION_CONFLICT` leaving state
  untouched and non-retryable, byte-identical prior versions after `requestRevision`, the three
  `subscribe` rules, and manifest/archive equality. *Seam: adapter-contract seam + Seam A.*
- [ ] **AC-P7.5 Every invariant can fail** — each ships a paired broken stub whose named
  `breakage` makes exactly that case red, plus its unbroken control in the same file; each break
  test guards its `find` with `toBeDefined`. *Seam: adapter-contract seam.*
- [ ] **AC-P7.6 Browser walkthroughs** — Playwright runs at desktop and mobile with committed
  screenshots of overview (نمای کلی), concept review, content revision, graph and calendar
  (تقویم و برنامه); the run report records the browser and platform, and no E2E claim is made
  without an actual browser run. *Seam: Seam E.*
- [ ] **AC-P7.7 ZIP inspected programmatically** — the exported `PackageExport.bytes` unzip to
  non-empty real sample files; the embedded `manifest.json` and the archive entry list are equal in
  both directions; the manifest validates as the package snapshot with file bodies stripped
  (ADR-0019 D17). *Seam: Seam E + Seam A.*
- [ ] **AC-P7.8 No external network in demo mode** — every walkthrough route loads with zero
  requests outside the app origin (`data:`/`blob:` excepted) and Vazirmatn resolves from
  `/fonts`. *Seam: Seam E.*
- [ ] **AC-P7.9 Responsive at four widths** — 1440, 1024, 768 and 390 px show no document-level
  horizontal overflow; the graph and table scroll areas are asserted as the scoped containers that
  legitimately overflow (V2 02 §10). *Seam: Seam E.*
- [ ] **AC-P7.10 Accessibility** — axe reports zero WCAG 2.2 AA violations in **both** themes at
  all four widths on the walkthrough routes; icon-only controls have accessible names; dialogs and
  sheets trap focus and return it to the triggering card; reduced motion disables decorative
  transitions; status is never colour alone (02 D11). *Seam: Seam E + component seam.*
- [ ] **AC-P7.11 Keyboard-only journey** — A05 through A20 complete at 390 px with keyboard input
  only, including the calendar date edit, with no graph drag and no pointer events; the accessible
  equivalent stage list carries the graph steps (ADR-0019 D18). *Seam: Seam E.*
- [ ] **AC-P7.12 Jalali and timezone edges** — Saturday week start, Esfand→Farvardin rollover, a
  30-versus-31-day Jalali month boundary, and an `Asia/Tehran` instant whose local and UTC dates
  differ all pass; no formatted Persian date is stored as a canonical value; all-day dates stay ISO
  calendar dates and timed events stay UTC instants (V2 01 §7, ADR-0019 D8). *Seam: component seam
  + Seam A.*
- [ ] **AC-P7.13 Seam F sweep** — `placeholder-purity`, `workspace-integrity` (exactly sixteen
  packages), `verbatim-machine-gateway`, the ESLint boundary zones, `check-pinned.mjs` and
  `check-token-literals.mjs` are green; a new check proves every `*.test.ts(x)` file is claimed by a
  vitest project or Playwright's `testDir`, so no test silently never runs. *Seam: Seam F.*
- [ ] **AC-P7.14 Checks green and traced** — `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm test:e2e && pnpm build` pass with Playwright browsers installed; `pnpm test:db` is recorded
  as intentionally inert (frontend only, ADR-0019 D2); the handoff carries the traceability table
  mapping every 18 §12 item and every journey A01-A20 to its named test, ready for P8 to walk.
  *Seam: Seam F.*
