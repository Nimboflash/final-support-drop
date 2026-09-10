# ADR-0021 — The machine build opens, on `v2`

**Status:** accepted (owner, 2026-09-10)
**Supersedes in part:** ADR-0019 D20 and doc 18 §11, for the `v2` branch only.
**Does not amend:** ADR-0019 D3, D9, D16; ADR-0013; ADR-0012; ADR-0014; ADR-0020.

---

## Context

Doc 18 §11 ends the panel delivery with a hard stop: *"Do not start machine implementation after
step 8. Stop and hand off the completed panel for review."* ADR-0019 D20 restates it as *"after
the handoff, machine work never starts automatically."*

The word doing the work in that sentence is **automatically**. The stop was never a prohibition
on the machine ever being built; it was a prohibition on an agent deciding to build it. It has
been put to the owner twice within two days:

- **2026-09-10, morning.** Raised and **declined**. The owner was shown what lifting the stop
  would require and chose the narrowest of three offered scopes: no machine work at all, not
  even the infrastructure beneath it. Recorded in `docs/handoff/P8-frontend-to-machine-build.md`
  §8.
- **2026-09-10, later.** **Reversed**, with an artefact: the owner supplied
  `drop_concept_portfolio_project.zip` and asked to develop the core machine on `v2`, wire it in,
  and bring the system up.

Both are decisions by the human owner, which is exactly the form doc 18 §11 requires. The second
supersedes the first. That §8 note is not deleted — a decision that was made and then changed is
more useful to the next reader than one that was quietly overwritten.

The delivered artefact is not the five-machine system doc 18 defers. It is a Python FastAPI
service implementing **concept generation and research portfolio assembly** — which is
Machines 01 and 02 of the recorded model, and nothing downstream of them.

---

## Decision

### D1 — The stop is lifted for `v2`, and only for `v2`

`main` is v1 and stays frozen: the panel exactly as delivered, frontend-only on deterministic
mocks. Machine work happens on `v2`. Someone reading `main` should find the hard stop intact and
true of what they are looking at.

### D2 — The machine is vendored, not reimplemented

`services/concept-portfolio/` holds the owner's service as delivered. It sits **outside** the
pnpm workspace globs (`apps/*`, `packages/*`) so it cannot disturb the sixteen-package integrity
check, and it keeps its own toolchain.

Every change made to it after extraction is listed in `services/concept-portfolio/MODIFICATIONS.md`
and marked `DROP MODIFICATION` at its site. Two were needed to bring the system up at all:

1. The service **could not start without a paid credential**. `Settings.from_env()` raised
   whenever `OPENROUTER_API_KEY` was absent and `api.py` constructed the OpenRouter backend
   unconditionally — so not even the deterministic `MockBackend` its own tests use could be
   served. The backend is now chosen by `DROP_BACKEND`, and the key is required only by the
   backend that uses it. The real path is unchanged and still the default.
2. There was **no readiness probe**. `GET /health` now answers without creating a session or
   spending a token, and names the backend so a mock run cannot be mistaken for a real one.

Nothing else was touched: no prompt, no model, no service logic, no test.

### D3 — Scope: Machines 01 and 02, and no further

What this ADR opens is the **concept and research portfolio** service and its wiring. It does
**not** open Machines 03 Synthesis, 04 Production or 05 Handoff, and it does not open the
infrastructure doc 18 §5 defers — no PostgreSQL, no Redis, no queues, no worker.

`apps/worker` and the eleven machine-oriented packages therefore stay inert 0.1 placeholders and
`placeholder-purity.test.ts` still guards them. Extending past 01–02 needs another decision.

### D4 — The seam is honoured exactly as it was designed

The panel was built around this moment, and the point of a seam is that it is used rather than
bypassed. Therefore:

- `MachineGateway` gains **no members** (ADR-0019 D3). It is byte-frozen and
  `verbatim-machine-gateway.test.ts` proves it.
- `PanelGateway` keeps its seven read-only members. Writes stay on `PanelCommandGateway` and
  `RevisionGateway`; approval keeps its single write path (ADR-0013 D1) and its rejecting-stub
  proof.
- **No new workspace package.** The real adapter lives inside `packages/machine-gateway`,
  alongside the mock, which is what `docs/handoff/P8-frontend-to-machine-build.md` §4 already
  said the connection point would be.
- The adapter must pass the exported conformance suites **unmodified**. A real implementation
  that needs the bar lowered has not met the bar.

### D5 — The mock world stays, and stays default

The real machine is an **additional** adapter selected by configuration. The deterministic demo
world is not replaced, not deprecated, and not allowed to break: it is what makes the panel
reviewable without a running service, and it is what every existing test runs against.

Selecting the real machine is explicit. Absent that selection, the panel behaves exactly as it
does on `main`.

### D6 — The machine's vocabulary meets the panel's through a projection

The service speaks its own language: `SessionStatus` of `DRAFT | CONCEPTS_READY |
IDEA_APPROVED | PORTFOLIO_READY`, concept cards with `anchor_score` and `territory`, portfolio
entries in five categories. The panel's vocabularies are closed and recorded.

They meet in **one projection module** and nowhere else, in the pattern
`packages/panel-domain/src/projection/` already establishes (ADR-0019 D5, D6). No enum member is
invented, no closed set is widened, and `AUDIT_EVENT_NAMES` stays closed at 35 (ADR-0019 D9).
Where the machine has no equivalent for something the panel requires, the projection says so
honestly rather than fabricating a value — and where that cannot be done honestly, it becomes an
open decision rather than a silent choice.

### D7 — The machine's output is English; the panel is Persian-only

This is a real and unsolved conflict, recorded here rather than glossed. The service returns
English concept titles, one-liners and portfolio entries — from the mock backend and from the
real one, since `prompts.py` asks for English. The panel ships fa-IR only (00 §4) and
`tests/repo/interface-language.test.ts` enforces its vocabulary rules.

Machine-generated content is **data**, not interface chrome, so the guard does not fail on it —
the guard reads source, not runtime values. But a Persian interface rendering English cards is a
defect a person sees immediately, and calling it acceptable because no test fails would be
exactly the kind of green-tick reasoning this repository has spent its whole life removing.

It is therefore an **open decision** (see Consequences), not something this ADR resolves.

### D8 — CI covers the machine as its own job

`.github/workflows/checks.yml` gains a `machine` job: the service's own pytest suite, plus a step
that starts the API and requires `/health` to answer with no credential present. That second step
is what keeps D2's first modification true. `pnpm test:machine` is now one of the canonical
checks, and `tests/repo/ci.test.ts` fails if CI stops running it.

---

## Reported conflicts

| Existing instruction | Ruling |
|---|---|
| Doc 18 §11 — "do not start machine implementation after step 8" | Lifted for `v2` by the owner's decision, which is the non-automatic trigger the sentence requires. `main` keeps it. |
| ADR-0019 D20 — "machine work never starts automatically" | Unchanged and honoured: this did not start automatically. |
| ADR-0019 D2 — "frontend only; there is no backend in this scope" | Superseded on `v2`. A backend now exists, and the panel may talk to it. |
| P8 handoff §8 — the stop "was put to the owner and upheld" | Superseded by the owner's later decision. The note stays, with a pointer here. |
| ADR-0019 D16 — the demo clock is fixed; `Date.now` unreachable | **Unchanged for the demo world.** A real machine has real time; the determinism guarantee is a property of the mock world and does not extend to a live service. |
| Doc 15 §12 — AI provider approval is an open client gate | Still open, and still unblocking: the service runs on its deterministic backend with no provider. |

---

## Consequences

- **Open decision — the language of machine output.** The service returns English into a
  Persian-only interface (D7). The options are to translate at the projection boundary, to ask
  the machine for Persian by changing `prompts.py`, or to accept mixed-language content as a
  known limitation. Each has a real cost and none is obvious; it needs the owner, not an agent.
- **Open decision — session identity.** The machine's session ids (`4d9870478655`) and concept
  ids (`concept_02`) must satisfy the panel's `idSchema`, and its concept ids repeat across
  rounds. Whether a round-2 `concept_02` is the same concept revised or a different concept
  decides how the panel's version-linked review binds to it.
- The ten open decisions in `docs/handoff/P8-frontend-to-machine-build.md` §2 stop being
  hypothetical for the two machines now in scope. They are resolved as they are actually reached,
  each recorded, and the rest stay open.
- Determinism is now a property of *one* world rather than of the panel. Every existing test
  keeps running against the mock; tests that exercise the real machine must be written not to
  depend on wall-clock time or on model output that can change.
- `main` and `v2` genuinely diverge from here. That is the point of the branch.
