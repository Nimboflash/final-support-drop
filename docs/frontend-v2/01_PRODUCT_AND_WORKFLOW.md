# Product and workflow contract

## 1. Current product

DROP Studio OS is a Persian-first workspace for developing and reviewing authored cultural concepts and their digital/editorial outputs. The user starts an exploration, reviews concept proposals, advances approved concepts, reviews each content output, receives a package, and sees it in a plan/calendar.

Build only the support/control-panel frontend now. Use the existing Next.js/TypeScript workspace, shadcn/ui, Tailwind, React Flow and typed deterministic mock adapters. No databases, authentication server, Redis, workers, queues, AI SDK execution, scraping, research engine, model fine-tuning or publishing service. Existing machine-oriented placeholder packages remain inert. In product language, “refine” means iterative idea refinement; it does not mean training model weights.

Public landing-page implementation remains a separate surface and is excluded from this build. The panel may preview landing copy and export a landing content payload. Physical curation, resource allocation, supplier management and execution logistics remain with the team.

## 2. Domain language

- A **work item** is the UI wrapper for a Program or Weekly Lens, not a new competing product entity. Preserve existing IDs and `program_type`, `lens_mode`, `programming_layer` fields when present.
- A **Program** is a deeper authored concept with an approved Concept Bible.
- A **Weekly Lens** is a lighter child of an approved Program/Concept Bible. Its creation requires selecting that parent. A user may start a Program without reference input. Selecting a Lens parent is lineage metadata, not a third input mode.
- A **concept batch** contains candidate cards generated in one attempt. Multiple cards may be approved. An approved card creates its own content branch within the work item; it does not create another Program automatically.
- A **content item** is a reviewable deliverable tied to one approved concept version.
- A **package** is an immutable snapshot of approved required content versions and their provenance. It can group multiple included concept branches while preserving their identity.

Defaults in this document are frontend demo/product decisions, not claims about already implemented machine contracts.

## 3. Start flow

Primary CTA: «شروع مسیر جدید». A short dialog or full-page wizard has two entry cards:

| Mode | Persian label | Data | Behavior |
| --- | --- | --- | --- |
| Blank discovery | بدون ورودی | `input: null` | Start without mandatory prompt, upload or URL; external machine will explore within its guardrails |
| Reference-led | با رفرنس | tagged reference list | Accept file, article URL or pasted text; require at least one valid reference |

Optional details: working title, Program/Weekly Lens, desired week, content types and notes. Default type is Program. Generate a working title if omitted. For a Lens, require an approved parent and show inherited Bible version before start.

Mock file handling: PDF/DOCX/MD/TXT, max 20 MB per file and 5 files (configurable UI defaults). Show name, size, remove and demo processing state. No actual remote upload or document extraction. Unsupported/oversized files receive inline errors. URLs allow HTTP(S) only and are not fetched. Pasted text renders as plain text. Show “Reference processing is simulated” in the demo notice; local reference metadata persists, raw file bytes do not. After reload, offer re-selection for local previews.

On start: create a draft work item if needed, snapshot input references, create a mock run, navigate to Concepts, show stage-level progress and then reveal a seeded set of three distinct concepts. No fabricated precise ETA. “Random” discovery is seeded variation in mock mode; Reset Demo reproduces the same sequence. Advancing the seed yields a different predefined batch. User choices remain stable across reloads.

## 4. Concept generation and review

The machine's guardrails are displayed as supplied results, never evaluated by AI or reconstructed in the frontend. Show a compact explanation of DROP fit; detailed guardrail results belong in the inspector. Every selection needs DROP FIT; only lens-aligned selections need LENS RELEVANCE. Food and drink remain equal expressions of Taste. Iranian/Persian and international research coverage remain visible in the later research stage.

Each concept card includes title FA, optional title EN, short thesis, narrative angle, why it belongs at DROP, suggested content directions, optional reference preview, version, status, comment count and controls. Images are optional; use neutral abstract placeholders with accessible labels where unavailable. Do not reuse the receipt menu layout for the control panel.

Actions:

| Action | Requirement | State/result |
| --- | --- | --- |
| Comment | Non-empty text | Append a version-linked comment, no approval change |
| Approve | Current reviewable version and eligible actor | Approve exactly this version; card becomes eligible for research |
| Request changes | Reason plus actionable feedback | Mark revision requested and queue regeneration for this card only |
| Reject | Reason required; optional extra comment | Mark rejected and exclude from advancement; offer explicit “Revise this idea” or “Generate a replacement” |
| Revise rejected idea | Existing reason is shown/editable | Same concept ID, new version after simulated generation |
| Generate replacement | Optional direction plus original rejection context | New concept ID with `replacesConceptId`; original stays visible in history |

Rejected does not silently mean deleted, and it does not auto-start an unreviewable infinite loop. The UI makes rejection-and-regeneration available in one explicit confirmation flow. The user can repeat targeted revisions without a fixed one-round limit. Every revision returns to review; it never inherits approval.

Several approved concepts can proceed together. CTA: «ادامه با کانسپت‌های تأییدشده (N)». This explicit batch transition gives the user control over which approved cards proceed and avoids starting expensive research during comparison. It requires at least one approved card. Pending or rejected proposals do not block selected approved cards. Unselected candidates remain in history and can be advanced later into a new package scope.

## 5. Research and content generation

Each selected concept is frozen at its approved version. Show research progress, frozen coverage plan, Persian/Iranian and international source counts, gaps, retrieval requests and individual content-generation states. Machine-stage identities remain external IDs from the workflow definition. Product stages must not renumber Machines 01–05 or claim a newly inferred mapping.

Research then returns content cards grouped by concept with category filters. Suggested demo output types: editorial narrative, film recommendation, music selection, book reference, art/design reference, social copy, landing-page copy and production brief. Require only the types selected in the frozen output plan; not all eight for every concept. Planning defaults should show a manageable four items per branch; support other types through filters.

A content card includes type, title, excerpt, source count, rationale/relevance, concept/version link, version, status and review actions. Detail sheet offers full body, sources, checks, comments and history. User approval/rejection/revision is per content item. Regenerating one film recommendation must not replace music, article or other approved content. The user may route a revision to content rewrite or research refresh; refresh preserves earlier source evidence and records a new attempt.

Critical missing evidence blocks approval of affected required content. Noncritical gaps stay visible for review according to supplied policy. An unavailable source produces a gap/retrieval request, never a fake verified citation. A blocked branch does not erase or freeze unrelated reviewable branches.

Persian editorial review remains visible as a content gate. Comments alone never satisfy it. The UI uses policy DTOs for eligible reviewers and thresholds; do not invent production role counts or grant new authority. Mock actors and roles are demonstration identities, with actor and active role recorded on each decision.

## 6. Final package

Readiness is computed from included concept branches and their latest active required content versions: all must be approved, required editorial gates passed, no blocking issue, no stale dependency. Optional outputs can be omitted; required items can only be removed through an explicit plan amendment with a reason and history. Candidate concepts not selected for research do not count against package readiness.

Once ready, the deterministic mock stage automatically assembles a package and navigates/links to Outputs. This is packaging of already reviewed content, not a new “Machine 6” or another compulsory final approval gate. Assembly failure is retryable without regenerating content. Download requires an explicit click.

Package includes README, concept summaries/Bible reference, research index and coverage gaps, approved per-item Markdown/text, social/landing payload JSON, production briefs when selected, and manifest with exact item/version IDs. ZIP download must contain real sample files that match the manifest; no dead download buttons or empty fake archives. Images/print-ready PDFs are not promised unless actual valid assets are supplied; export production specifications where applicable.

Concept changes after downstream work begins are explicit: show impacted content before creating a new concept version. Keep historical approvals intact but mark dependent latest outputs stale. A stale package stays downloadable as a labeled historical snapshot and cannot be treated as the current ready package. Re-review affected outputs, create a new package version and explicitly update its calendar link. Unrelated branches are unchanged.

## 7. Plan and calendar

On package completion, create one calendar entry keyed by package family/work item (idempotent). If a target week/date exists, place it there as **planned**. If no date exists, add it to the calendar's **unscheduled tray** with «تعیین تاریخ»; never invent an approved publishing date. Selecting a date immediately places the item in the calendar. This is a small scheduling choice, not a new approval gate.

Calendar supports month, week and agenda, an unscheduled tray, filters and an event-detail sheet. Fields: title, Program/Lens, concept/package link, date or date range, owner, channel/deliverable, milestone, status and note. Default timezone Asia/Tehran, week starts Saturday; show Persian/Jalali dates with a tested date library. Persist all-day dates as ISO calendar dates, timed events as UTC instants plus timezone. Never store formatted Persian dates as canonical values.

Dragging reschedules with undo; also provide a keyboard-accessible date edit. Warn about overlap but allow multiple plans in one day. Export ICS optionally; no Google Calendar integration or actual publishing. A calendar item shows “planned / آماده برنامه‌ریزی or برنامه‌ریزی‌شده”, never “published” because a date was chosen. Detailed staffing, budgets, suppliers and physical logistics remain outside this panel.

## 8. State and history invariants

- Run/stage lifecycle and card review status are separate. Reuse existing repo run enums through a projection adapter; do not replace its ADR state machine with this UI vocabulary.
- Card review statuses: draft, in_review, revision_requested, approved, rejected; freshness is a separate current/stale field. Generation jobs use queued/running/succeeded/failed/blocked.
- Version content is immutable. Approval/comment events are appended against exact version IDs. A new version becomes active only when generation completes; show pending revision on the old active version meanwhile.
- Successful commands update every view of the same entity: card, inbox, counts, graph, package readiness and activity.
- Double clicks and retried commands do not duplicate runs, approvals, packages or calendar entries. Expected revisions prevent stale submissions.
- In mock mode, all writes remain local demo state. Live machine integrations later enforce permission, policy and transitions server-side.
