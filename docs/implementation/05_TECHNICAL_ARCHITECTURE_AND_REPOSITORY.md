# Technical Architecture and Repository

## 1. Architecture shape

Use a modular monolith with two application processes:

```text
Browser
  -> Next.js web process
      -> shared domain/application packages
      -> PostgreSQL
      -> S3-compatible storage
      -> Redis dispatch
  -> SSE run-event stream

Worker process
  -> pipeline/application packages
  -> PostgreSQL authoritative state
  -> AI gateway and retrieval adapters
  -> S3-compatible storage
  -> Redis dispatch
```

No business rule may exist only in a page, route handler, queue processor or React Flow node.
Those are adapters around shared application services.

## 2. Confirmed stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 24 LTS |
| Language | TypeScript strict |
| Package management | pnpm workspaces |
| Web | Next.js App Router with standalone output |
| Dashboard UI | shadcn/ui copied into shared UI package |
| Styling | Tailwind CSS with logical direction-aware utilities |
| Workflow canvas | `@xyflow/react`; React Flow UI where licensed/allowed |
| Canvas local state | Zustand |
| Server cache | TanStack Query |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod resolver |
| Contracts | Zod 4 with schema ID/version envelopes |
| Database | PostgreSQL + Drizzle + committed SQL migrations |
| Queue | BullMQ + Redis, reconstructable from PostgreSQL |
| Files | S3-compatible adapter, MinIO fallback |
| Identity | Better Auth; authorization remains a custom domain module |
| Dates | UTC persistence, Tehran display, `date-fns-jalali` |
| Tests | Vitest, database integration tests and Playwright |

Freeze exact dependency versions in the lockfile. Do not use floating `latest` versions in
deployment builds.

## 3. Repository structure

```text
drop-os/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── studio/
│   │   │   ├── api/v1/
│   │   │   └── preview/
│   │   └── public/fonts/
│   └── worker/
├── packages/
│   ├── core/                 # workspaces, actors, RBAC, approval, audit, comments
│   ├── studio/               # Programs, Lenses, sources, concepts, outputs, requests
│   ├── contracts/            # Zod schemas and generated JSON Schema
│   ├── db/                   # Drizzle schema, repositories, committed migrations
│   ├── pipeline/             # definitions, executor, gates, checkpoints, run manifests
│   ├── workflow-ui/          # React Flow adapters, custom nodes, layout and editor store
│   ├── ai-gateway/           # provider-neutral model profiles and adapters
│   ├── retrieval/            # source registry, reachability and content retrieval adapters
│   ├── storage/              # S3/MinIO abstraction and signed/streamed access
│   ├── ui/                   # shadcn components, DROP tokens and FA/RTL primitives
│   ├── config/               # typed environment and feature flags
│   ├── observability/        # structured logs, metrics and tracing IDs
│   └── testing/              # fixtures, builders and seam harnesses
├── configs/
│   ├── models/
│   ├── weights/
│   ├── sources/
│   ├── budgets/
│   └── glossary/
├── prompts/
├── fixtures/
├── tests/
│   ├── contract/
│   ├── db/
│   ├── integration/
│   ├── workflow/
│   ├── security/
│   ├── golden/
│   └── e2e/
├── docs/
│   ├── adr/
│   ├── runbooks/
│   └── implementation/
├── infra/
│   ├── compose/
│   ├── nginx/
│   └── backup/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## 4. Package dependency rule

Allowed direction:

```text
contracts <- core/studio <- pipeline <- web/worker adapters
contracts <- db repositories <- core/studio application services
ui <- web
workflow-ui <- web
ai-gateway/retrieval/storage <- pipeline/application services
```

Forbidden:

- `packages/core` or `packages/studio` importing Next.js.
- Domain code importing provider SDK response types.
- Domain code importing React Flow node/edge types.
- React components writing directly to Drizzle.
- Workers trusting queue payload content beyond stable IDs.
- `packages/ui` importing feature/domain services.

## 5. Module and database boundaries

- Product identity is DROP OS.
- Studio routes live under `/studio/*`.
- Core data lives in the PostgreSQL `core` schema.
- Studio data lives in the PostgreSQL `studio` schema.
- Shared records carry `workspace_id`; module-scoped assignments carry `module_key='studio'`.
- A module selector appears only when a second real DROP OS module exists.

## 6. Application service pattern

Each use case is an explicit command/query service:

```typescript
type CommandContext = {
  actorId: string;
  actedAsRoleId: string;
  workspaceId: string;
  requestId: string;
};

interface UseCase<I, O> {
  execute(input: I, context: CommandContext): Promise<O>;
}
```

The service performs authorization, validates current state, writes domain records and audit
events in one database transaction, then emits an outbox event. Route handlers and workers only
adapt transport to the use case.

## 7. Transaction and event rule

Use a transactional outbox:

1. Validate command and authorization.
2. Write domain changes.
3. Append audit/domain event and outbox record in the same PostgreSQL transaction.
4. Commit.
5. Dispatcher publishes reconstructable work to Redis/SSE consumers.
6. Mark outbox delivery; retries are idempotent.

No queue message is evidence that a domain change occurred. PostgreSQL records are evidence.

## 8. Configuration rule

All environment and feature configuration passes through `packages/config` and Zod validation.
Separate:

- Build-time public flags.
- Server-only secrets.
- Workspace-owned database configuration.
- Versioned creative configuration such as prompts, rules, weights and budgets.

Important flags:

```text
REACT_FLOW_PRO_LICENSE_CONFIRMED=false
AI_LIVE_EXECUTION_ENABLED=false
PUBLIC_PUBLISHING_ENABLED=false
WORKFLOW_TEMPLATE_EDITING_ENABLED=true
```

The booleans above are examples of behavior; final environment names must follow the repository
naming convention and never be exposed to the browser unless explicitly public.

## 9. Authentication and authorization boundary

Better Auth establishes identity and session only. Every command/query calls the custom RBAC
service with role, capability, scope and approval-policy context. Client-side guards are user
experience helpers, not enforcement.

## 10. Date, locale and identifier rule

- Persist timestamps in UTC with timezone-aware PostgreSQL types.
- Display operational dates in Asia/Tehran and Solar Hijri.
- Store stable identifiers and enum values in English.
- Present Persian labels from externalized message files.
- Wrap IDs, URLs, code, hashes and citations with LTR isolation in the RTL UI.

## 11. Generated artifact isolation

Generated code or HTML is untrusted until validated. Preview it in a sandboxed iframe or
isolated origin with a restrictive Content Security Policy. Generated pages never receive
dashboard session cookies, internal network access or provider credentials.

## 12. Extensibility limits

Create interfaces for providers, retrieval, storage, specialized output agents and publishing.
Do not create microservices, plugin marketplaces, embeddings, CRDT collaboration or arbitrary
user-written executable nodes in V0.

