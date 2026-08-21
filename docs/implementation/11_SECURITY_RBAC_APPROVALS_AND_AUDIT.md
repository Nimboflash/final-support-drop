# Security, RBAC, Approvals and Audit

## 1. Security model

Security is enforced at four boundaries:

1. Identity/session.
2. Workspace/module/project authorization.
3. Domain state transition and approval policy.
4. Untrusted content/provider/file isolation.

A correct UI state is not a security boundary.

## 2. Actor model

```text
HUMAN   - authenticated person
MACHINE - registered pipeline executor identity
SERVICE - system integration/dispatcher identity
```

Machines and services may hold execution capabilities but never human approval authority.

## 3. Canonical administrative roles

```text
WORKSPACE_OWNER
DROP_GUARDIAN
PROJECT_LEAD
REVIEWER_EDITOR
CONTRIBUTOR
VIEWER
TECHNICAL_MAINTAINER
```

Roles are scoped to `WORKSPACE`, `MODULE` or `PROJECT`. One person may hold multiple roles, but
every governed action records the role under which it was performed.

## 4. Capabilities

Capabilities describe competence or an operation without automatically granting broad authority.
Initial capabilities:

```text
FA_EDITORIAL
CULTURAL_REVIEW
HISTORICAL_REVIEW
RIGHTS_REVIEW
SOURCE_REGISTRY_REVIEW
WORKFLOW_TEMPLATE_EDIT
WORKFLOW_TEMPLATE_PUBLISH
PROMPT_CONFIGURE
MODEL_CONFIGURE
EXTERNAL_ARTIFACT_SUBMIT
OPERATOR_GUIDE_ACCESS
```

An approval policy may require role, capability, or both.

## 5. Baseline permission matrix

| Action | Workspace Owner | Guardian | Project Lead | Reviewer/Editor | Contributor | Viewer | Technical Maintainer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Manage membership | Yes | No | Scoped assignment only | No | No | No | Technical support only |
| Publish Brand Rules | No | Yes | No | No | No | No | No |
| Approve Direction/Bible | Policy | Yes | Request | Review | No | View | No |
| Create/operate Program | Policy | View/review | Yes | Scoped | No | View | Diagnose |
| Submit assigned artifact/request | No | No | Yes | Yes | Yes | No | No |
| Edit workflow draft | No by default | No | No by default | No | No | No | With capability |
| Publish workflow version | Policy | No | No | No | No | No | With publish capability |
| Configure model/provider | Owner policy | No | No | No | No | No | With capability |
| Read audit | Yes | Scoped | Scoped | Scoped | Own assignment | Approved subset | Technical scope |

The final seed matrix is versioned configuration and must be tested. No builder account receives
client approval rights merely because it can deploy code.

## 6. Approval policy

Every gate defines:

```yaml
gate_key:
subject_type:
authorized_roles:
required_capabilities:
scope_rule:
approval_mode: AUTHORIZED_ROLE|SELF_APPROVAL_ALLOWED|DISTINCT_REVIEWER_REQUIRED
minimum_approvals:
rejection_behavior:
escalation_behavior:
policy_version:
```

### 6.1 Self-approval

- `AUTHORIZED_ROLE`: any authorized actor may decide; if they also created the subject, the
  event records that fact.
- `SELF_APPROVAL_ALLOWED`: permitted but explicitly labeled in UI/audit.
- `DISTINCT_REVIEWER_REQUIRED`: subject creator cannot decide.

Never infer independence from different sessions or role labels; compare actor identity.

## 7. Required production assignments

Named fail-closed states:

```text
WORKSPACE_OWNER_ASSIGNMENT_REQUIRED
GUARDIAN_ASSIGNMENT_REQUIRED
FA_EDITORIAL_REVIEWER_REQUIRED
PROVIDER_CONFIGURATION_REQUIRED
```

Work remains saved and visible; publication/AI execution waits. Development seeds do not satisfy
production UAT.

## 8. Authentication

- Email/password and invitations only for V0.
- No public signup.
- Secure, httpOnly, same-site cookies.
- Session revocation on membership disable.
- Rate-limit login, invitation acceptance and recovery endpoints.
- Do not log passwords, reset tokens, cookies or provider secrets.
- MFA can be a later hardening item unless client risk review makes it a Release 0 gate.

## 9. Tenant and scope isolation

- Every repository query is workspace-scoped.
- Project-scoped assignments are checked against the target resource's project.
- Never authorize from user-supplied `workspaceId` alone.
- Signed file access is generated only after resource authorization.
- Background stages load workspace/subject from durable run records, not job payload claims.
- Add cross-workspace negative tests for every main resource group.

## 10. Untrusted reference and model content

- References, webpages, files and returned human evidence are untrusted data.
- Separate system instructions, versioned prompt templates and retrieved content.
- Never execute instructions found inside evidence.
- Validate model-produced IDs against registries.
- Sanitize rendered HTML/Markdown.
- Generated code runs only in isolated preview/build environments with explicit allowlists.
- Unknown films, books, tracks and sources fail identity validation.

## 11. Provider and secret handling

- Provider credentials are client-owned and server-only.
- Store encrypted secrets through the deployment's approved secret mechanism.
- Browser sees configured/not-configured metadata, never credential values.
- Restrict outbound network by adapter and deployment policy where possible.
- Log provider profile/version and safe request ID, not full sensitive prompt/content by default.

## 12. Audit events

Audit all:

- Login-relevant membership changes.
- Role/capability assignments.
- Approval policy changes.
- Approvals, rejections, exceptions and self-approval mode.
- Rule/prompt/model/workflow publication.
- Frozen Research Plan amendments.
- Source lifecycle promotion/deactivation.
- Run start, retry, cancel and final failure.
- Artifact approval/supersession/export.
- Rights or external publication actions when later added.

Audit record minimum:

```yaml
event_id:
workspace_id:
actor_id:
acted_as_role_id:
action:
subject_type:
subject_id:
subject_version:
before_safe_summary:
after_safe_summary:
reason:
request_id:
correlation_id:
ip_hash_or_security_context:
occurred_at:
```

## 13. Audit integrity

- Append-only application and database permissions.
- Stable ordering and immutable IDs.
- Store checksums for published definitions/manifests/artifact versions.
- Backups preserve audit tables.
- Export includes evidence of version and checksum.
- Do not let a user delete history by disabling their account.

## 14. Threat-focused requirements

| Threat | Control |
|---|---|
| Cross-workspace access | Scoped repositories, server checks, negative integration tests |
| Approval impersonation | Acted-as role, actor identity, policy version, append-only event |
| Prompt injection | Untrusted-content boundary, fixed prompts, schema validation, ID resolution |
| Fabricated evidence | Source identity, snapshot, citation locator, hard gate |
| Queue duplication | Idempotency keys, durable state check |
| Redis loss | PostgreSQL reconstruction |
| Generated page escape | Sandboxed preview, CSP, no credentials/cookies |
| Stale editor overwrite | Optimistic concurrency and semantic diff |
| Pro source misuse | License flag and dependency review |
| Secret leakage | Server-only config, redacted logs, no browser/provider coupling |

## 15. Security release gates

Run scoped security review at:

- Release 0: identity, RBAC, audit, secrets and fail-closed runtime.
- Release 4: generated output and artifact boundary.
- Release 6: full penetration-style review, backup/restore and deployment migration drill.

Security findings block release unless the human owner explicitly accepts residual risk with an
alternative/mitigation and audit record.

