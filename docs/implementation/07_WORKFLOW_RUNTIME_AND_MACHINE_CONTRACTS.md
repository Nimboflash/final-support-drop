# Workflow Runtime and Machine Contracts

## 1. Separate definition from execution

```text
Workflow Definition
  -> immutable Published Version
      -> Pipeline Run
          -> Stage Runs
              -> Stage Attempts
                  -> Artifacts, events, approvals and usage
```

Canvas nodes are visual adapters over workflow node definitions. Stage runs are runtime records.
Do not serialize a React Flow object and call it the execution engine.

## 2. Canonical node categories

```text
START
AUTOMATED_STAGE
VALIDATION_GATE
HUMAN_APPROVAL_GATE
CONDITION
SPECIALIZED_AGENT
HUMAN_REQUEST
SUBFLOW
END
```

Machine 01-05 are group boundaries, not executable nodes by themselves. Each group contains
stages and gates.

## 3. Canonical persisted stage states

```text
DRAFT
READY
QUEUED
RUNNING
WAITING_FOR_DEPENDENCY
WAITING_FOR_INPUT
WAITING_FOR_APPROVAL
PAUSED
SUCCEEDED
FAILED_RETRYABLE
FAILED_FINAL
CANCELLED
SKIPPED
SUPERSEDED
```

### 3.1 Permitted transition outline

```text
DRAFT -> READY
READY -> QUEUED | WAITING_FOR_DEPENDENCY | WAITING_FOR_INPUT | WAITING_FOR_APPROVAL
QUEUED -> RUNNING | CANCELLED
RUNNING -> SUCCEEDED | WAITING_FOR_INPUT | WAITING_FOR_APPROVAL | FAILED_RETRYABLE | FAILED_FINAL
FAILED_RETRYABLE -> QUEUED | FAILED_FINAL | CANCELLED
WAITING_* -> READY | CANCELLED
PAUSED -> READY | CANCELLED
SUCCEEDED -> SUPERSEDED only through a later run/version relationship
```

`BLOCKED` and `IN_REVIEW` are UI categories derived from failure/wait states plus reason codes.
They are not persisted as parallel state machines.

## 4. Required node definition contract

```typescript
type WorkflowNodeDefinition = {
  nodeKey: string;
  category: NodeCategory;
  machineKey: 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | null;
  stageKey: string;
  version: number;
  titleMessageKey: string;
  inputSchemaRef: SchemaRef;
  outputSchemaRef: SchemaRef;
  executorRef?: RegistryRef;
  validatorRefs: RegistryRef[];
  approvalPolicyRef?: RegistryRef;
  ruleSetRefs: RegistryRef[];
  budgetProfileRef?: RegistryRef;
  retryPolicy: RetryPolicy;
  timeoutPolicy: TimeoutPolicy;
  checkpointPolicy: CheckpointPolicy;
  config: Record<string, unknown>;
};
```

The actual code may differ in syntax but must preserve these semantics.

## 5. Stage executor contract

```typescript
interface StageExecutor<I, O> {
  validateInput(input: unknown, context: StageContext): I;
  execute(input: I, context: StageContext): Promise<StageExecutionResult<O>>;
  validateOutput(output: unknown, context: StageContext): Promise<O>;
}

type StageContext = {
  workspaceId: string;
  runId: string;
  stageRunId: string;
  attemptNumber: number;
  frozenManifestId: string;
  inputArtifactVersionIds: string[];
  idempotencyKey: string;
  budget: FrozenBudget;
  abortSignal: AbortSignal;
};
```

Executors receive stable IDs and load authorized data through application services. Queue jobs
do not carry sensitive content or become a second state store.

## 6. Run creation

Before a run becomes `READY`, atomically freeze a run manifest containing:

- Workflow definition/version and checksum.
- Constitution and Rule Registry versions.
- Prompt and Example Library versions.
- Machine/stage schema versions.
- Model profiles and gateway configuration version.
- Research Plan and Source Registry snapshot when applicable.
- Input artifact versions.
- Approval policies.
- Budgets.
- Actor initiating the run.

If any required version cannot be resolved, run creation fails closed.

## 7. Queue and recovery behavior

- Insert stage state and outbox work in the same PostgreSQL transaction.
- Workers claim by stage-run ID and idempotency key.
- A stage checks its current durable state before work.
- Checkpoints store completed durable steps, never provider-specific transient objects.
- Human gates leave no long-running queue job.
- On Redis loss, a reconciler queries PostgreSQL for `READY|QUEUED|FAILED_RETRYABLE` work and
  reconstructs dispatch safely.
- Duplicate delivery returns the already-recorded result or performs no-op reconciliation.

## 8. Retry policy

- Infrastructure failures may follow a bounded exponential retry profile.
- Malformed AI structured output receives exactly one repair attempt.
- Subjective quality does not trigger unbounded generation.
- Budget exhaustion produces a named escalation/block state.
- Each attempt stores failure class, error code, safe diagnostic, provider request ID where
  allowed, token/cost usage and checkpoint.

## 9. Deep Program workflow template

### Machine 01 - Reference-Driven Concept Discovery

```text
Brief validation
-> Reference intake
-> Per-reference interpretation
-> Pattern and tension discovery
-> Generate 3-5 Concept Cards
-> Independent critique
-> Focused revision
-> Comparison
-> Human concept gate
-> Candidate rule proposal
```

The critic uses a separate model profile. Human feedback records preserve/remove/change/why.

### Machine 02 - Controlled Research

```text
Load approved concept
-> Draft Research Plan
-> Human/authorized plan freeze
-> Registry-first discovery scan
-> Deployment-origin reachability
-> Source validation
-> Human retrieval requests for valid inaccessible evidence
-> Deep extraction and claim citations
-> Contradiction map and candidate pools
-> Frozen-slot coverage and saturation evaluation
-> Human non-critical gap decision when needed
-> Publish Research Package
```

Iranian/Persian and international evidence are mandatory. Blocked slots remain in the
denominator. A plan change creates an approval event and a new version.

### Machine 03 - Synthesis, Weighting and Decision

```text
Normalize entities
-> Detect duplicates and clusters
-> Assign candidate roles and programming layer
-> DROP FIT / conditional LENS RELEVANCE hard gates
-> Select weight profile
-> Score candidates
-> Construct Direction A/B/C as systems
-> Independent direction critique
-> DROP Guardian approval
-> Publish immutable Concept Bible and Lens territories
```

Hard-gate failure cannot be offset by score.

### Machine 04 - Output Definition and Production Control

```text
Classify required/recommended/optional/deferred/rejected outputs
-> Assign distinct narrative roles
-> Draft and approve Output Manifest
-> Route jobs through SpecializedOutputAgent registry
-> Validate returned artifacts
-> Human/FA editorial gates where required
-> Extract Execution Manifest
-> Publish Production and Handoff Package
```

Specialized agent interface:

```typescript
interface SpecializedOutputAgent {
  agentType: string;
  supportedOutputTypes: string[];
  validateInput(request: OutputProductionRequest): ValidationResult;
  produce(request: OutputProductionRequest): Promise<ProducedArtifact>;
  validateOutput(artifact: ProducedArtifact): Promise<ArtifactValidation>;
}
```

V0 uses stubs/fixtures behind the real registry and contracts.

### Machine 05 - Calendar, Feed and Handoff

```text
Load validated Production and Handoff Package
-> Generate editable requests and calendar items
-> Resolve owners/readiness/dependencies
-> Track blocks, submissions and approvals
-> Collect structured feedback
-> Route scoped artifact revisions to Machine 04
-> Record declared human/physical completion and limitations
-> Close or hand off Program
```

Machine 05 does not mutate Machine 04 artifacts.

## 10. Weekly Lens workflow template

```text
Select approved Program + Bible version + Lens territory
-> Create Lens child record
-> Mandatory lightweight current-context scan
-> Draft Lens proposition/question
-> Select candidate expressions and programming layers
-> Apply DROP FIT to all selections
-> Apply LENS RELEVANCE only to LENS_ALIGNED selections
-> Human Lens approval
-> Enter Machine 04 output commissioning boundary
-> Enter Machine 05 calendar/request/handoff boundary
-> Archive edition with exact provenance
```

It is not a complete rerun of Machines 01-03 and never a pure stale extract of the Bible.

## 11. Conditional and loop edges

Allowed edge types:

```text
SUCCESS
FAILURE_RETRY
FAILURE_FINAL
CONDITION_TRUE
CONDITION_FALSE
APPROVED
CHANGES_REQUESTED
REJECTED
ESCALATED
REVISION
```

Every loop edge defines:

- Allowed source and target.
- Maximum iterations.
- Budget impact.
- Version behavior.
- Required preserved constraints.
- Terminal behavior when the loop limit is reached.

Arbitrary graph cycles are invalid.

## 12. Manual commands

Supported commands are explicit and permissioned:

```text
START_RUN
PAUSE_RUN
RESUME_RUN
CANCEL_RUN
RETRY_STAGE
SUBMIT_INPUT
APPROVE_GATE
REQUEST_CHANGES
ESCALATE_GATE
CREATE_RERUN
```

Each command stores actor, acted-as role, idempotency key, reason and expected current row
version. The server rejects stale or unauthorized commands.

## 13. Workflow validation before publish

Publishing requires all checks to pass:

- Graph has valid start/end reachability.
- All node/edge IDs are unique.
- No illegal cycles or orphan nodes.
- Input/output schemas resolve.
- Every gate resolves to rules/approval policy.
- Every executor/validator/agent registry reference exists and is active.
- Machine boundary order is valid.
- Revision edges target permitted Machine 04 nodes.
- Budgets and retry limits exist.
- Required human assignment policy exists.
- At least one deterministic failure terminal is reachable.
- Accessibility labels and Persian message keys exist for every visible node.

## 14. Run completion

A run is complete only when all required terminal artifacts and approvals exist and every
required stage is `SUCCEEDED|SKIPPED` under an allowed condition. UI position, animated edge
completion or a client-side state cannot complete a run.

