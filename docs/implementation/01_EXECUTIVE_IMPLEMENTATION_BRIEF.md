# Executive Implementation Brief

## 1. Product outcome

Build DROP Studio OS as the first bounded module of DROP OS: a Persian-native, multi-user,
auditable operating system in which five governed AI machines and human approval gates turn a
brief into a deep Program, derive Weekly Lens editions, commission required outputs and create
the final human/physical handoff.

The build has three connected product surfaces:

1. **Operational dashboard** - Programs, Lenses, artifacts, research, approvals, requests,
   calendars, registries, users and audit.
2. **Workflow canvas** - visual template authoring and live run inspection using React Flow.
3. **Artifact preview/export** - controlled preview and export of generated editorial, visual,
   print and landing-page artifacts. Automatic external publication remains out of scope.

All three surfaces use one domain model and one authorization system.

## 2. Product hierarchy

```text
Workspace
└── Studio Project - work container
    └── Deep Program - output of the full five-machine pipeline
        ├── Approved Concept Bible
        ├── Research and evidence
        ├── Lens territories
        ├── Output and Execution Manifests
        └── Weekly Lens editions - lighter child workflows
            └── Commissioned outputs and handoff requests
```

In V0 a Project normally contains one Program, but the records remain separate so scheduling,
reruns and future Program variants do not corrupt the work container.

## 3. Five-machine production model

| Machine | Responsibility | Mandatory human boundary |
|---|---|---|
| 01 Concept Discovery | Interpret brief/references and create 3-5 distinct Concept Cards | Concept decision with structured reasons |
| 02 Controlled Research | Freeze a dual-coverage plan, retrieve, validate and extract evidence | Plan-change, gap and retrieval decisions |
| 03 Synthesis and Decision | Normalize candidates, construct three coherent directions and publish a Concept Bible | DROP Guardian direction approval |
| 04 Output and Production Control | Select outputs, dispatch specialized agents, validate artifacts and create an Execution Manifest | Output/artifact approval and `FA_EDITORIAL` where applicable |
| 05 Calendar, Feed and Handoff | Convert requirements into editable requests/calendar items and collect structured feedback | Request, review, approval and declared completion actions |

Machine-generated revision requests return to the relevant Machine 04 job. Machine 05 does not
edit generated artifacts and does not certify physical work it cannot observe.

## 4. Workflow canvas outcome

The React Flow implementation must be a real operating surface, not a decorative diagram.

It has two primary modes:

- **Template mode:** authorized maintainers create and validate draft workflow versions. A
  published version is immutable.
- **Execution mode:** users inspect live state, ownership, inputs, outputs, gates, failures,
  cost and audit for a specific run.

The canvas displays machines as groups and stages/gates as nodes. Artifact lineage is available
as an optional overlay so the default workflow stays readable.

## 5. Dashboard outcome

The dashboard must let a user answer, without opening chat history:

- What is active?
- Which stage is running?
- What is blocked and why?
- What decision is waiting for me?
- Which evidence or artifact supports this result?
- Which person acted under which role?
- Which prompt, rule, schema, model and workflow version produced it?
- What changed between two versions or runs?
- What is due next?

## 6. Confirmed technology direction

```text
Node.js 24 LTS
TypeScript strict
pnpm monorepo
Next.js App Router, standalone Docker output
shadcn/ui + Tailwind CSS
React Flow / @xyflow/react
Zustand for ephemeral canvas state
TanStack Query and TanStack Table
React Hook Form
Zod 4 contracts
PostgreSQL + Drizzle + committed SQL migrations
BullMQ + Redis for reconstructable dispatch
S3-compatible object storage, MinIO fallback
Better Auth for identity only
date-fns-jalali
Vitest + Playwright + database integration tests
```

The React Flow AI Workflow Editor template may be used directly only when the required Pro
license is confirmed. The open-source React Flow core is the default safe foundation.

## 7. Brand and experience direction

- Urban, editorial, architectural and culturally aware.
- Raw but elevated; minimal but not sterile.
- Exact structure with one controlled irregularity.
- Neutral permanent base: Charcoal, Paper/White, Concrete Grey and Aluminium.
- One active Lens accent at a time. Color directs attention; it does not fill empty space.
- The approved horizontal DROP wordmark is primary; DOT is a secondary signaling device.
- Persian is authored natively, not mechanically translated.
- Motion must reveal state, relationship or transition and must respect reduced-motion settings.

Exact brand hex values and final interface typography remain tokenized because the referenced
Brand DNA routes those values to a separate application guide not included in the source set.

## 8. Scope exclusions

Do not build the following into Studio V0:

- Food/kitchen execution, inventory, staffing, suppliers or finance.
- Partner discovery, negotiation or general relationship management.
- Full creative logic for every specialized output agent.
- Automated public publishing or external communication.
- Vector/embedding infrastructure before structured retrieval proves insufficient.
- Multi-project portfolio optimization.
- English UI locale.
- Machine claims of complete QA over human or physical work.

## 9. V0 completion signal

V0 is accepted when one real project travels through the complete pipeline, produces one
approved Program and at least one Weekly Lens child edition, creates validated artifacts and a
human handoff, completes one scoped revision loop, and closes with a complete immutable audit
and run manifest. The same run must be inspectable in the dashboard and workflow canvas.

