# DROP Studio OS — Claude Delivery Bundle

**Status:** Ready to attach to Claude  
**Language:** The implementation package and delivery instructions are in English. Original brand and visual references are preserved unchanged.

## How to use this bundle

1. Attach this entire ZIP file to Claude.
2. Ask Claude to read this file first.
3. Then ask Claude to read `implementation/00_READ_ME_FIRST.md` and follow the documented reading order.
4. Start implementation with **Release 0, Ticket 0.1 only**, using the operating prompt in `implementation/16_CLAUDE_CODE_BUILD_PROTOCOL.md`.
5. Require Claude to validate each ticket before moving to the next one. Do not ask it to build the whole platform in a single pass.

## Bundle contents

### `implementation/`

This directory contains the complete 18-file English build package:

- product scope, surfaces, information architecture, and decisions;
- technical architecture, repository structure, database, API, and events;
- workflow runtime and React Flow editor implementation;
- shadcn/ui dashboard and design-system specifications;
- RBAC, approvals, audit, AI, research, artifact storage, and operations;
- testing, acceptance criteria, release plan, implementation tickets, and traceability;
- a Claude Code execution protocol for controlled ticket-by-ticket delivery.

### `source-material/`

This directory contains the seven original inputs used to produce the implementation package:

| File | Role |
|---|---|
| `DROP_BRAND_DNA_v3.0.md` | Authoritative permanent brand source |
| `project-master-document.md` | Authoritative product and architecture source, subject to recorded decisions |
| `spec-v0.md` | Authoritative scope and implementation source, subject to recorded decisions |
| `execution-plan.md` | Authoritative release and execution source, subject to recorded decisions |
| `DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md` | Baseline build specification |
| `DROP_BRAND_DNA_LITE_FA.pdf` | Supporting brand reference; does not override Brand DNA v3.0 |
| `DROP_LOGO_CONCEPT_FINAL_STATION.pdf` | Supporting visual and logo reference; does not override Brand DNA v3.0 |

Some original sources are bilingual, Persian, or primarily visual. They are intentionally included without translation or alteration so Claude can consult the original evidence. All implementation-facing documents are in English.

## Required reading order

1. `DELIVERY_README.md`
2. `implementation/00_READ_ME_FIRST.md`
3. `implementation/01_EXECUTIVE_IMPLEMENTATION_BRIEF.md`
4. `implementation/02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md`
5. `implementation/03_SOURCE_RECONCILIATION_AND_DECISIONS.md`
6. Continue through `implementation/17_TRACEABILITY_MATRIX.md` in numeric order.
7. Consult `source-material/` whenever a requirement needs confirmation or visual/brand grounding.

## Authority hierarchy

When files disagree, use this order:

1. `source-material/DROP_BRAND_DNA_v3.0.md` for permanent brand truth.
2. Decisions recorded in `implementation/03_SOURCE_RECONCILIATION_AND_DECISIONS.md` for reconciled product and technical conflicts.
3. `implementation/02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md` for dashboard and workflow-editor decisions.
4. The remaining numbered implementation documents for the build contract.
5. `project-master-document.md`, `spec-v0.md`, and `execution-plan.md` as underlying authoritative sources where no recorded decision supersedes them.
6. `DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md` as the baseline implementation reference.
7. The Lite Brand DNA and logo PDF as supporting references only.

Do not silently choose between conflicting requirements. Follow the recorded decision, or stop and request a new ADR when no decision exists.

## First implementation instruction for Claude

Use the prompt in `implementation/16_CLAUDE_CODE_BUILD_PROTOCOL.md`. Implement **Release 0, Ticket 0.1** only. Return the files changed, tests run, acceptance evidence, open risks, and the recommended next ticket before continuing.
