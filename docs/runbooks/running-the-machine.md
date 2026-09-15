# Running the panel against a real machine

What a fresh clone needs, in order, and what deliberately does not travel with it.

## What is in the repository

Everything needed to build and run: the panel, the vendored
`services/concept-portfolio` service, the proxy, and the checks.

## What is NOT, and must not be

| | Why |
|---|---|
| Your OpenRouter key | `services/concept-portfolio/.env` is gitignored. A key in a repository is a key that has leaked. |
| `apps/web/.env.local` | Local machine wiring. Copy `.env.local.example`. |
| `drop_runs/` | Session state — concepts, portfolios, model-call logs. This is machine OUTPUT, produced per run, and belongs to the machine it ran on. |
| Your review decisions and dates | Held in the browser's `localStorage`, under `drop-machine-review-v1:<session>`. The machine has no home for a per-item approval or a publication date, so the panel keeps them — which means they are per browser and per device. |

That last row is a real limitation rather than an oversight, and it is worth
saying plainly: move to another machine and your approvals do not follow. Making
them durable means giving them a home outside the browser, which is a deliberate
piece of work and not a setting.

## Setup

```bash
pnpm install
pnpm machine:install          # creates the service's venv
cp apps/web/.env.local.example apps/web/.env.local
```

Then, in two terminals:

```bash
pnpm machine:up               # the machine
```

```bash
pnpm dev                      # the panel, on http://localhost:3110
```

## The credential

1. Open **تنظیمات** in the panel and paste an OpenRouter key. It is written to
   `services/concept-portfolio/.env` at `0600` and never passes through a log,
   a commit, or the panel's own responses — the route answers only
   `{configured, hint}`, where the hint is the last four characters.

2. **Restart the machine.** The key is read once, at startup:

   ```bash
   pnpm machine:up
   ```

   `machine:up` stops its own previous run first, so this is safe to repeat.

3. Check the banner. It must say both:

   ```
   concept-portfolio on http://127.0.0.1:8000 (backend=openrouter, credential=set)
   ```

   `backend=mock` means the deterministic backend is answering and **your key
   is not being used** — you will get three fixed English concepts and
   OpenRouter will never be called. That is the one failure that looks like
   success, which is why the banner names both halves.

## The journey

**شروع کانسپت جدید** → write a brief → «تولید کانسپت‌ها».

The brief only reaches the machine through session creation — `generate_concepts`
takes no body and reads the brief off the session — so a new brief always means a
new session.

From there: approve a concept (which also builds the research portfolio),
approve the content you want in your output, then send it to تقویم and give it a
date. What you do not approve is simply not in the output.

## Spending

Three calls reach a model: generating concepts, refining them, and building a
portfolio. Approving is free.

Guards, all deliberate, all refusing rather than queuing:

- **30 seconds** between paid calls on one session (`COOLING_DOWN`)
- **6 concept rounds** per session (`PAID_CALL_BUDGET`)
- a rebuild over an existing portfolio is refused unless asked for explicitly
  (`PORTFOLIO_EXISTS`)
- at most two paid writes in flight across all sessions

Seeing one of these is the system working, not breaking.

## Keep it on loopback

The panel has no authentication. Anyone who can reach it can reach the write
routes, and those spend money. The proxy is a transport and disclosure boundary
— it stops a browser on another origin, not a script on the same machine. Put
authentication in front of `/api/machine` before this is reachable from anywhere
but your own computer.
