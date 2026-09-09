# P9 — where to pick up

Paused 2026-09-09. Everything below is committed and pushed on `v2-frontend-panel`
(`5bd6afb`), which is the branch behind PR #5. Nothing is half-applied; the tree is clean.

## State

All six checks were green at that commit:

| check | result |
| --- | --- |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean |
| `pnpm test` | 651 tests / 45 files |
| `pnpm test:db` | inert gate (ticket 0.4) |
| `pnpm test:e2e` | 120 passed |
| `pnpm build` | clean |

Before running anything, restore the environment — the pnpm store path and the
`pnpm` shim are not durable on this machine:

```bash
export PATH="$HOME/.local/bin:$PATH" && cd /Users/NimboClaude/Documents/Support/support-panel- && CI=true pnpm install --frozen-lockfile
```

## What is done

ADR-0020 is written and the restructure that implements it is complete: work-unit
navigation, the six destinations, the redirects for every retired route, the rebuilt
Concepts / Content / Outputs / Calendar / Engine surfaces, the interface-language guard,
and the e2e suites retargeted to the new structure.

## What is left

1. **`docs/handoff/P8-frontend-to-machine-build.md`** still describes the pre-restructure
   navigation and surface list. It is the document the machine build reads; it must be
   brought forward to ADR-0020 before that build starts.
2. **`docs/tickets/`** has no P9 entry. ADR-0020's consequences section says "Ticket P9
   records this work", and that ticket file does not exist yet.
3. **PR #5's description** still describes the P1-R→P8 delivery only. It needs the
   ADR-0020 restructure added.
4. **Visual confirmation in a browser.** The baselines were regenerated and reviewed as
   images, but the running panel has not been clicked through since the restructure.

## The standing risk, unchanged

There is still **no CI** in this repository. Every check above is advisory — it was true
because it was run by hand at that commit, and nothing re-runs it on push. This is the
same risk recorded in `P8-frontend-to-machine-build.md` §6.1.
