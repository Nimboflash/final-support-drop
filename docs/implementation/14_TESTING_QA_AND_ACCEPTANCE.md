# Testing, QA and Acceptance

## 1. Test philosophy

Test observable behavior at stable seams. Tests assert artifacts, states, events, permissions,
HTTP responses and rendered critical journeys - not internal call counts or private implementation
details.

Tests are written before implementation at the agreed seam and are not weakened merely to make
the code pass.

## 2. Primary seams

### Seam 1 - Machine/stage contract

Run workflow definitions/stages through the real pipeline executor with fixture inputs, frozen
configuration and the mock AI gateway. Assert:

- Input/output contracts.
- State transitions and attempts.
- Hard gates and approval waits.
- Budgets and retry rules.
- Artifact/provenance records.
- Run-manifest freezing.
- Domain/audit events.
- Fail-closed behavior.

### Seam 2 - HTTP application

Exercise route handlers against a real test PostgreSQL instance. Assert:

- Authentication, tenant isolation and RBAC.
- Workflow draft/version APIs.
- Approval policies/events.
- Registry lifecycle.
- Requests/calendars.
- Optimistic concurrency and idempotency.
- SSE snapshot/event recovery.

### Seam 3 - Browser critical journeys

Use Playwright as a thin but real browser layer for:

- FA-first RTL rendering.
- Keyboard operation.
- Workflow template and execution views.
- Review/approval/feedback forms.
- File preview boundaries.
- Jalali dates and bidi-safe identifiers.

Behavior logic remains primarily covered through Seams 1 and 2.

## 3. Test layers

1. Contract/schema tests.
2. Database constraint and migration tests.
3. Domain rule tests.
4. State-transition tests.
5. Prompt/gateway contract tests.
6. Source validation and evidence-slot tests.
7. Provenance and immutability tests.
8. Permission and approval-policy tests.
9. Workflow integration tests.
10. UI component/accessibility tests.
11. Visual RTL regression tests.
12. End-to-end vertical slice.
13. Golden creative regression after real approved examples exist.

## 4. Standing invariant tests

These are release blockers and may never be waived silently:

- A machine/stage failure never defaults to approval.
- A hard-gate failure cannot be offset by a high score.
- Published workflow versions cannot be edited.
- Approved artifact versions cannot be overwritten.
- Approval and audit history is append-only.
- An approval references an exact subject version.
- Self-approval is labeled and distinct-reviewer policy is enforced by actor identity.
- Missing Guardian/FA editorial/provider assignments produce named blocked states.
- Blocked evidence slots stay in the Research Plan denominator.
- A frozen-plan amendment requires an approval event and new version.
- Iranian/Persian and international research coverage are both non-zero.
- Redis loss does not lose run state or approvals.
- Queue duplication does not duplicate stage results/events/artifacts.
- Generated files/pages cannot access dashboard sessions or secrets.
- No shared UI component relies on LTR-only physical CSS.
- Workflow position changes do not change executable meaning.

## 5. Workflow definition tests

Test validators for:

- Missing/duplicate start or terminal nodes.
- Orphan/unreachable nodes.
- Illegal cycles.
- Named bounded revision/retry loops.
- Invalid ports and duplicate node/edge keys.
- Missing executor/validator/schema/approval policy.
- Wrong machine boundary order.
- Revision targeting outside permitted Machine 04 stages.
- Missing budgets/retry policy.
- Missing Persian message/aria keys.
- Publish with warnings versus blocking errors.
- Clone published version into a new draft.
- Semantic edit versus layout-only concurrency.

## 6. Workflow runtime tests

Scenarios:

1. Happy synthetic run across a small generic workflow.
2. Dependency wait then resume.
3. Human approval parks with no queue job.
4. Approval decision resumes exactly once.
5. Malformed AI output repairs once then succeeds.
6. Malformed AI output fails after one repair.
7. Infrastructure failure reaches `FAILED_RETRYABLE` then bounded retry.
8. Budget exhaustion escalates.
9. Cancel before run, during queued stage and during cancellable execution.
10. Redis flush then reconstruction from PostgreSQL.
11. Duplicate outbox/queue delivery remains idempotent.
12. Historical run retains original workflow/config versions after new publication.

## 7. React Flow component tests

- Domain-to-canvas adapter maps every node/state/edge correctly.
- Node actions call explicit APIs; client state alone cannot transition a run.
- Execution mode cannot create/remove semantic nodes.
- Viewer cannot see edit/publish actions and server rejects direct attempts.
- Inspector shows exact inputs/outputs/attempts/approval subject version.
- Sequence gap triggers graph snapshot refetch.
- Disconnect displays stale/reconnecting status.
- Auto-layout changes only layout records.
- Undo/redo does not rewrite published history.
- Node/edge keyboard focus and selection work.
- Structured list alternative contains equivalent state/action information.

## 8. RTL and Persian tests

Automated checks:

- `lang="fa-IR"` and `dir="rtl"` at root.
- Direction provider configured.
- No hardcoded user-facing strings in core components.
- No forbidden Arabic/Persian ی/ک codepoint issues in seeded strings.
- Logical CSS utilities in shared UI.
- IDs/URLs/citations use bidi isolation.
- Jalali render matches the stored UTC instant in Tehran time.
- Long Persian text does not clip in buttons, badges, tables, nodes or sheets.
- English glossary terms do not reverse punctuation or numbers.

Human `FA_EDITORIAL` review remains required for publishable content; automated tests cannot
certify natural Persian authorship.

## 9. Security tests

- Cross-workspace resource enumeration/access.
- Project-scope assignment escape.
- Role switching and acted-as role tampering.
- Subject creator attempting distinct-reviewer approval.
- Disabled membership with historical attribution intact.
- Prompt injection strings in reference content.
- Model-produced unknown registry IDs.
- Stored/rendered XSS through Markdown/HTML.
- Generated preview cookie/network isolation.
- Signed file access expiration and scope.
- Secret/log redaction.
- Stale workflow edit conflict.

## 10. Research tests

- Plan freezes before retrieval.
- Discovery source stays `CANDIDATE` until human promotion.
- Network reachable but content unavailable remains a gap.
- Blocked slot remains denominator.
- Qualified substitution fills only compatible slot and records rationale.
- Unqualified substitution is rejected.
- Critical gap blocks completion.
- Non-critical gap requires named human decision.
- Duplicate sources do not create false independence.
- Fact/interpretation/hypothesis remain typed.
- Every critical finding has claim-level citations.
- Deep reads stay within configured policy unless an approved amendment exists.

## 11. Accessibility acceptance

- WCAG 2.2 AA automated checks plus manual keyboard review.
- Workflow nodes/edges focusable and announced in Persian.
- Every drag/drop action has a form alternative.
- Focus returns correctly from dialog/sheet.
- Status never uses color alone.
- Reduced-motion mode removes animated workflow edges/transitions.
- Zoom does not make core text/actions inaccessible.
- Screen-reader structured workflow view covers the same stages/gates/status.

## 12. Performance budgets

Define and measure on the agreed baseline environment:

- Dashboard route initial interaction target.
- Program table filtering/pagination under expected V0 data.
- Workflow canvas: 250 visible nodes and 400 edges remain operable.
- Graph snapshot and incremental event payload sizes.
- SSE reconnect and sequence-gap recovery.
- Stage command latency excluding external AI work.
- No full raw evidence documents sent in graph node data.

Exact timing thresholds are recorded in CI after the baseline host/browser is chosen. Regressions
require an explicit decision, not a hidden threshold change.

## 13. Visual regression set

Capture core states in desktop/compact/mobile status mode:

- Login/invitation.
- Overview empty/active/blocked.
- Program list.
- Program overview.
- Workflow template editor and execution view.
- Approval sheet.
- Research coverage and source table.
- Direction comparison.
- Output Manifest and artifact preview.
- Request Feed and Calendar.
- Audit/run detail.

Include long Persian, mixed-direction content, no accent, active Lens accent, reduced motion and
high error density.

## 14. Release acceptance gates

Every release requires:

1. Green tests for affected layers.
2. Typecheck/lint/build.
3. Migration verification.
4. Independent code review.
5. Security review at required releases.
6. Updated documentation and traceability.
7. Tagged commit/release candidate.
8. Human-owner acceptance.

Do not start the next release while a blocking gate fails.

## 15. V0 end-to-end acceptance

One real project must demonstrate:

1. Structured brief and optional references.
2. 3-5 distinct Concept Cards and human decision.
3. Frozen dual-coverage Research Plan and 25-50 validated sources.
4. Traceable findings/candidates and contradiction map.
5. Three coherent Directions and Guardian-approved Concept Bible.
6. Output Manifest, stub specialized-agent artifact and embedded validation.
7. `FA_EDITORIAL` gate on a publishable Persian artifact.
8. Execution Manifest -> requests/calendar.
9. One Weekly Lens child workflow with current-context scan.
10. One scoped revision from Machine 05 to Machine 04.
11. Declared human/physical handoff without false QA claim.
12. Complete run manifest, provenance, cost and audit.
13. Same history correctly visible in dashboard and React Flow execution view.

