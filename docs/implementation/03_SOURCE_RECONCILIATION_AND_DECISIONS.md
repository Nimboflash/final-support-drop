# Source Reconciliation and Decisions

## 1. Why this file exists

The provided sources were created at different stages. This file records which statement the
implementation follows when older decks, the frozen baseline and later ADR-derived documents
use different language.

## 2. Source roles

| Source | Role in implementation |
|---|---|
| Brand DNA v3.0 MD | Authoritative permanent brand constitution |
| Project Master Document, 2026-08-15 | Consolidated product/system definition derived from ADRs 0001-0009 |
| Spec V0, 2026-08-15 | Agent-ready product requirements and acceptance stories |
| Execution Plan, 2026-08-15 | Build sequencing, tickets, gates and verification |
| Master Build Spec v1.0, 2026-08-13 | Frozen architecture baseline and detailed machine behavior |
| Brand DNA Lite FA PDF | Presentation summary and visual direction; non-authoritative on conflicts |
| Logo Concept Final Station PDF | Visual exploration/reference, not a complete final application guide |
| ADR 0010 in this pack | Dashboard and workflow UI decision only |

## 3. Resolved conflicts

### 3.1 Food and drink hierarchy

**Conflict:** The Lite deck describes DROP as beverage-led. Brand DNA v3.0 explicitly states
that food and drink are equal expressions of Taste and neither supports the other.

**Decision:** Follow Brand DNA v3.0. Do not encode beverage-first copy, categories, navigation,
ranking or prompts as a permanent brand rule.

### 3.2 Research geography

**Conflict:** The earlier Master Build Spec freezes V0 research as international. Later
ADR-derived documents require both Iranian/Persian and international evidence, with neither
coverage class equal to zero.

**Decision:** Dual coverage is canonical. International-only completion is invalid. Blocked
Persian or international evidence remains visible in the frozen plan denominator.

### 3.3 Roles and capabilities

**Conflict:** The older baseline lists eight broad roles. ADR-derived documents separate
administrative roles from capabilities and use seven canonical roles.

**Decision:** Implement these administrative roles:

```text
WORKSPACE_OWNER
DROP_GUARDIAN
PROJECT_LEAD
REVIEWER_EDITOR
CONTRIBUTOR
VIEWER
TECHNICAL_MAINTAINER
```

Represent domain expertise, external-specialist access, operator-like access and
`FA_EDITORIAL` as capabilities and scoped assignments, not additional fixed authority roles.
This keeps competence separate from approval power.

### 3.4 Project and Program terminology

**Conflict:** Earlier data contracts use `Project`; later ADR-derived documents define a deep
`Program` as the product of the full pipeline.

**Decision:** Keep both concepts:

- `Project` is the collaborative work container, schedule and access scope.
- `Program` is the creative system produced within it and owns `program_type`, `lens_mode`,
  Concept Bible and Lens territories.
- `WeeklyLens` is a child of `Program`.

V0 may enforce one active Program per Project through a policy, not a database assumption.

### 3.5 Workflow order

**Decision:** The canonical top-level order is Machine 01 -> 02 -> 03 -> 04 -> 05. Specialized
output agents execute within Machine 04. Machine 05 creates calendar/feed/handoff and may route
revision back to Machine 04. No other top-level machine is introduced by the UI graph.

### 3.6 QA

**Decision:** There is no Machine 06. Validation is embedded in each machine and at platform
boundaries. Machine 05 can route human review but cannot certify unobservable physical work.

### 3.7 Workflow status vocabulary

**Conflict:** The baseline and later ADR-derived documents use slightly different run-state
labels.

**Decision:** Persist the canonical stage-run states in `07_WORKFLOW_RUNTIME_AND_MACHINE_CONTRACTS.md`.
UI labels such as "blocked" or "in review" are derived display categories and never separate
sources of truth.

### 3.8 Dashboard technology

**Earlier state:** The dashboard visual system was open.

**Decision:** ADR 0010 selects shadcn/ui plus React Flow. This changes presentation and adds a
versioned workflow-definition/editor capability; it does not change machine responsibility.

### 3.9 React Flow template licensing

**Fact:** The referenced AI Workflow Editor is presented as a Pro template.

**Decision:** Add `REACT_FLOW_PRO_LICENSE_CONFIRMED` as a build-time governance flag. Until it
is explicitly true, use only `@xyflow/react`, open-source components and MIT examples. Never copy
Pro template source from an unauthorized context.

### 3.10 Brand color values and typography

**Conflict/gap:** The sources identify Charcoal, Paper/White, Concrete Grey, Aluminium and a
single variable Lens color, while the exact application values are routed to a missing visual
identity guide. The Lite deck shows Oxide Red and Acid Lime but does not make both permanent
simultaneous accents.

**Decision:** Centralize all values as tokens and mark the initial values `PROVISIONAL`.
Implement one runtime `lensAccent` slot. Do not hard-code deck colors across components.

### 3.11 Wordmark and DOT

**Decision:** Follow Brand DNA v3.0: the approved horizontal DROP wordmark is primary and DOT is
a flexible secondary device. The logo concept PDF provides behavior references but does not
authorize arbitrary replacement of the wordmark with exploratory marks.

### 3.12 Public landing pages

**Conflict/gap:** Landing pages are required output types, while automated publishing is out of
scope.

**Decision:** Machine 04 may generate a landing-page artifact bundle and the dashboard may
preview/export it. Publishing to a public origin requires a separate explicit approval and
future publishing adapter. The internal OS and public runtime are not silently coupled.

### 3.13 Human owner identity

**Gap:** The execution plan names a human owner, but production identity and exact email are not
safe implementation constants.

**Decision:** Never hard-code a person's name as authority. Seed development actors only.
Production UAT remains blocked until the Workspace Owner, DROP Guardian and `FA_EDITORIAL`
holder are explicitly assigned.

## 4. Decisions intentionally left configurable

- AI provider and model profiles.
- Exact brand tokens and final typography.
- Source subscriptions and credentials.
- Scoring weights after calibration.
- Specialized output-agent creative logic.
- External calendar, messaging and publishing integrations.
- Detailed physical lead times.
- Multi-user live co-editing of a workflow canvas; not in V0.

## 5. Change rule

If engineering discovers that any decision above changes data ownership, security, approval
authority, immutable history, machine responsibility or deployment portability, write and
approve a new ADR before implementation.

