# Traceability Matrix

## 1. Requirement group mapping

| Requirement group | Primary source | Implementation docs | Release | Primary verification |
|---|---|---|---|---|
| Workspace, identity, roles | Spec V0 stories 1-9; ADR-derived master | 06, 10, 11 | R0 | HTTP/RBAC/audit integration |
| Projects and briefs | Stories 10-13 | 04, 06, 10 | R0-R1 | Contract/HTTP/E2E |
| Machine 01 | Stories 14-18; Master §6 | 06, 07, 15 | R1 | Pipeline seam + real brief gate |
| Machine 02 | Stories 19-32; ADR 0004/0008; Master §7 | 06, 07, 12, 15 | R2 | Evidence-slot/source/provenance tests |
| Machine 03 | Stories 33-38; Master §8 | 06, 07, 15 | R3 | Hard-gate/direction/approval tests |
| Machine 04 | Stories 39-43; Master §9 | 06, 07, 12, 15 | R4 | Agent contract/validation/artifact tests |
| Machine 05 | Stories 44-49; Master §10 | 04, 06, 07, 10, 15 | R5 | Request/dependency/revision E2E |
| Weekly Lens | Stories 50-52; ADR 0001; Brand DNA §8 | 04, 06, 07, 15 | R5 | Child-workflow/current-scan/gate tests |
| Persian-native | Stories 53-57; ADR 0005; Brand DNA §13 | 09, 14 | R0 onward | RTL/bidi/FA editorial tests |
| Runs and audit | Stories 58-63; ADR 0009 | 06, 07, 10, 11 | R0/R6 | Manifest/immutability/comparison tests |
| Platform/failure | Stories 64-72; ADRs 0003/0006/0007 | 05, 11, 12, 13, 14 | R0/R6 | Recovery/security/deployment tests |
| Dashboard | Master §15; current request | ADR 0010; 04, 09 | R0 onward | Browser/visual/accessibility |
| Workflow graph/editor | Current request; React Flow reference | ADR 0010; 06-10 | R0 onward | Definition/runtime/canvas tests |
| Brand visual/voice | Brand DNA v3 §§12-17; visual PDFs | 03, 09 | R0 onward | Token/copy/visual review |

Document numbers in the table refer to this pack.

## 2. ADR 0010 decision-to-code mapping

| Decision | Intended code location | Key test |
|---|---|---|
| shadcn ownership | `packages/ui` | RTL component/render tests |
| React Flow core | `packages/workflow-ui` | adapter and keyboard tests |
| Definition/run separation | `packages/contracts`, `db`, `pipeline` | published version + historical run immutability |
| PostgreSQL authority | `db`, `pipeline` | Redis-loss reconstruction |
| Zustand ephemeral only | `workflow-ui` | refresh/browser-loss persistence |
| Top-to-bottom layout | `workflow-ui/layout` | layout snapshot, no semantic diff |
| Published immutability | `core/studio` services + DB | prohibited update at HTTP/DB seams |
| SSE events | web API + query cache | ordered events and sequence-gap recovery |
| One Lens accent | `packages/ui/theme` | contrast and no competing accent visual test |
| Accessibility | `packages/ui`, `workflow-ui` | keyboard/list-alternative/WCAG checks |

## 3. Source conflict resolutions

| Conflict | Decision | Enforced by |
|---|---|---|
| Beverage-led Lite copy vs equal food/drink | Brand DNA v3 wins | Rule seed/copy review |
| International-only research vs dual coverage | Dual coverage wins | Research Plan schema/gate tests |
| Legacy broad roles vs role/capability split | 7 roles + capabilities | RBAC seed and approval tests |
| Project vs Program | Separate work container/product entities | Contracts/database |
| Static diagram vs operating graph | Persisted workflow/run graph | ADR 0010/runtime tests |
| Default shadcn theme vs DROP identity | Customized token system | UI package/visual QA |
| Pro template availability | License gate | Config/dependency/repository review |
| Exact colors absent | Provisional centralized tokens | Theme config + open gate |
| Landing output vs no auto publish | Preview/export only | Artifact sandbox and feature flag |

## 4. Critical invariants and owning tests

| Invariant | Owning suite |
|---|---|
| Failure never approves | Pipeline state/gate integration |
| Hard gate beats score | Machine 03 domain/pipeline |
| Blocked slots remain denominator | Research coverage domain |
| Frozen plan change is approved/versioned | HTTP + research integration |
| Approval is actor+role+subject version | RBAC/approval integration |
| Published history immutable | DB + HTTP negative tests |
| Redis state reconstructable | Workflow recovery integration |
| Canvas position non-semantic | Workflow definition/layout tests |
| Persian-first RTL | Component + Playwright |
| Generated preview isolated | Security E2E |
| Provider missing keeps manual UI alive | Application E2E |
| Machine 05 cannot claim physical QA | Request/handoff domain tests |

## 5. Open implementation gates

| Gate | Status at pack creation | Blocks |
|---|---|---|
| React Flow Pro license | Not confirmed | Direct use of Pro template source only |
| Final visual identity values/type | Not supplied | Final visual sign-off, not R0 structure |
| Workspace Owner assignment | Not confirmed in system | Production UAT |
| DROP Guardian assignment | Not confirmed in system | Rule/direction production approvals |
| `FA_EDITORIAL` holder | Not confirmed in system | Publishable Persian approval |
| Real project brief | Pending for build | R1 creative acceptance |
| Live AI provider/config | Pending | Live AI execution only |
| Persian/Iranian source vetting | Pending client track | R2 production research |

## 6. Definition of traceability complete

A release is traceable when every delivered ticket links to:

- Source requirement or ADR.
- Contract/schema version.
- Migration when relevant.
- Implementation commit.
- Tests and acceptance evidence.
- Approval/release gate.

Chat messages, screenshots or a canvas layout without those links are supporting evidence only,
not the system of record.

