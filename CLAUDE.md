# DROP Studio OS — Agent Instructions

This repository builds **DROP Studio OS**: a Persian-native (fa-IR, RTL-first), multi-user,
auditable creative operating system. Five governed AI machines (01 Concept → 02 Research →
03 Synthesis → 04 Production → 05 Handoff) with mandatory human approval gates.

This file exists per `docs/implementation/16_CLAUDE_CODE_BUILD_PROTOCOL.md` §2. It is
navigation and discipline, not authority. When it disagrees with the documents below, they win.

## Current scope (ADR-0017, narrowed by ADR-0019, restructured by ADR-0020 — read this first)

**Panel first, and now frontend only.** This delivery builds the operational dashboard/control
panel and the workflow graph on deterministic typed mocks — nothing else. ADR-0019 D2 withdrew
doc 18 §4.2's permission for mock API routes and a local mock server: there is **no backend in
this scope**. Demo state lives in one versioned browser key `drop-panel-demo-v2`, validated on
hydration, with Reset Demo on corrupt data.

Machines 01–05, their runtime, queues, DB infrastructure and AI providers are a **separate
build** connected later through the `MachineGateway` adapter
(`docs/implementation/18_SCOPE_CORRECTION_PANEL_FIRST_AND_MOCK_MACHINES.md`; the owner's V2
narrowing is `docs/frontend-v2/`). Active tickets are the P-series in `docs/tickets/`, run
**strictly sequentially** (ADR-0018 D2, ADR-0019 D20, ADR-0020: P1-R → P2 → … → P8 → P9);
tickets 0.2–0.16 are deferred or superseded per ADR-0017 D2. `apps/worker` and the eleven
machine-oriented packages are **implementation-frozen** (ADR-0018 D3). Never add machine logic,
provider calls, or machine infrastructure here. **P8's hard stop holds**: it stops machine work,
and P9 is panel presentation only.

The product journey the panel serves is unchanged; **how the panel is organised around it is
not** (ADR-0020). The journey: start with `input=null` or a reference → concept cards →
approve/reject/comment and selectively regenerate → research and content per approved concept →
review and regenerate each content item independently → an automatically assembled versioned
output → a calendar entry, or the unscheduled tray when no date exists.

The panel is organised by **work unit, not by process stage** (ADR-0020 D2). Six destinations —
نمای کلی, کانسپت‌ها, محتوا, خروجی‌ها, تقویم, Engine — each answering exactly one question. A
project is a **filter carried in the URL**, never a destination; settings and history sit in a
secondary menu. Execution detail has one home, Engine (D4), which is what let the content
surfaces shed process furniture without losing it.

The interface speaks the user's units (ADR-0020 D5), and this is enforced, not merely intended:
`tests/repo/interface-language.test.ts` fails on a ticket name, a gateway or dependency word, a
version label, a raw identifier or the noun «بسته» in any surface string. Recorded domain
vocabulary is **not renamed** to satisfy it — the rule is that no panel surface renders that
vocabulary directly.

## Authority order (ADR-0011, amended by ADR-0017, ADR-0019 and ADR-0020)

1. `docs/source-material/DROP_BRAND_DNA_v3.0.md` — permanent brand truth.
2. `docs/frontend-v2/` — the owner's V2 pack, **build scope only** (ADR-0019 D1). Within it,
   `06_SIMPLIFICATION_BRIEF.md` governs the panel's **presentation and information
   architecture** and supersedes the earlier V2 documents wherever they disagree (ADR-0020 D1).
3. `docs/implementation/18_...` — **build scope** (panel-first; ADR-0017 D1).
4. Recorded decisions in `docs/implementation/03_SOURCE_RECONCILIATION_AND_DECISIONS.md`,
   then repo ADRs in `docs/adr/` (0011–0016 repair the bundle's verified defects; 0019 seats
   the V2 pack; 0020 adopts the simplification brief).
5. `docs/implementation/02_ADR_0010_DASHBOARD_AND_WORKFLOW_UI.md`.
6. The numbered implementation docs `docs/implementation/00–17` — the build contract
   (product language, domain concepts, states, RBAC/approval/audit semantics, and future
   integration contracts; their machine-build instructions are deferred by ADR-0017).
7. `docs/source-material/{project-master-document,spec-v0,execution-plan}.md` (2026-08-15).
8. `docs/source-material/DROP_STUDIO_OS_MASTER_BUILD_SPEC_v1.0.md` — baseline reference.
9. The two PDFs — supporting visual references only.

The V2 pack governs **scope** — what is built, the navigation, the journey, the tokens. It does
not govern domain vocabulary, workflow states or approval semantics; those stay with the ADRs,
reached through projection adapters (ADR-0019 D5, D6, D7, D12).

Never silently resolve a conflict. Follow a recorded decision, or stop and write a new ADR
(`docs/adr/`, next number). ADR-0011 is **ratified** (owner, 2026-08-21; ADR-0018 D5).

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
  0.1 is the sole start. Never implement adjacent tickets. Current frontier order
  (ADR-0019 D20): P1-R → P2 → P3 → P4 → P5 → P6 → P7 → P8.
- TDD at the ticket's declared seams (`docs/testing-strategy.md` defines the five canonical
  seams). Freeze tests/contracts before implementation.
- Business logic in shared packages, never route handlers or React components.
- Package dependency direction per `docs/implementation/05`; contracts freeze before
  parallel lanes open (doc 15 §11). Never edit migrations, `packages/contracts`, or
  approval/audit semantics in parallel lanes.
- Check commands (established in ticket 0.1, then canonical): `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm test:db`, `pnpm test:e2e`, `pnpm build`. **CI runs all six**
  (`.github/workflows/checks.yml`) on every push and every PR to `main`; `tests/repo/ci.test.ts`
  fails if the workflow stops running one of them. Adding a seventh check means adding it in
  three places — the manifest, the workflow, and that guard's list — and the guard enforces it.
- Every ticket ends with green checks, independent review (doc 16 §8), a commit citing the
  ticket ID, and the structured handoff of doc 16 §9. Stop at every release gate for the
  human owner.
- Stop conditions in doc 16 §6 are hard stops — request a named decision, do not improvise.

## Open client gates (doc 15 §12, amended by ADR-0019 D14)

Role holders (Owner / Guardian / FA_EDITORIAL), real project brief, AI provider approval,
React Flow Pro license, source vetting. All have documented fallbacks; none blocks Release 0.
Production approval gates stay blocked until real humans are assigned.

**Visual identity is now partially closed.** The owner approved four DROP colors — Charcoal
`#121212`, Paper White `#F5F5F5`, Aluminum `#B3B6B9`, Logo Charcoal `#1E1E1E` — a dark-first
restrained editorial UI, and no warm sepia palette. `--drop-lens-accent` survives as the single
brand accent (ADR-0010 D10 is not amended). Typography, iconography and imagery direction remain
open.
