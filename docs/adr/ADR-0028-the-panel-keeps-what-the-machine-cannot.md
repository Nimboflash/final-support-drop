# ADR-0028 — The panel keeps what the machine cannot, and says what it is about to do

**Status:** accepted (owner, 2026-09-16)
**Amends:** ADR-0021's "writes refuse with `UNAUTHORIZED`" (superseded once by slice 2, now
finished); the P10 handoff's statement that content review is impossible.
**Does not amend:** ADR-0013 D1 (one approval write path), ADR-0021 D6 (the closed reason set),
ADR-0019 D2 (the panel invents nothing).

---

## Context

The machine's whole write surface is five calls, and the portfolio arrives in one shot. Read
literally that meant: no per-item review, no concept rejection, no record of what a person asked
for, no calendar, no way to switch concept once research existed, and one sentence — «با نقش
فعلی، اجازهٔ این کار را ندارید» — for everything the machine could not do. The verified audit
counted these as the largest cluster of lies the panel told: sixteen findings where a control was
live, failed, and blamed the person.

The owner ruled: every state available, every control honest about its behaviour and side
effects, consistent across surfaces.

---

## Decision

### D1 — Two ledgers, one rule

What the MACHINE records stays the machine's: concepts, the approved concept, the portfolio.
What the PERSON decides about it that the machine cannot hold lives in `panel-notes.json`
beside the session — content approval and change requests, a concept set aside (with its
mandatory reason), the words behind every «بهبود کانسپت», and the calendar. `applyNotes` lays
them over the projection, and also emits them as `decisions` and `comments`, so تاریخچه and the
concept thread show what the person did. The projection stays pure.

The rule: the panel records a person's fact; it never records a machine's. A set-aside does not
touch the machine. An approval of a concept does.

### D2 — The rebuild is `RESEARCH_REFRESH` on a concept, behind a confirmation

Building research over research is a purchase. Selecting a second concept while research exists
therefore **refuses before writing** and names the route. The route is the recorded
`RESEARCH_REFRESH` revision on a CONCEPT target: approve if the machine does not already hold it,
then `portfolio/build` with `replaceExistingPortfolio` — the only place that flag is ever passed.
The panel reaches it through a confirmation that names what is replaced and that it costs.
Content reviews are cleared with it, because content ids carry no version and an old approval
would attach itself to a track the person has never seen.

A selected concept refined since reads «محتوا از نسخهٔ قبلی است», not «انتخاب‌شده», and the
sheet says what refining will make stale before the press.

### D3 — `nextPermittedActions` is the vocabulary of refusal

The reason set stays closed. The field 10 §2 gave the job of "and now what?" carries a closed
vocabulary (`NEXT_ACTIONS`), the write mapping reads the proxy's own code from the body, and
`commandErrorFa` has one true sentence per action. A wait is rendered as a status, never as an
alert. `UNAUTHORIZED` with `UNSUPPORTED_BY_MACHINE` says the machine has no such verb; it no
longer says anything about the person's role.

### D4 — The guardian's approval passes the mock's editorial gate

V2 01 §5's "comments alone never satisfy the gate" holds — no comment touches it. There is one
human actor in this world, and their approval is the review the gate exists for. Without this the
walkthrough project's output could not assemble by any route.

### D5 — A filter the world cannot honour says so

An unknown `?project=` renders one sentence and one way back, on every surface, rather than a
false empty state.

---

## Consequences

- AC-P10's "writes refuse with UNAUTHORIZED" is finished, not merely amended.
- The notes file grows two keys (`concepts`, `requests`); older files read as before.
- `tests/repo/no-inert-controls.test.ts` cannot see a control that is live and always fails.
  The tests that can are in `real-world.test.ts`, `machine-client.test.ts` and
  `commands-errors.test.ts`.
