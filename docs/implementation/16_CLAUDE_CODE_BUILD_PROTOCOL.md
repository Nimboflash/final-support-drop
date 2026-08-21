# Claude Code Build Protocol

## 1. Purpose

This file is the operating prompt and handoff protocol for building DROP Studio OS without losing
scope, provenance or release gates.

## 2. Repository instruction file

At repository initialization, create a root `CLAUDE.md` or equivalent agent instruction file
that points to:

- Frozen Master Build Spec v1.0.
- Project Master Document.
- Spec V0.
- Execution Plan.
- Brand DNA v3.0.
- This implementation pack and ADR 0010.

It must include the non-negotiables from `00_READ_ME_FIRST.md`, package dependency rules and the
requirement to stop at release gates.

## 3. Master prompt for the first session

Copy this prompt into the first Claude Code build session after the documents exist in the repo:

```text
You are implementing DROP OS / Studio from approved specifications.

Before changing code:
1. Read docs/implementation/00_READ_ME_FIRST.md through
   docs/implementation/05_TECHNICAL_ARCHITECTURE_AND_REPOSITORY.md.
2. Read the frozen source documents and ADR 0010 referenced there.
3. Inspect the repository, git status, existing instructions and package versions.
4. Report any conflict with the source hierarchy; do not silently resolve it.

Work only on Release 0 Ticket 0.1: pnpm monorepo foundation.

Required outcome:
- apps/web and apps/worker
- packages/core, studio, contracts, db, pipeline, workflow-ui, ai-gateway,
  retrieval, storage, ui, config, observability and testing
- strict TypeScript and shared lint/format/test/build configuration
- minimal compile/test fixtures proving package dependency direction
- no business-domain implementation beyond safe package placeholders
- no live provider, no secrets, no Machines 01-05 behavior

Use TDD at the agreed seam. Preserve unrelated work. Do not modify the frozen spec.
When complete, run typecheck, lint, tests and build. Stop and provide the structured handoff
defined in docs/implementation/16_CLAUDE_CODE_BUILD_PROTOCOL.md.
```

Do not ask Claude to "build the whole system" in one session.

## 4. Prompt for every later ticket

```text
Implement only ticket <ID>: <TITLE>.

Read:
- the ticket file/section
- its source requirements in the traceability matrix
- affected ADRs
- affected contracts and tests

Before implementation:
1. Inspect current git state and preserve unrelated changes.
2. Confirm dependencies and owned files.
3. State the test seam and write/freeze behavior tests.
4. Stop if the ticket requires a missing architectural/authority decision.

Implementation rules:
- Business logic belongs in shared packages, never routes/components.
- PostgreSQL is authoritative; jobs carry IDs only.
- All commands are idempotent and server-authorized.
- Approved/published history is immutable.
- Human gates fail closed.
- UI is FA-first RTL with externalized strings.
- References and generated content are untrusted.
- Do not implement adjacent tickets.

Finish with the required checks, independent review and structured handoff.
```

## 5. Pre-ticket checklist

- Cleanly identify user-owned/unrelated changes.
- Read repository `AGENTS.md`, `CLAUDE.md` and local instructions.
- Resolve ticket dependencies.
- Identify affected schemas/migrations.
- Identify permissions and failure states.
- Identify version/immutability behavior.
- Identify test seam and fixtures.
- Confirm no secret/live provider is needed.
- Confirm Pro-template license before using Pro source.

## 6. Implementation stop conditions

Stop and request a named decision when:

- A change alters machine responsibility/order.
- A new role gains approval authority.
- Historical data would need overwrite/delete.
- A provider credential or external transmission approval is required and missing.
- A Pro template/source would be used without confirmed license.
- A migration cannot preserve current data/versions safely.
- The task expands into venue operations, partner management or automatic publishing.
- A source conflict is not resolved by the hierarchy.
- The ticket cannot be tested through an agreed seam.

Do not stop for replaceable implementation details already delegated to configuration.

## 7. Required engineering checks

Run the repository equivalents of:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db        when schemas/repositories change
pnpm test:e2e       when critical UI journeys change
pnpm build
```

Do not invent command names before the root scripts exist; establish them in Ticket 0.1 and use
them consistently afterward.

## 8. Independent review prompt

```text
Review ticket <ID> independently. Do not implement fixes yet.

Use the ticket's source requirements, ADRs and tests as authority. Look specifically for:
- scope drift
- missing authorization or tenant scope
- fail-open behavior
- lost provenance or mutable approved history
- non-idempotent queue/event behavior
- contract/schema mismatch
- Persian RTL/accessibility regression
- canvas state incorrectly treated as durable authority
- license/security/deployment portability problems

Report only evidenced findings with severity, file/location, violated requirement, consequence
and smallest safe fix. Attempt to refute each potential finding before confirming it.
```

## 9. Structured ticket handoff

Every implementation session ends with:

```markdown
## Ticket handoff

- Ticket: <ID and title>
- Commit: <hash>
- Scope completed: <bullets>
- Contracts added/changed: <list>
- Migrations: <list and verification>
- Permissions/failure states: <list>
- Tests added: <list by seam>
- Checks: typecheck / lint / test / build results
- Independent review: pass or findings
- Deviations: none or linked ADR/decision
- Known limitations: <bullets>
- Next permitted ticket: <ID>
- Release gate status: waiting/pass/block reason
```

No next agent should have to reconstruct the ticket from chat history.

## 10. Prompt and rule work

Prompt/Rule/Example changes are versioned data changes:

- Never edit a published prompt/rule in place.
- Include change reason and approver.
- Golden tests compare old/new versions on the same frozen fixtures.
- Synthetic fixtures test contract/failure behavior only.
- Creative/taste calibration requires real client-reviewed examples.

## 11. UI work protocol

For shadcn/React Flow tickets:

1. Add component through the repository's configured method.
2. Apply logical RTL properties and Persian message keys.
3. Add component behavior and accessibility tests.
4. Render desktop/compact/mobile critical states.
5. Test keyboard and reduced motion.
6. Verify graph semantic save versus layout save.
7. Confirm no restricted Pro source entered the repository without license evidence.

## 12. Database work protocol

- Freeze Zod contract before migration.
- Generate and inspect committed SQL.
- Add constraint/index/immutability tests.
- Test upgrade from previous migration state.
- Business services own authorization and transactions.
- Never edit a committed production migration after release; add a new migration.

## 13. Release handoff

A release report contains:

- Included tickets and commits.
- Exit-criteria evidence.
- Test layer results.
- Security/review results.
- Migration/deployment notes.
- Open blockers and accepted risks.
- Screenshots/visual QA evidence for UI releases.
- Human-owner acceptance decision.

