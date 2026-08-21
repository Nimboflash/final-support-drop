# Product Surfaces and Information Architecture

## 1. Surface model

### 1.1 Operational dashboard

The internal FA-first workspace used to create, operate, review and audit Programs and Weekly
Lenses.

### 1.2 Workflow canvas

A full-screen or resizable dashboard workspace that provides template authoring and run
inspection. It is part of the dashboard, not a separate application or source of truth.

### 1.3 Artifact preview/export

A sandboxed renderer for approved or draft artifacts, including copy, research documents,
visual briefs, print packs and landing-page bundles. External publication requires a separate
explicit action and is not part of V0.

## 2. Global navigation

The primary navigation is on the right in Persian RTL.

| Persian label | Route | Purpose |
|---|---|---|
| نمای کلی | `/studio` | Workspace-level status, pending actions and blockers |
| پروژه‌ها | `/studio/projects` | Collaborative work containers |
| برنامه‌ها | `/studio/programs` | Deep Programs and pipeline status |
| لنزهای هفته | `/studio/lenses` | Weekly Lens child editions |
| درخواست‌ها | `/studio/requests` | Assigned, waiting, blocked and overdue work |
| تقویم | `/studio/calendar` | Portfolio and concept calendars |
| اجراها | `/studio/runs` | Run registry, failures, cost and comparison |
| جریان‌های کاری | `/studio/workflows` | Workflow templates and versions |
| رجیسترها | `/studio/registries` | Prompts, rules, examples, sources and agents |
| تیم و دسترسی | `/studio/team` | Membership, roles, capabilities and scopes |
| تنظیمات | `/studio/settings` | Workspace, providers, budgets and system config |

Hide or disable actions by permission for clarity, but never rely on hidden UI for security.

## 3. Project and Program routes

```text
/studio/projects/[projectId]
├── overview
├── brief
├── activity
└── settings

/studio/programs/[programId]
├── overview
├── workflow
├── references
├── concepts
├── research
├── directions
├── concept-bible
├── outputs
├── artifacts
├── requests
├── calendar
├── runs
└── audit
```

The active Program header always shows:

- Program title and type.
- Current stage and active workflow version.
- Next permitted action.
- Active run status.
- Pending human decisions.
- Blockers.
- Target date.
- Current Lens mode.

## 4. Weekly Lens routes

```text
/studio/lenses/[lensId]
├── overview
├── current-context
├── selections
├── outputs
├── workflow
├── requests
├── calendar
└── audit
```

The Lens view must preserve its parent Program, Concept Bible version, Lens territory and
current-context scan provenance.

## 5. Workflow routes

| Route | Mode |
|---|---|
| `/studio/workflows` | Definition list and version status |
| `/studio/workflows/[definitionId]` | Published template read view |
| `/studio/workflows/[definitionId]/versions/[versionId]/edit` | Draft template editor |
| `/studio/runs/[runId]/workflow` | Live/historical execution view |
| `/studio/runs/compare?left=&right=` | Run comparison, Release 6 |

The editor page contains:

- Collapsible node library on the right.
- Central React Flow canvas.
- Inspector sheet/panel on the left.
- Top command bar for validate, save draft, publish, fit, search and version history.
- Bottom compact run/status console when previewing or executing.

On narrow screens, template editing is read-only. Full authoring requires a desktop-width
viewport; execution status and approvals remain usable on mobile.

## 6. Core dashboard pages

### 6.1 Overview

- My waiting actions.
- Active Programs by stage.
- Blocked and failed runs.
- Upcoming milestones.
- Recent approvals and revisions.
- Provider/configuration warnings.

### 6.2 Program list

Use TanStack Table with saved views. Columns:

- Name.
- Program type.
- Lens mode.
- Current machine/stage.
- Run status.
- Next action.
- Owner.
- Target date.
- Blockers.
- Last updated.

### 6.3 Program overview

- Compact stage timeline.
- Embedded read-only workflow graph.
- Approved artifact summary.
- Pending decisions and requests.
- Research coverage and critical gaps.
- Latest activity and run metadata.

### 6.4 Reference Board

- File/link/text intake.
- `why_selected`, `important_aspect`, `do_not_copy`, `intended_use` and submitter.
- Type filters and analysis status.
- Split view: reference preview and structured interpretation.

### 6.5 Concept workspace

- Pattern/tension map.
- 3-5 Concept Cards.
- Independent critique.
- Version comparison.
- Structured decision form: preserve, remove, change and why.

### 6.6 Research workspace

- Frozen Research Plan and version.
- Evidence-slot coverage matrix by track, layer, geography and language.
- Source Registry and lifecycle state.
- Network reachability versus content-retrieval status.
- Findings with claim-level citations.
- Contradictions and blocked gaps.
- Human retrieval requests.
- Budget and saturation signals.

### 6.7 Direction and Concept Bible workspace

- Candidate clusters and roles.
- DROP FIT and conditional LENS RELEVANCE results.
- Weight profile.
- Direction A/B/C comparison.
- Guardian approval.
- Immutable Concept Bible version view.

### 6.8 Output workspace

- Output classifications and narrative roles.
- Output Manifest items.
- Specialized agent jobs and validation results.
- Artifact previews and version history.
- `FA_EDITORIAL` gate state.
- Execution Manifest and external requirements.

### 6.9 Request Feed

Default saved views:

```text
Assigned to me
Waiting for me
Needs decision
Needs review
Needs approval
Revision required
Human action
Physical action
Blocked
Overdue
High priority
Completed
```

Each request card shows required action, related artifact/version, owner, requester, due date,
dependencies, blocker, status and one clear next CTA.

### 6.10 Calendar

- Portfolio and Program tabs.
- Solar Hijri display over UTC storage.
- Machine tasks, human actions, reviews, approvals, revisions and deliveries.
- Dependency and blocker visibility.
- Proposed dates are editable and never presented as proven physical lead times.

### 6.11 Run and audit views

- Workflow and machine versions.
- Prompt, rule, example, schema and model versions.
- Input/output artifact versions.
- Stage attempts, failures, repair retry and checkpoints.
- Token/cost usage.
- Approval actor and acted-as role.
- Append-only event history.

## 7. Role-aware landing behavior

| User context | Default landing focus |
|---|---|
| Workspace Owner | Workspace health, roles, provider/configuration and cost |
| DROP Guardian | Rules, directions, exceptions and pending approvals |
| Project Lead | Active Programs, next actions, calendar and blockers |
| Reviewer/Editor | Assigned reviews, artifacts and feedback |
| Contributor | Assigned retrieval/production requests and submissions |
| Viewer | Approved material and read-only progress |
| Technical Maintainer | Runs, failures, workflow versions, providers and audit |

## 8. Empty, loading and failure states

Every page defines:

- First-use empty state with one next action.
- Loading skeleton that preserves layout.
- Permission-denied state with no data leakage.
- Configuration-required state that keeps manual functionality accessible.
- Retryable failure with exact permitted action.
- Final failure with diagnostic ID and escalation path.
- Offline/reconnecting state for live workflow events.

## 9. Public artifact boundary

Use `/studio/artifacts/[artifactId]/preview` for internal preview. Landing-page artifacts are
rendered in a sandboxed frame or isolated preview origin. They may be exported as a versioned
bundle. Do not expose dashboard cookies, provider keys or internal APIs to generated page code.

