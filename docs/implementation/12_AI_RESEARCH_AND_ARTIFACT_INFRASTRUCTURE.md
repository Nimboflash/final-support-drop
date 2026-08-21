# AI, Research and Artifact Infrastructure

## 1. AI gateway boundary

Every machine and specialized agent calls one provider-agnostic gateway. Domain code never
imports a provider SDK or relies on provider response objects.

```typescript
interface AiGateway {
  generateStructured<I, O>(request: StructuredGenerationRequest<I, O>): Promise<GatewayResult<O>>;
}
```

Request fields include model profile reference, prompt version, input artifact IDs, output JSON
Schema, budget and correlation IDs. The gateway resolves credentials and provider adapters on
the server.

## 2. Model profiles

Versioned profile fields:

```yaml
profile_id:
version:
task_class:
provider_adapter:
model_identifier:
reasoning_profile:
temperature_or_equivalent:
max_input_tokens:
max_output_tokens:
cost_ceiling:
timeout:
fallback_profile:
data_transmission_class:
status:
```

Do not hard-code "Claude" or another provider in a machine contract. The primary build may use
Claude Code, but the product runtime remains provider-neutral.

## 3. Structured output and repair

1. Validate machine input with Zod.
2. Export/use the corresponding JSON Schema for provider structured output where supported.
3. Preserve raw response separately with restricted access.
4. Parse and validate output with the exact schema version.
5. On malformed output, perform one bounded repair request containing validation errors.
6. If repair fails, mark the stage `FAILED_FINAL`; never auto-approve or invent missing fields.

Semantic/hard-rule validators run after schema validation.

## 4. Provider configuration failure

If no valid live profile/credential exists:

- Stage enters a named configuration-required wait/failure state.
- Dashboard, workflow editing, registries, approvals, artifacts, manual requests and history
  remain usable.
- Users may supply manual artifacts through governed requests where the workflow permits.
- The system never assumes a proxy, VPN or unauthorized bypass.

## 5. Prompt, rule and example registries

- Prompts, rules, examples, weights, source policies and model settings remain outside
  application code.
- Publication creates immutable versions.
- Machine runs freeze exact versions.
- Only authorized roles publish rules; learning proposals remain drafts until approved.
- Prompt text never contains provider credentials.
- Example Library records accepted, rejected and borderline outputs with reasons.

## 6. Research plan contract

A Research Plan is created and frozen before retrieval. It includes:

```text
research questions and criticality
tracks
required authority/scholarly/curatorial/signal layers
minimum Iranian/Persian evidence
minimum international evidence
Tehran relevance checks
evidence slots
substitution qualification
critical gaps
budgets
saturation rules
```

Manual plan amendments require an approval event, rationale and a new plan version.

## 7. Three-pass retrieval

### Pass 1 - Discovery scan

- Approximately 40-80 metadata candidates.
- Do not place full documents in model context.
- Machine-discovered sources enter registry as `CANDIDATE`.

### Pass 2 - Validation

- Validate 25-50 sources; target 36 by default.
- Read only relevant sections where possible.
- Test origin, authorship, access, rights, bias, relevance and independence.

### Pass 3 - Deep extraction

- Deep-read approximately 12-18 highest-evidence sources.
- Extract claim-level findings with exact locators.
- Preserve contradictions and limitations.

## 8. Deployment-origin reachability

Record separately:

```text
network_status
http_status
content_retrieval_status
authentication_required
robots_or_terms_constraint
checked_from_deployment
checked_at
failure_reason
```

A reachable homepage does not prove retrievable evidence. Tests must run from the actual Iranian
deployment before research production acceptance.

## 9. Evidence coverage

- Coverage denominator is frozen evidence slots.
- Blocked/unreachable slots remain in the denominator.
- A qualified equivalent may fill a slot only when track, layer, geography/language and quality
  satisfy the substitution policy.
- Substitution stores original slot, replacement source, evaluator and rationale.
- Critical gaps block completion.
- Non-critical gaps require a named human acceptance.

## 10. Human retrieval

Valid but inaccessible evidence creates a `RESEARCH_REQUEST`. The returned file/evidence stores:

- Request and source link.
- Human retriever.
- Retrieval method and date.
- Rights/usage notes.
- Checksum and file object.
- Source identity validation.
- Exact provenance relation.

Human retrieval extends access; it does not bypass validation.

## 11. Persian research synthesis

- Human-facing synthesis is authored natively in Persian.
- Preserve original titles, names and source citations.
- Keep facts, interpretations, observations, opinions and hypotheses typed.
- Foreign findings include an explicit Tehran relevance/transferability assessment.
- Automation flags Persian typography and glossary issues; `FA_EDITORIAL` remains a human gate.

## 12. Artifact registry

Every artifact version stores:

```text
stable artifact ID and version
project/program/lens scope
producer machine/stage/agent and run
input artifact versions
prompt/rule/example/model/schema/workflow versions
content file/object reference
status and confidence
validation results
rights/accessibility metadata
human approval events
checksum and timestamps
```

Store large files in S3-compatible storage. Structured metadata, provenance and authority stay in
PostgreSQL.

## 13. Generated landing-page artifacts

A landing-page job outputs a versioned bundle plus manifest:

```yaml
entrypoint:
framework_or_static_format:
build_command:
asset_inventory:
content_sources:
brand_token_version:
supported_breakpoints:
accessibility_report:
security_scan:
preview_uri:
export_checksum:
known_limitations:
```

V0 may use a stub/fixture. Later production logic must validate build, links, accessibility,
content provenance, external requests and CSP before approval. Export does not equal publish.

## 14. Storage adapter

```typescript
interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  getAuthorizedStream(input: GetObjectInput): Promise<ReadableStream>;
  createAuthorizedAccess(input: AccessInput): Promise<ShortLivedAccess>;
  head(objectKey: string): Promise<ObjectMetadata>;
}
```

Use checksums, content-type allowlists, size limits, malware/content scanning policy and safe
filenames. Never trust browser-supplied media type.

## 15. Retrieval before embeddings

V0 uses:

- Relational filters.
- Explicit provenance/relationships.
- PostgreSQL Persian-aware full-text search.
- Source/finding/artifact metadata.
- Curated summaries with citations.

Add vector infrastructure only through a later ADR after measured retrieval failures show a
need. Do not hide missing provenance behind semantic similarity.

## 16. Cost controls

- Per-stage max attempts and revision rounds.
- Input/output token ceilings.
- Cost ceiling and timeout.
- Metadata scan before full retrieval.
- Deduplicate sources before deep extraction.
- Cache immutable normalized inputs and extracts.
- Store usage per attempt, stage, run, Program and workspace.
- Budget exhaustion escalates; it never silently lowers evidence requirements.

