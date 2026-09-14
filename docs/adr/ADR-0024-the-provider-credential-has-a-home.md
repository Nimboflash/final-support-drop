# ADR-0024 — The provider credential has a home, and it is not the browser

**Status:** accepted (owner, 2026-09-14)
**Amends:** V2 02 §2's "Settings should not expose API keys", as adopted by ADR-0019 D1.
**Does not amend:** ADR-0021 D2 (the machine is vendored verbatim) or doc 15 §12 (the AI provider
approval gate, which this does not close).

---

## Context

The panel has always been able to say that nothing was connected. It could not be *made* to
connect, because the credential lives in the vendored service's environment and there was nowhere
to put one but a shell.

The owner asked for somewhere to paste an OpenRouter key, change it and clear it. V2 02 §2 says:

> Settings should not expose API keys or pretend to connect live providers

Half of that sentence still stands and is honoured below — nothing here pretends. The other half
is what the owner has amended, and the reason the sentence existed is worth keeping in view: a
credential surface is a liability, and this one is built as if it is.

**The fact that shapes every decision: the panel has no authentication.** A route that writes a
paid credential to disk is therefore exactly as exposed as the panel is.

---

## Decision

### D1 — Off unless deliberately switched on

`DROP_PROVIDER_KEY_ADMIN=1`, server-side. Absent it, every method on the route answers **404**,
not 403 — a 403 confirms the route exists. The panel says plainly that it is off, how to turn it
on, and that it is meant for a loopback machine.

### D2 — One destination, and it is the ignored one

`.gitignore` covers exactly `services/concept-portfolio/.env`. The repository root's `.env` is
**not** ignored, and `load_dotenv()` — searching from the process's working directory — would have
looked there, because the launcher runs from the root. So two things are fixed:

- The route's destination is a **constant**. A configurable one is how a credential ends up in a
  commit.
- `scripts/machine-server.py` reads that file explicitly at startup, never with `override`: a
  variable already exported by whoever started the process is a deliberate act and outranks a file.

The file is written `0600`, and `chmod` is applied even when it already existed.

### D3 — The value never comes back

`GET` answers `configured` and the **last four characters**. There is no route and no code path
that returns the value — not to the browser, not to a log, not inside an error message. A rejected
key is not echoed to explain why it was rejected.

`tests/repo/provider-key.test.ts` walks every reply the route can emit and fails if one carries a
key-shaped field, fails on any `console.*` in the route, fails if the card reaches for
`localStorage`, `sessionStorage` or `document.cookie`, and fails if any file outside the route
mentions `OPENROUTER_API_KEY`.

### D4 — It does not pretend

A written key reaches the service on its **next start**. The panel says that, rather than
implying the provider is already answering. The launcher prints `credential=set` or
`credential=absent` — the fact, never the value.

### D5 — The machine is still verbatim

ADR-0021 D2 is untouched. The service reads `OPENROUTER_API_KEY` from its environment exactly as
its authors wrote it; everything here happens beside it.

---

## Consequences

- **This is not an authorization boundary and must not be mistaken for one.** Anyone who can reach
  the panel with the flag on can write a credential. It is a local operator tool. Exposing the
  panel publicly with `DROP_PROVIDER_KEY_ADMIN=1` set would be a serious mistake, and no code here
  can prevent it.
- Doc 15 §12's provider gate stays open. A key makes a real run *possible*; whether to spend on one
  is still the owner's call, and `DROP_BACKEND` still defaults the launcher to the deterministic
  mock.
- The credential was never handled by an agent. The field is the owner's to fill, and the value has
  never existed in a transcript, a log or a commit. Verification used an obviously fake value.
