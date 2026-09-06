# Screens, tabs and design specification

## 1. Design foundations

Required: [shadcn/ui](https://ui.shadcn.com/) and [React Flow AI Workflow Editor](https://reactflow.dev/ui/templates/ai-workflow-editor) as specified by the user. Use open-source `@xyflow/react` and DROP-owned nodes unless the Pro template source is licensed. The template contains AI capabilities; reuse its UI patterns only, not its provider runtime. Source checked 2026-09-06.

[shadcn RTL documentation](https://ui.shadcn.com/docs/rtl) supports a Persian-first implementation; check existing components and portal direction. Use the repository's compatible locked versions rather than upgrading the stack as a prerequisite.

| Token | Value | Use |
| --- | --- | --- |
| Charcoal | #121212 | Main dark workspace |
| Paper White | #F5F5F5 | Primary text, light preview sheets |
| Aluminum | #B3B6B9 | Secondary text and neutral accents |
| Logo Charcoal | #1E1E1E | Raised neutral surfaces and logo on light areas |

Use a restrained dark editorial UI, clear spacing, quiet borders, compact readable cards, and bundled Vazirmatn. Status uses icon plus label; color alone is never sufficient. Semantic warning/error colors may be separate accessible utility tokens, not competing brand accents. No warm sepia palette. Base text 14–16 px, comfortable Persian line height; headings 20–28 px. Card padding 20–24 px, consistent modest radius. Avoid large decorative KPI charts, oversized welcome blocks and financial-dashboard filler.

RTL at document root (`lang=fa-IR`, `dir=rtl`); isolate English IDs/URLs with `bdi` or `dir=ltr`. Use logical CSS properties. Set direction explicitly in sheets/popovers/dialog portals. Test arrow keys, tab navigation and text selection. The graph's mathematical coordinates remain unmirrored; node labels use RTL.

## 2. Primary navigation

One persistent sidebar; five main destinations. Settings are secondary. Badge counts come from the same gateway data as work-item tabs.

| Route | Persian | Purpose |
| --- | --- | --- |
| /studio | نمای کلی | Next actions and active work |
| /studio/projects | پروژه‌ها | Programs and Weekly Lenses, with type filter |
| /studio/reviews | بررسی‌ها | Cross-project concept/content review queue |
| /studio/outputs | خروجی‌ها | Approved content and package archive |
| /studio/calendar | تقویم و برنامه | Scheduled and unscheduled packages |
| /studio/settings | تنظیمات | Demo persona, scenarios, preferences; integration status read-only |

Global header: breadcrumbs, search, notifications, current demo actor and a discreet persistent «حالت نمایشی» badge. Settings should not expose API keys or pretend to connect live providers. Technical machine details remain in workflow inspectors. Requests, coverage and audit live within project context; notifications can link directly to them.

Programs and Lenses share Projects with filters and parent breadcrumbs instead of duplicating the navigation. Existing routes can redirect/deep-link to this layout. Workflow is a prominent project tab, not an independent disconnected dashboard.

## 3. Overview

Top: page title and Start New Journey CTA. Four compact counters: active projects, pending reviews, blocked items, packages ready/unscheduled. Main column: “Needs your attention” ordered by blocked required work, review and missing schedule. Each row has one next action and context. Below: active project cards with stage strip and next action. Secondary column: next two weeks of planned items plus concise activity. Empty state explains both entry modes and provides the CTA. Avoid empty charts.

## 4. Project list

Grid/list toggle, search, type/stage/owner filters, sort by recent activity. Cards show title, Program/Lens badge, parent if relevant, stage, review count, last update, owner and planned date. Clicking opens the last active project tab, with URL state preserved. Do not put every action on list cards.

## 5. Project detail tabs

Sticky header: title, type, owner, stage badge and the single appropriate next-step CTA. Under it a compact five-stage indicator: Concepts, Research/Content, Review, Package, Calendar. One stable tab row:

| Tab/URL suffix | Persian label | Main content |
| --- | --- | --- |
| overview | خلاصه | Original input, scope, selected concepts, current blocker/next step, milestones |
| concepts | کانسپت‌ها | Candidate grid, status filters, selected approved concepts and advancement CTA |
| content | محتوا و تحقیق | Concept switcher, category/status filters, research summary, content cards |
| outputs | خروجی نهایی | Required-item checklist, readiness, package preview, manifest and downloads |
| plan | برنامه | Project-scoped schedule, milestones, unscheduled state, link to main calendar |
| workflow | گردش کار | React Flow operational graph and node inspector |
| activity | تاریخچه | Comments, decisions, attempts, plan changes, package and scheduling history |

Keep all tabs visible for orientation. A not-yet-available stage shows its prerequisites with a link to act; do not hide navigation or show an unexplained disabled tab. Remember filters in URL query parameters. On narrow screens, use a horizontal scrollable tab row with visible active tab; avoid nested tab hierarchies. In Content, use a concept selector and filter chips rather than another full-width tab row.

## 6. Card layout and review sheet

Concept cards: title/status → thesis → DROP rationale → small output-type tags → version/comment count → Approve + Request changes; Reject in visible secondary menu. Three columns at wide desktop, two at medium, one at mobile. Readability sets the minimum width (about 300 px). Long text truncates only in cards; detail sheet has full content.

Content cards: type/status → title → excerpt/preview → source count + linked concept → version/actions. Optional artwork uses consistent ratio and a neutral fallback. Do not generate unrelated imagery merely to fill space.

Clicking card title opens a resizable desktop side sheet (about 560–720 px), full-screen mobile drawer. Sheet tabs: Preview, Sources/checks, Comments, Versions. Footer contains current review actions with target version visible. Comparing versions shows before/after prose and revision reason; a simple two-pane comparison is sufficient. Switching versions makes historical views read-only.

Request changes dialog: target title/version, required reason, optional structured note, scope (“this item”), regeneration route if content, and confirmation. Reject dialog offers “Reject only”, “Reject and revise”, “Reject and replace” where applicable. Buttons show pending state; failures retain draft feedback. Focus returns to triggering card after closing.

Global Reviews uses tabs Concepts / Content and filters. It opens the same review sheet and uses the same command path; never duplicate approval logic. Show current actor eligibility and already-recorded decision. Bulk approvals are deferred; bulk “continue with approved concepts” is supported.

## 7. Content and research view

Top strip: active concept, approved version and research summary. Expand “Research coverage” to view the frozen target vs available count by Iranian/Persian and international buckets. A source row shows title, language/region, access state, citation/reference, rationale and provenance. All demo evidence is labeled fictional/sample.

Blocked items explain the missing dependency and offer mocked retry or retrieval request. Do not mark a blocked source verified when retry is clicked. Availability changes only with the selected scenario response. Partial generation shows completed cards while others run.

## 8. Outputs and calendar

Outputs uses two views: Contents (group by concept/category) and Package versions. Show readiness as “3 of 4 required items approved” with links to unresolved cards, not an invented global percentage. Package detail shows current/historical/stale badge, manifest, included versions, generated time and Download ZIP.

Calendar uses a wide primary canvas and an unscheduled side tray, collapsed into a drawer on mobile. Month cells show two or three compact entries with “+N”; agenda provides complete keyboard access. Event sheet links to exact package version and lets the user change date, owner, notes or milestone. Project Plan is a scoped view of these same records.

## 9. Workflow graph

Execution inspection is the default. A secondary definition-inspection mode shows the supplied template. Template authoring is deferred; no arbitrary node editing or executing custom code. Pan/zoom, fit, minimap, branch collapse and selection are supported. Node drag may adjust local layout only, never machine state or dependencies.

Nodes: Input (blank/reference), Concept generation, Concept review, per-approved-concept Research, per-item Content generation, per-item Content review, Package and Calendar. Include external Machine 01–05 identity in inspector through a supplied mapping; never equate the five product stages with five machines by position. Specialized output agents can be collapsed subordinate nodes without implementing them.

Use top-to-bottom layout, groups per concept, branch detail on demand and loop edges labeled “revision” from each review gate back to its own generation step. Rejected/discarded branches end visibly. Package join waits only on selected required content. Calendar edge means plan entry creation, not publication.

Nodes display name, status label/icon, owner when relevant, attempts and output counts. Inspector: input, output, checks, comments, versions, history and safe error. Graph card review shortcuts call the same approval service as the inbox. Provide an accessible equivalent stage list; graph cannot be the only way to act. Visual state is derived from domain DTOs, never stored as an independent truth in React Flow nodes.

## 10. State coverage and responsive QA

Every destination supports loading skeleton, useful empty state, error with retry, offline/stale data, permission-denied action and success feedback. Keep stale content visible with last-sync timestamp; do not erase it on disconnect. Disable mutations with an explanation where a scenario disallows them.

Validate 1440, 1024, 768 and 390 px layouts; desktop is the primary workflow but mobile review must work. No document overflow except intentional graph/table scroll areas. Keyboard reachable controls, clear focus, labels on icons, text alternatives, accessible dialogs and contrast meeting WCAG 2.2 AA. Test Jalali month boundaries and timezone edges. Reduced motion disables decorative transitions.
