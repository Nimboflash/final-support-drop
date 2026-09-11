# P10 handoff — the machine is wired, read-only

**Branch:** `v2` (ADR-0021 D1 — `main` keeps doc 18 §11's stop and it stays true of v1)
**Slice:** 1 of 3. Reads work end to end. Writes do not, deliberately.

---

## 1. What now works

`pnpm machine:up` and a panel configured with two environment variables shows a **live**
concept-and-research session, drawn by Engine.

```bash
pnpm machine:up            # FastAPI on 127.0.0.1:8000, deterministic backend, no credential
DROP_MACHINE_BASE_URL=http://127.0.0.1:8000 \
DROP_MACHINE_SESSION_ID=<12 hex> \
  pnpm dev
```

Verified in a browser against session `5cf93d47bfbf` — two concept rounds, an approval, a
portfolio of eighteen recommendations:

| | |
|---|---|
| Engine | **46 nodes, 67 edges**, five of them revision edges, dashed, animated, labelled «بازنگری» |
| Shell marker | «دادهٔ زندهٔ ماشین», not «حالت نمایشی» |
| Overview | the machine's own brief, its concept round and its content, counted correctly |
| Settings | «متصل», and the sentence about holding no key replaced by one that is true |

Both worlds still work. With the variables unset the panel is byte-for-byte the mock panel.

## 2. The seam held

`docs/handoff/P8-frontend-to-machine-build.md` §4 promised a real system could replace
`createMockWorld` with **nothing above it changing**. That promise is now paid in full:

- `MachineGateway` is byte-identical. `verbatim-machine-gateway.test.ts` still passes.
- `mock-world.ts` is **unedited**. A `PanelWorld` supertype was declared in a new file and
  `MockWorld` satisfies it structurally, so the composition root selects between them.
- No new workspace package. Sixteen still.
- No new enum member, no widened closed set, no new `AUDIT_EVENT_NAMES`.
- Not one panel component changed to accommodate machine data.

## 3. What was refused, and why the refusal says something true

Every write throws `UNAUTHORIZED`, not `MACHINE_SYSTEM_DISCONNECTED`.

`commandErrorFa` renders the latter as «ارتباط با سامانهٔ ماشین برقرار نیست» — *the machine
system is not connected* — which in this mode is **false**. The machine is connected; we just
read a session out of it. The real world declares `policy.forbidden`, so `useEnvelope` acts as
`VIEWER`, and «با نقش فعلی، اجازهٔ این کار را ندارید» is then simply accurate.

Read-only mode is modelled as a read-only ROLE. The alternative was a ninth
`GatewayErrorReason`, and ADR-0021 D6 forbids widening a closed set.

## 4. The proxy is a security boundary, and here is its exact scope

`services/concept-portfolio` ships **no CORS and no authentication**; `/docs` and
`/openapi.json` are public. `apps/web/app/api/machine/[...path]/route.ts` is what stands in
front of it.

**What it enforces** — each verified by attacking it, not by reading it:

| Probe | Result |
|---|---|
| `GET /health`, `GET /sessions/<12 hex>` | 200 |
| `GET /sessions/ABCDEF123456` (uppercase), `/sessions/abc` | 404 |
| `GET /sessions/../../etc/passwd`, `%2e%2e%2fhealth` | 404 |
| `//evil.example/x` | 308 to the **same origin**, then 404 — not an open redirect |
| `/openapi.json`, `/docs`, `/sessions` (list) | 404 |
| `POST /sessions`, `.../generate`, `.../portfolio/build`, `DELETE` | **405** |
| `run_dir` in any response | absent |

Five of the service's seven routes are POSTs that cost money, and `concepts/generate` takes no
body — a CORS *simple request* any open tab could fire. Slice 1 therefore exports `GET` and
nothing else; Next answers 405 for a verb a route handler does not define.

The upstream URL is never built from user input. `new URL("//evil.example/x", base)` resolves to
a different origin and `new URL("../../admin", base)` climbs out of the prefix, so an allow-list
checked against the raw path is not the string that gets fetched. There are two literal
templates and no third.

**What it does NOT enforce, stated plainly:** it is not an authorization boundary and not a
spend control. The panel has no authentication, so anyone who can reach the panel can reach
these two reads. Keep the dev server on loopback.

## 5. A defect this uncovered — Engine had never drawn an edge

Not caused by this work; found by it. `packages/workflow-ui` was untouched, and the fault
reproduced identically in the **mock** world and in a **production** build.

`buildProductGraph` produced 67 edges (19 for the mock world). The canvas rendered **zero**, in
every mode, for the panel's whole life. React Flow warned `Couldn't create edge for source
handle id: "null"` on the console; no test failed, because the graph has never had a visual
baseline and nothing asserted an edge count.

Two causes, both in `graph-canvas.tsx`:

1. `ProductNodeCard` is a custom node type and rendered **no `<Handle>` elements**. React Flow
   anchors edges to handles and silently draws nothing without them.
2. The deeper one. React Flow re-derives handle bounds whenever a fresh node object arrives:

   ```js
   if (!userNode.handles)
     return !userNode.measured ? undefined : internalNode?.internals.handleBounds;
   ```

   The nodes memo rebuilds every node the moment ELK resolves `positions`, and the nodes carried
   `width`/`height` but no `measured` — so the measured bounds were discarded and never rebuilt,
   because the dimensions had not changed and nothing else triggers a re-measure.

   Supplying `measured` alone is a trap: it makes React Flow treat the node as already measured,
   so it never queries the DOM for handles at all. The fix is the first branch — declare
   `handles` explicitly, at coordinates ELK already laid the graph out against.

Fixing it immediately exposed a third defect it had been hiding: React Flow names an unlabelled
edge `Edge from ${source} to ${target}` — English, built from raw ids, so a screen reader read
out `n:concept-review:c1`. `full-audit.spec.ts` caught it on the first run after edges appeared.
Edges now carry a Persian `ariaLabel` built from the same labels the cards show.

**This is outside P10's `files_owned`.** It is recorded here rather than filed away because the
ticket's own AC-P10.4 — "renders that session: nodes, edges, and a REVISION edge" — could not be
met without it, and because it was equally broken on `main`.

## 6. Open decisions reached, and left open

- **The verbatim machine vs. Persian output — the one open question, and it is the owner's.**
  The record mandates Persian for generated artifacts and *prohibits mechanical translation*
  (`project-master-document.md:140`; `spec-v0.md:115,190`; `doc 12:157`). The machine's own
  reference notebook orders Persian on twenty lines. The ported `prompts.py` dropped the
  instruction and asks for no language at all. So native Persian generation is the only compliant
  outcome, and it needs one line in `prompts.py` — which ADR-0021 D2, as the owner amended it,
  forbids touching. Both instructions are the owner's and they cannot both hold. Nothing has been
  chosen; the machine stays verbatim and the output stays English until it is.
  With the `mock` backend the question is moot in any case: its strings are hard-coded English
  (`backends/mock.py:59` is `f'Music Track {i}'`), so no brief in any language changes them.

- **ADR-0021 D7 (superseded by the correction above).** The composition
  root injects the identity renderer, so the machine's English reaches the screen unchanged. This
  is the only option that does not pre-empt the owner: translating would bury a ruling nobody has
  made, and asking the machine for Persian means editing a vendored service (D2).

  **Consequence to be honest about:** `full-audit.spec.ts` fails any Latin run of three or more
  characters in a panel surface. REAL mode would fail that gate. It stays green only because no
  e2e enters REAL mode — which needs server configuration CI does not set. The gate is not
  measuring this mode, and saying so is the point; ADR-0021 D7 names exactly this reasoning.
- **OD-2 — `packageSnapshotSchema.isMock: z.literal(true)`. Still open.** A machine snapshot
  therefore carries no package and no calendar entry, so «تقویم» and «خروجی‌ها» are empty and the
  last third of the journey does not render.
- **OD-5 — the two reading categories. Still open.** Six of twenty-four recommendations are
  dropped rather than mis-mapped into `BOOK`.
- **OD-6 — a generation axis for concepts. Still open.** Engine cannot show a generation that is
  running or failed, only done or not.

## 7. What slice 2 must know before it starts

- **`panel-contract-invariants.test.ts` pins a two-file allow-list for constructing an
  `ApprovalCommand`.** A real `reviewItem` is a third, and there is no way around it: extracting
  a shared builder creates a third too, and reusing the mock's means editing `mock-world.ts`,
  which P10 forbids. Slice 2 must extend `PERMITTED_BUILDERS` deliberately, and record it
  against ADR-0013 D1. Slice 1 keeps `real-world.ts` free of both field names — that guard reads
  RAW source, comments included.
- **The write queue is not an optimisation.** Every machine method is load → mutate → whole-file
  overwrite, with no lock and no version field, on a threadpool. Concurrent calls destroy rounds
  while returning 200.
- **`ReviewPathOptions.createWorld` wants a full eleven-member `MachineGateway`.** The real world
  exposes only the approval surface, so the harness must wrap it — a fixture concern, not a
  contract change, but plan for it rather than discovering it.
- **A session id cannot be entered from the interface.** It is server configuration. Creating a
  session still needs the machine's own API, because `POST` is not proxied.
