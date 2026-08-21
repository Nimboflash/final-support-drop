# Deployment and Operations

## 1. Deployment principles

- Iranian infrastructure first.
- Self-hostable and vendor-portable always.
- Docker Compose is the reference deployment.
- No mandatory Western PaaS, remote fonts or runtime CDN.
- AI provider access and billing are client-owned.
- No proxy/VPN/restriction-bypass assumption.
- Server-side provider calls only.
- Manual dashboard functionality survives provider unavailability.

## 2. Reference services

```text
nginx       - TLS termination/reverse proxy/static policy
web         - Next.js standalone server
worker      - BullMQ/pipeline worker
postgres    - authoritative relational state
redis       - reconstructable queue/dispatch
minio       - S3-compatible local/reference object storage
backup      - scheduled database/object backup jobs
```

Use managed PostgreSQL/S3 on an Iranian vendor only when the adapter remains portable and a
documented export/restore path exists.

## 3. Environment separation

At minimum:

```text
local
test
staging
production
```

- Separate databases, buckets, queues and credentials.
- Never use production evidence or provider keys in automated test.
- Staging should reproduce production network origin as early as possible for source
  reachability tests.
- Feature flags do not replace environment isolation.

## 4. Configuration categories

### Required platform configuration

- Database URL.
- Redis URL.
- S3 endpoint, bucket and credentials.
- Auth secret and canonical origin.
- Encryption/key-management configuration.
- Trusted proxy/TLS settings.

### Optional live AI configuration

- Active model profile IDs.
- Provider adapter credentials.
- Data transmission approval/version.

When optional AI config is absent, health remains degraded-but-usable rather than globally
unhealthy.

## 5. Health endpoints

```text
/health/live  - process event loop is alive
/health/ready - required local dependencies available
/health/deps  - authorized diagnostic detail for Postgres/Redis/storage/provider adapters
```

Readiness rules:

- PostgreSQL unavailable -> not ready.
- Required object storage unavailable -> not ready for file/artifact operations.
- Redis unavailable -> web may remain readable; worker dispatch degraded; durable state intact.
- AI provider unavailable/unconfigured -> platform ready with explicit AI-degraded status.

## 6. Database migrations

- Drizzle generates/reviews committed SQL migrations.
- Migration runs are explicit release steps, not automatic on every web process start.
- Back up before destructive/locking migrations.
- Use expand/migrate/contract for non-trivial production changes.
- Every migration has forward verification and documented rollback/mitigation.
- Published/audit immutability constraints are tested after migration.

## 7. Backup and restore

Back up:

- PostgreSQL with point-in-time or frequent logical/physical policy appropriate to the vendor.
- Object storage with versioning or replicated backup.
- Versioned prompts/configs from Git and database publication metadata.
- Deployment configuration excluding plaintext secrets.

Release 6 requires:

1. Restore into an isolated environment.
2. Verify artifact checksums and database/object links.
3. Reconstruct pending queue work from PostgreSQL.
4. Open historical runs and approvals.
5. Migrate the restored system to a second host/vendor-compatible stack.

Define final RPO/RTO with the client before production launch; do not invent guarantees in UI.

## 8. Object storage operations

- Private buckets by default.
- Short-lived authorized access or server streaming.
- Lifecycle policy must respect artifact retention/immutability.
- Verify checksum on upload and restoration.
- Generated previews live in a separate restricted prefix/bucket/origin.
- No public bucket for internal artifacts.

## 9. Network and security

- TLS for all user-facing traffic.
- Restrictive egress where compatible with configured providers/source access.
- CSP for dashboard; stricter isolated CSP for generated artifact previews.
- Rate limiting on auth, file upload, expensive search and run commands.
- Reverse proxy request/body limits aligned with file policies.
- Secrets supplied through approved deployment secret mechanism, never committed.
- Locally bundle fonts and critical assets.

## 10. Observability

### Structured logs

Include request/correlation/run/stage IDs, safe error code, latency and actor ID where permitted.
Exclude secrets, cookies, raw provider prompts/responses and confidential artifact content by
default.

### Metrics

```text
HTTP latency/error rate
queue lag and worker concurrency
run/stage duration and outcomes
retry/final failure counts
Postgres/Redis/storage health
SSE connections/reconnects/gaps
provider latency/error/cost
source reachability rate
approval wait time
request cycle time
backup age and restore verification
```

### Tracing/correlation

Propagate a correlation ID from HTTP command through outbox, worker attempt, gateway/retrieval
adapter, artifact write and domain event.

## 11. Operational runbooks

Create and test runbooks for:

- Redis loss and dispatch reconstruction.
- Worker crash during a stage attempt.
- Provider configuration/unavailability.
- Database restore.
- Object missing/checksum mismatch.
- Stuck approval/request.
- Stale workflow edit conflict.
- Malformed AI output after repair failure.
- Source registry widespread reachability failure.
- Membership disable/security incident.

## 12. Release procedure

1. Green CI and independent review.
2. Database backup and migration plan.
3. Build pinned Docker images.
4. Deploy staging and run smoke/security checks.
5. Verify FA/RTL, workflow canvas and one synthetic run.
6. Human-owner release gate.
7. Deploy production with explicit migration.
8. Verify health, login, permissions, audit, file access and queue reconstruction signal.
9. Record release version and config checksums.

## 13. Iranian production acceptance

Before research production use, test from ordinary intended user/deployment networks:

- Dashboard reachability and TLS.
- Font/assets with no remote CDN dependency.
- File upload/download.
- SSE and polling fallback.
- AI provider adapter where lawfully configured.
- Source network and content retrieval separately.
- Timezone/Jalali rendering.
- Backup target reachability.

Record results as deployment evidence, not informal assumptions.

