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

### D2 — The machine is vendored VERBATIM, and nothing is added to it

**Amended by the owner, 2026-09-11.** This decision originally permitted two documented
modifications. It no longer permits any. The owner's instruction was that the machine must be
exactly the file they supplied, with no difference and nothing added, and they were right: a
vendored artefact that has been helpfully improved is no longer the artefact anyone reviewed, and
"it was documented" does not make it the same file.

`services/concept-portfolio/` is now byte-identical to `drop_concept_portfolio_project.zip`.
`tests/repo/vendored-machine.test.ts` hash-pins all twenty-nine files, in the pattern
`placeholder-purity.test.ts` already uses for the twelve frozen workspaces, and additionally
asserts the shape of the two edits that were made and reverted, so a failure names what was done
rather than only reporting that a digest moved. `MODIFICATIONS.md` is deleted, because there are
none.

**What the two edits were for, and where each now lives instead.** Both problems were real; only
the location of the fix was wrong.

1. *The service could not start without a paid credential.* `_service()` constructs
   `OpenRouterBackend` unconditionally and `Settings.from_env()` raises when
   `OPENROUTER_API_KEY` is absent, so not even the deterministic `MockBackend` its own tests use
   could be served.

   `scripts/machine-server.py` — **outside** the service — rebinds `api_mod._service` before
   starting uvicorn. That is not a workaround invented here: the service's own
   `tests/test_api.py` does `monkeypatch.setattr(api_mod, '_service', lambda: service)` and
   builds `Settings(...)` directly rather than through `from_env()`. Nothing is patched that its
   authors do not already patch themselves.

2. *There was no readiness probe.* None is needed. `Settings.from_env()` is reached **only** from
   `_service()`, so FastAPI's own `/openapi.json` answers without touching configuration, without
   creating a session and without spending a token. CI probes that.

   The panel's proxy therefore allow-lists exactly **one** upstream path, `GET /sessions/{12
   hex}`, which is a narrower boundary than before. The `health()` method on the machine client
   was removed rather than repointed: no surface called it, and an `/openapi.json` check renamed
   "health" would report nothing about the backend and would be a lie by its own name.

### D2a — One named restoration, and only one (owner, 2026-09-11)

D2 freezes the service. This is the single exception, and it is deliberately expressed as a
restoration rather than a change.

`src/drop_portfolio/prompts.py` now carries the language directive its own upstream reference
notebook orders and the port dropped, quoted from that notebook:

> `Titles/one_line must be natural Persian and must never be execution instructions.`
> `Return concise Persian content in the exact JSON structure. No prose outside JSON.`
> `Use Persian for analysis text; keep artist/song titles exactly as published.`

Applied to all three prompts, because a refinement round that answered in English would undo the
generation prompt on the very next call. The second clause of the research directive is
load-bearing and is kept verbatim: a translated album or film title is not a citation any more,
and the portfolio is evidence.

Nothing new is decided by this. `project-master-document.md:140` already requires generated
artifacts to be authored natively in Persian and **prohibits mechanical translation**, which is
what ruled out the alternative of translating at the projection boundary.

`tests/repo/vendored-machine.test.ts` hash-pins every file and names this one file as the only
permitted difference, so a second "small fix" cannot arrive quietly beside it.

**It does not take effect on the mock backend.** `backends/mock.py` returns hard-coded English
strings (`f'Music Track {i}'`) and never reads a prompt. Persian output requires the real
OpenRouter backend, which requires the provider gate (doc 15 §12) that is still open.

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

### D7 — CORRECTED: Persian is mandated, and the port dropped the instruction

**Amended 2026-09-11.** The original D7 called this "a real and unsolved conflict" and an open
decision. It was neither, and it rested on two statements of fact that are simply untrue. Both
are corrected here rather than quietly edited away, because the reasoning built on them was
offered to the owner as a reason to wait.

**Error 1 — "since `prompts.py` asks for English".** It does not. All ninety-seven lines contain
no language directive of any kind: no "Persian", no "English", no "language". The model answers
in English because the prompt is written in English and says nothing, not because anything asked.

**Error 2 — "The panel ships fa-IR only (00 §4)".** Doc 00 §4 does not say that. It says *"All
human-facing product UI is FA-first and RTL from the first component"* (`00:80`). The phrase
"fa-IR only" appears at `spec-v0.md:340`, inside an out-of-scope list.

**And the framing was wrong.** D7 argued machine output is "data, not interface chrome, so the
guard does not fail on it". That is true of the *test guard's* scope and false of the *policy*:

> All human-facing generated artifacts are **authored natively in Persian** (`NATIVE_FA`);
> mechanical translation is prohibited
> — `docs/source-material/project-master-document.md:140`

Restated at `spec-v0.md:190`, at `spec-v0.md:115` for research synthesis specifically, and at
`docs/implementation/12:157`. Generated artifacts are governed. They were always governed.

**Where the instruction went.** The machine's own upstream reference —
`notebooks/reference/DROP_Idea_Engine_V7_10_...ipynb`, which its README says is *"included
untouched for traceability"* — orders Persian on twenty lines, for exactly the fields that now
arrive in English:

> `Titles/one_line must be natural Persian and must never be execution instructions.`
> `Use Persian for analysis text; keep artist/song titles exactly as published.`

with `_FA`-suffixed fields throughout (`WHY_CONCEPT_FA`, `DROP_CONNECTION_FA`,
`OBSERVABLE_FORM_FA`, …). The directive was **lost when the notebook was ported into
`prompts.py`**. Nothing decided against Persian; the instruction was dropped.

**What this leaves.** Two of the three options D7 offered are gone. Translating at the projection
boundary is *prohibited* — that is mechanical translation by definition. Accepting mixed-language
content contradicts four recorded documents. Native Persian generation is the only compliant
outcome, and it requires the prompt to ask for it.

Which collides head-on with D2 as the owner has now amended it: the machine is verbatim and
nothing is added to it. **That collision is real, it is the owner's to resolve, and this ADR does
not resolve it.** It is recorded in the P10 handoff as the open question it is. What is no longer
open is whether Persian is required. It is.

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
