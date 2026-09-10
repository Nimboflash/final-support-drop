# Claude implementation prompt

You are updating the existing DROP Studio OS support-panel frontend. Read this delivery's 00–04 documents, mock files and preserved doc 18, then inspect the current repository, CLAUDE.md, applicable AGENTS.md, accepted ADRs and completed P-tickets.

Implement the full frontend journey in this pack. The latest user requirement is FRONTEND ONLY on realistic, deterministic, interactive mocks. The backend and Machines 01–05 are built separately and will be connected later. Do not add machine logic, prompts, AI calls, workers, databases, queues, authentication servers, live research or publishing. Keep existing machine placeholders inert. Do not reset the repo or rebuild completed compatible foundation work.

The product journey is: start with input=null or a reference; generate concept cards; approve/reject/comment and selectively regenerate; continue with selected approved concepts into research/content; review and regenerate each content independently; automatically assemble a versioned package when required outputs pass review; create a calendar item using the target date or the unscheduled tray.

Use shadcn/ui (https://ui.shadcn.com/) and React Flow AI Workflow Editor (https://reactflow.dev/ui/templates/ai-workflow-editor) as the required UI foundations/reference. Use @xyflow/react with our own components unless Pro source is licensed. Do not import the template's AI execution layer. Keep the existing compatible Next.js, TypeScript, Tailwind, TanStack Query, Zod and Zustand stack. Persian-first RTL, bundled Vazirmatn, approved DROP colors.

Prioritize the navigation and review experience: five primary sidebar destinations, seven stable project tabs, readable cards, one reusable review sheet, source visibility, package downloads, practical calendar and a graph backed by the same domain data. Template editing is deferred; execution and definition inspection are required.

Preserve MachineGateway verbatim. Add panel and revision adapters for the missing capabilities, with a single approval write path. Components never import seed fixtures directly. All mock adapters share one canonical versioned repository, persist demo state locally, emit events and update every relevant view. Distinguish retries from revisions, preserve versions and rejection reasons, prevent duplicate commands and invalidate dependent outputs when an upstream concept changes.

Import this pack into docs/frontend-v2 (or the established documentation location) and record its explicit changes through the repository's next available ADR. Do not manufacture a ratification of an older proposed ADR. Reconcile only genuine remaining conflicts; the user has already authorized the frontend scope and mocks. Use the P-series mapping in doc 04, completing remaining tickets sequentially and observing existing review/check gates. Continue through the full authorized frontend deliverable; do not stop after planning or P1.

Use the supplied seed and scenario recipes as a base and preserve all fourteen original doc 18 scenarios and entities. Implement the additional acceptance journeys. The sample TypeScript contracts are additive starting points: reconcile them with existing types, write schema validation and implement adapters. The package is a specification and fixture bundle, not runnable application code.

Finish with working end-to-end mock interactions, a real sample ZIP export, reload-safe demo state, responsive/RTL/accessibility verification, no provider calls and a concise handoff covering what was built, evidence of checks, known limitations and future adapter connection points. Do not deploy, publish or begin machine implementation as part of this task.
