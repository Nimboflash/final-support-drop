# DROP Studio OS - Implementation Pack

**Pack version:** 1.0  
**Date:** 2026-08-21  
**Status:** Ready for engineering implementation  
**Purpose:** Implementation companion to the frozen DROP Studio OS specifications  
**Primary builder:** Claude Code or an equivalent governed coding workflow

## 1. What this pack is

This pack converts the approved DROP product, brand and system documents into build-ready
engineering contracts for the dashboard, workflow runtime and workflow graph.

It does **not** replace or rewrite the frozen Master Build Spec v1.0. It adds the implementation
detail needed to use:

- `shadcn/ui` as the dashboard component and design-system foundation.
- React Flow and the React Flow AI Workflow Editor pattern as the workflow visualization and
  authoring foundation.
- The existing five-machine architecture, governed approvals, provenance, FA-first RTL product,
  Iranian-first deployment and Program -> Weekly Lens hierarchy.

Material decisions introduced here are recorded in `02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md`.

## 2. Read order for a builder

Read these files in order before implementation:

1. `00_READ_ME_FIRST.md`
2. `01_EXECUTIVE_IMPLEMENTATION_BRIEF.md`
3. `02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md`
4. `03_SOURCE_RECONCILIATION_AND_DECISIONS.md`
5. `04_PRODUCT_SURFACES_AND_INFORMATION_ARCHITECTURE.md`
6. `05_TECHNICAL_ARCHITECTURE_AND_REPOSITORY.md`
7. `06_DOMAIN_MODEL_AND_DATABASE.md`
8. `07_WORKFLOW_RUNTIME_AND_MACHINE_CONTRACTS.md`
9. `08_REACT_FLOW_EDITOR_IMPLEMENTATION.md`
10. `09_DASHBOARD_DESIGN_SYSTEM.md`
11. `10_API_EVENTS_AND_REALTIME.md`
12. `11_SECURITY_RBAC_APPROVALS_AND_AUDIT.md`
13. `12_AI_RESEARCH_AND_ARTIFACT_INFRASTRUCTURE.md`
14. `13_DEPLOYMENT_AND_OPERATIONS.md`
15. `14_TESTING_QA_AND_ACCEPTANCE.md`
16. `15_RELEASE_PLAN_AND_TICKETS.md`
17. `16_CLAUDE_CODE_BUILD_PROTOCOL.md`
18. `17_TRACEABILITY_MATRIX.md`

Then read the original authoritative sources listed in Section 3.

## 3. Source hierarchy

When two documents appear to conflict, apply this order:

1. `DROP_BRAND_DNA_v3.0` for permanent brand truth.
2. Approved ADRs 0001-0009. Their consolidated decisions are represented in the dated
   `project-master-document.md`, `spec-v0.md` and `execution-plan.md` files.
3. `project-master-document.md` dated 2026-08-15.
4. `spec-v0.md` dated 2026-08-15.
5. `execution-plan.md` dated 2026-08-15.
6. This pack's ADR 0010 for dashboard and workflow UI implementation only.
7. `DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0` dated 2026-08-13.
8. The Brand DNA Lite PDF and logo concept deck as visual/context references only. They cannot
   override Brand DNA v3.0.

If a material conflict is not resolved in `03_SOURCE_RECONCILIATION_AND_DECISIONS.md`, stop and
write a new ADR. Do not invent a silent resolution in code.

## 4. Non-negotiable system rules

- The product is a versioned creative operating system, not a giant chatbot.
- The five top-level machines remain 01 -> 02 -> 03 -> 04 -> 05.
- Specialized output agents belong to the Machine 04 production boundary.
- Machine 05 is the end of the system pipeline. There is no Machine 06.
- A full run creates a deep Program. Weekly Lenses are lighter child editions derived from an
  approved Program/Concept Bible plus a current-context scan.
- PostgreSQL is authoritative. Redis contains reconstructable dispatch state only.
- Published workflow definitions, approved artifacts, approvals and run manifests are immutable.
- Missing inputs, human approvals, validators or valid AI output block progression.
- All permissions are enforced server-side.
- All human-facing product UI is FA-first and RTL from the first component.
- Publishable Persian artifacts require a human with the `FA_EDITORIAL` capability.
- Research requires Iranian/Persian and international evidence; neither coverage class may be
  zero.
- The system must remain useful in manual mode when no AI provider is configured.
- No mandatory Western PaaS, remote font, CDN, proxy or restriction-bypass dependency is allowed.
- Physical execution and general venue operations remain outside DROP Studio OS.

## 5. Implementation discipline

1. Build only one approved ticket at a time.
2. Freeze contracts before opening parallel implementation lanes.
3. Put business rules in shared packages, never in route handlers or React components.
4. Write tests at the machine/stage and HTTP seams before implementation.
5. Keep workflow semantics separate from canvas coordinates and visual styling.
6. Treat retrieved documents and webpages as untrusted data.
7. End every ticket with tests, independent review, a commit and a structured handoff.
8. Stop at every release gate until the human owner accepts it.

## 6. What to build first

The first implementation milestone remains Release 0 foundation, amended by ADR 0010:

- pnpm monorepo and Docker Compose reference stack.
- Core contracts and database schemas.
- Identity, RBAC, approvals and audit.
- artifact, prompt, rule, example and machine-run registries.
- provider-agnostic AI gateway with a mock adapter.
- PostgreSQL-authoritative pipeline runtime.
- shadcn/ui FA-first RTL application shell.
- versioned workflow-definition registry.
- React Flow template editor shell and read-only execution view.
- Project/Program list, audit view and one synthetic workflow run.

Do not begin full creative prompt calibration or Machines 02-05 during the first coding session.

## 7. Required decisions that are gates, not reasons to stall

The following do not block most Release 0 work:

- React Flow Pro license: use only open-source React Flow until the license is confirmed.
- Final typefaces and exact brand color values: use centralized temporary tokens and replace
  them when the visual identity application guide is approved.
- Live AI providers: use mock adapters.
- Real human role holders: use seeded development actors; production approval gates remain
  blocked until assignments exist.
- First real project brief: use synthetic fixtures for mechanics only, never taste calibration.

## 8. Completion definition for this pack

The implementation is conformant only when the requirements in
`14_TESTING_QA_AND_ACCEPTANCE.md` and the release exit criteria in
`15_RELEASE_PLAN_AND_TICKETS.md` pass. A convincing UI demo without provenance, state guards,
permissions, persistence and failure handling is not an accepted build.
