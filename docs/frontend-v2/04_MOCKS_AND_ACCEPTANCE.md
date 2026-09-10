# Mock scenarios, delivery plan and acceptance

## 1. Included seed data

`mock/seed.json` contains original, fictional Persian demo content: Program “Beautiful Imperfection”, concept alternatives, a revised concept, independently reviewed content, source coverage gaps, a ready package project and an approved-parent Weekly Lens. Every source uses a non-resolving `.invalid` URL and `isMock: true`; none claims real research.

`mock/scenarios.json` gives the fourteen inherited scenario requirements plus the new start modes, multiple branches, targeted revision, package/calendar and version-conflict cases. These are declarative fixture recipes and action expectations, not an implemented simulator. Claude must implement a scenario loader and deterministic mock command handlers, then validate every scenario with the repository's schemas. Each scenario overlays a fresh deep copy of the base state; never share mutable fixture objects across scenarios.

`mock/panel-contracts.ts` provides concrete starter DTOs and missing panel contracts. Integrate them with existing types and derive matching Zod validation at the boundary; the source is a contract scaffold, not a production SDK. Existing scenario entities from doc 18 (machines, workflow definitions/versions, runs/attempts, users/policies, approvals, artifacts, sources/gaps/requests, audit/notifications) remain mandatory. Extend this seed with existing repository fixtures rather than delete them or assume this one file covers all old entities.

## 2. Minimum visible data density

Use 6–8 project summaries distributed over meaningful stages, including empty/new, review, research, blocked, ready-package, scheduled and Weekly Lens. The detailed seed includes three projects; expand with scenario recipes or existing mocks to meet this UI density. Provide at least three concept cards in the main journey and four content items in an active branch. Use real Persian paragraphs, long titles, multi-line comments and mixed FA/EN labels; no lorem ipsum.

All IDs/timestamps are stable. Demo time starts 2026-09-06T09:00:00Z. Simulated latency, offline, forbidden, retryable/non-retryable failure and conflict are controlled by scenario, not random network errors. Mock discovery rotates through predefined batches with an explicit seed.

## 3. Updated P-series mapping

Inspect current repo state first; preserve completed compatible work. Do not reset the repository or repeat Ticket 0.1. Record this scope/navigation update with the next unused ADR, without re-ratifying unrelated proposed ADRs.

| Ticket | Updated scope |
| --- | --- |
| P1 | Five-destination shell, seven project tabs, approved tokens, RTL and responsive primitives |
| P2 | Preserve MachineGateway; panel/revision contracts, version-linked review and calendar/package DTOs |
| P3 | Deterministic seed, scenario recipes, shared repository, persistence and command behavior |
| P4 | Full start → concept → content → package → calendar card journey, inbox and global views |
| P5 | Synchronized graph with branches, localized loops, inspectors and definition inspection |
| P6 | Functional commands, version conflicts, errors, stale dependencies, downloadable mock ZIP |
| P7 | Behavior/contract checks plus responsive, RTL, keyboard and visual QA |
| P8 | Future integration mapping, unresolved contracts and frontend handoff; stop before machine work |

Proceed sequentially through unfinished tickets and the existing repository review gates. Do not finish after merely creating the shell or specifications. Any prescribed independent review process belongs to the target repository's instructions; this pack does not certify that it has occurred.

## 4. Acceptance journeys

| ID | Setup/action | Expected result |
| --- | --- | --- |
| A01 | Blank start with no text/file | Valid null input; run progresses to three concept cards |
| A02 | File/URL/text start | Reference snapshot visible, unsupported input rejected, no upload/fetch performed |
| A03 | Reject concept and revise | Required reason; old version retained; new reviewable version of same concept |
| A04 | Replace rejected concept | New ID with replacement lineage; old rejected card preserved |
| A05 | Comment without decision | Comment visible; approval status unchanged |
| A06 | Approve two of three and continue | Two independent research/content branches; third does not block them |
| A07 | Revise one content item | Only that item gets new version; other approved content unchanged |
| A08 | Persian/international evidence gap | Correct coverage counts, retrieval request and affected-item blocking |
| A09 | Approve all required fresh content | Automatic mock package assembly; nonempty versioned manifest and downloadable ZIP |
| A10 | Complete package without date | One unscheduled entry; choosing date places it on calendar |
| A11 | Complete package with target date | Exactly one planned calendar entry linked to package |
| A12 | Edit approved upstream concept | Affected descendants stale; old package retained; current readiness revoked |
| A13 | Generate package v2 | No calendar duplication; explicit update of linked version |
| A14 | Same action from inbox/card/graph | Identical result, one audit event, synchronized counts/statuses |
| A15 | Rapid double submit/retry command | One effect per commandId; stale revision rejected |
| A16 | Read-only actor tries decision | Action unavailable and mock command rejected; no mutation |
| A17 | Reload midway | Same data/versions/comments/date restored; no automatic reset |
| A18 | Start Weekly Lens | Approved parent/Bible required and retained; no unapproved parent accepted |
| A19 | Timeout/offline while revising | Error and feedback preserved; no fake success; retry does not erase history |
| A20 | Keyboard/mobile review and date edit | Complete journey usable without graph drag or mouse |

## 5. Verification scope

Use meaningful adapter-contract and behavior tests for the invariants above. Preserve the repo's required frozen check commands and gates. Run browser walkthroughs at desktop and mobile with screenshots of overview, concept review, content revision, graph and calendar. Inspect generated ZIP contents against its manifest. Verify external network calls are absent in demo mode. Do not claim E2E success if no browser run occurred.

Final build report must distinguish implemented features, actual checks, remaining gaps and live-integration exclusions. Include run commands, preview URL when available and the selected demo scenario. After P8, hand off the frontend; machine work never starts automatically.
