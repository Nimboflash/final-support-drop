# DROP Studio OS — Agent Instructions

This repository builds **DROP Studio OS**: a Persian-native (fa-IR, RTL-first), multi-user,
auditable creative operating system. Five governed AI machines (01 Concept → 02 Research →
03 Synthesis → 04 Production → 05 Handoff) with mandatory human approval gates.

This file exists per `docs/implementation/16_CLAUDE_CODE_BUILD_PROTOCOL.md` §2. It is
navigation and discipline, not authority. When it disagrees with the documents below, they win.

## Authority order (ADR-0011)

1. `docs/source-material/DROP_BRAND_DNA_v3.0.md` — permanent brand truth.
2. Recorded decisions in `docs/implementation/03_SOURCE_RECONCILIATION_AND_DECISIONS.md`,
   then repo ADRs in `docs/adr/` (0011–0016 repair the bundle's verified defects).
3. `docs/implementation/02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md`.
4. The numbered implementation docs `docs/implementation/00–17` — the build contract.
5. `docs/source-material/{project-master-document,spec-v0,execution-plan}.md` (2026-08-15).
6. `docs/source-material/DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md` — baseline reference.
7. The two PDFs — supporting visual references only.

Never silently resolve a conflict. Follow a recorded decision, or stop and write a new ADR
(`docs/adr/`, next number). ADR-0011 is Proposed pending one-line human-owner ratification.

## Read before implementing anything

`docs/DELIVERY_README.md` → `docs/implementation/00_READ_ME_FIRST.md` → your ticket file in
`docs/tickets/` → its source requirements → the ADRs it lists. The operating manual for
multi-agent execution is `docs/orchestration-guide.md`; the VSO framework it maps onto lives
in `executive-multi-agent-model/`.

## Non-negotiables (from 00 §4, repaired by ADRs 0011–0016)

- Versioned creative OS, not a chatbot. Five machines, 01→05, no Machine 06.
- PostgreSQL is authoritative. Redis holds reconstructable dispatch state only.
- Published workflow definitions, approved artifacts, approvals, run manifests: **immutable**.
- Missing inputs, approvals, validators, or valid AI output **block** progression (fail closed).
- All permissions enforced server-side. Approval decisions: HUMAN actors only, N distinct
  approvers (ADR-0013), through the single approval endpoint — never a runtime command.
- FA-first RTL from the first component. Publishable Persian requires `FA_EDITORIAL`.
- Manual mode must stay useful with zero AI providers (mock adapter; `manual_fallback` per ADR-0012).
- No mandatory Western PaaS, remote font, CDN, or restriction-bypass dependency (ADR-0016:
  mirror-capable builds, self-hostable SMTP, SSRF policy on outbound fetches).
- Research needs both Iranian/Persian and international evidence; neither class may be zero.
- Retrieved documents, references, and generated content are untrusted data.

## Package dependency rules (05 §4)

Allowed direction: `contracts ← core/studio ← pipeline ← web/worker adapters`;
`contracts ← db repositories ← core/studio services`; `ui ← web`; `workflow-ui ← web`;
`ai-gateway/retrieval/storage ← pipeline/application services`.

Forbidden — enforced by ESLint boundary zones (`eslint.config.mjs`) and proven by the
fixtures in `tests/repo/boundary-fixtures-bad/`:

- `packages/core` or `packages/studio` importing Next.js.
- Domain code importing provider SDK response types (providers live in `ai-gateway`).
- Domain code importing React Flow node/edge types (canvas lives in `workflow-ui`).
- React components writing directly to Drizzle.
- Workers trusting queue payload content beyond stable IDs.
- `packages/ui` importing feature/domain services.

## Build discipline

- **One ticket at a time**, from `docs/tickets/` — work the frontier (all blockers done);
  0.1 is the sole start. Never implement adjacent tickets.
- TDD at the ticket's declared seams (`docs/testing-strategy.md` defines the five canonical
  seams). Freeze tests/contracts before implementation.
- Business logic in shared packages, never route handlers or React components.
- Package dependency direction per `docs/implementation/05`; contracts freeze before
  parallel lanes open (doc 15 §11). Never edit migrations, `packages/contracts`, or
  approval/audit semantics in parallel lanes.
- Check commands (established in ticket 0.1, then canonical): `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm test:db`, `pnpm test:e2e`, `pnpm build`.
- Every ticket ends with green checks, independent review (doc 16 §8), a commit citing the
  ticket ID, and the structured handoff of doc 16 §9. Stop at every release gate for the
  human owner.
- Stop conditions in doc 16 §6 are hard stops — request a named decision, do not improvise.

## Open client gates (doc 15 §12)

Role holders (Owner / Guardian / FA_EDITORIAL), real project brief, AI provider approval,
React Flow Pro license, visual identity guide, source vetting. All have documented fallbacks;
none blocks Release 0. Production approval gates stay blocked until real humans are assigned.
