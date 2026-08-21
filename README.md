# DROP Studio OS

A Persian-native (fa-IR, RTL-first), multi-user, auditable **creative operating system** for
the DROP brand: five governed AI machines with mandatory human approval gates turn a brief
into an approved Program, derive Weekly Lens editions, commission outputs, and hand off to
humans — on a PostgreSQL-authoritative modular monolith with immutable published versions and
fail-closed gates.

**Status:** documentation layer complete; implementation starts at Release 0, Ticket 0.1.

## Where things are

| Path | What |
|---|---|
| `CLAUDE.md` | Agent instructions: authority order, non-negotiables, build discipline |
| `docs/DELIVERY_README.md` | The delivery bundle's governance root |
| `docs/implementation/` | The 18-document build contract (00–17) |
| `docs/source-material/` | The 7 frozen source documents (brand DNA, specs, plans) |
| `docs/adr/` | ADRs 0011–0016 — repairs to verified bundle defects |
| `docs/SPEC.md` | Derived product spec (PRD) |
| `docs/tickets/` | Release 0 ticket files 0.1–0.16 with blocking edges |
| `docs/testing-strategy.md` | TDD strategy: the five canonical test seams |
| `docs/orchestration-guide.md` | Running the build as a governed multi-agent process |
| `executive-multi-agent-model/` | The VSO framework the orchestration guide maps onto |
| `.claude/skills/` | 41 Claude Code skills (tracked in `skills-lock.json`) |

## How the build runs

One ticket at a time from `docs/tickets/`, working the frontier (any ticket whose blockers
are done; 0.1 is the sole start). Each ticket: freeze tests at its declared seams → implement
→ green checks → independent review → commit with ticket ID → structured handoff. Stop at
every release gate for the human owner. See `docs/orchestration-guide.md`.
