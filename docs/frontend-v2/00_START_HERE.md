# DROP Studio OS — Frontend V2 delivery

Date: 2026-09-06. Language: English implementation instructions; Persian product UI.

Build an interactive, polished operational frontend on deterministic mocks. The backend and machines are being built separately. This is the updated dashboard implementation brief, not a request to build the machine system or the public website.

## Read order

1. `01_PRODUCT_AND_WORKFLOW.md` — governing scope update and behavior.
2. `02_SCREENS_AND_DESIGN.md` — navigation, tabs, layouts and interactions.
3. `03_DOMAIN_AND_INTEGRATION.md` — ownership, commands and future connection.
4. `04_MOCKS_AND_ACCEPTANCE.md` — scenarios and build completion criteria.
5. `05_CLAUDE_BUILD_PROMPT.md` — copy into Claude with this entire folder attached.
6. `mock/seed.json`, `mock/scenarios.json`, `mock/panel-contracts.ts` — concrete starting data and contracts.
7. `reference/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md` — preserved previous boundary and MachineGateway interface.

## Source and precedence

The latest user workflow and frontend-only instruction govern this delivery's scope and interactions. Preserve Brand DNA v3.0 for brand principles. This update narrows doc 18: no supporting backend is required or requested now. Preserve compatible ADRs and governance; record the scope change using the repository's existing next available ADR number. Do not claim prior pending ADRs were ratified by this file.

This pack was reconciled against the supplied conversation/build report, the original doc 18, selected local Brand DNA v3.0 passages, and the user's approved color values. The live repository and its current P-ticket implementation were not audited. Do not assume the August commit remains current.

This is a standalone replacement brief for the active frontend build. It does not bundle the old 18-document implementation plan, whose machine and infrastructure instructions are deferred. The original brand and frozen source files remain in the existing repository; preserve them.

## Changes from the earlier plan

| Previous ambiguity | Current direction |
| --- | --- |
| Generic machine dashboard | Work-centered journey: start → concept cards → content cards → package → calendar |
| Minimum backend permitted | Frontend only, browser mock persistence; machines and backend external |
| Start depended on input | Either explicit null input or user reference |
| Generic approval gate | Version-specific concept and content review, comments and targeted revision |
| All stages treated equally | Daily work uses cards and project tabs; graph explains the same state |
| Many top-level modules | Five primary destinations plus settings |
| Provisional brand base | Approved four DROP colors are now specified |
| Calendar was secondary | Package completion creates a calendar item or a visible unscheduled item |
| Template editor mixed with execution | Execution graph primary; template inspection retained, editing deferred |
| One generic gateway | Preserve MachineGateway; additive panel-facing contract covers missing UI operations |

## Delivery boundary

These files are specifications, contracts and seed data for implementation, not a finished application. Do not import the mock JSON into page components. No real research, AI output, approval authority, publication, or calendar booking is represented by the fixtures.
