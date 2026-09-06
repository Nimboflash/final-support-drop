/** Additive FRONTEND mock contract proposal. Preserve existing MachineGateway. */
export type ReviewStatus = "draft" | "in_review" | "revision_requested" | "approved" | "rejected";
export type OutputType = "editorial" | "film" | "music" | "book" | "art_design" | "social" | "landing" | "production_brief";
export type RefInput = { kind: "file"; name: string; size: number; mime: string } | { kind: "url"; url: string } | { kind: "text"; text: string };
export type StartInput = null | { references: RefInput[] };
export type Target = { kind: "concept" | "content"; id: string; versionId: string };
export interface CommandMeta { commandId: string; workspaceId: string; actorId: string; activeRole: string; expectedRevision: number }
export interface Receipt { commandId: string; correlationId: string; status: "accepted" | "succeeded" | "rejected"; error?: { code: "CONFLICT" | "FORBIDDEN" | "INVALID_INPUT" | "BLOCKED" | "UNAVAILABLE"; message: string } }
export interface Project { id: string; revision: number; workspaceId: string; titleFa: string; type: "program" | "weekly_lens"; parentProgramId: string | null; parentBibleVersionId: string | null; input: StartInput; stage: "draft" | "concepts" | "research_content" | "package" | "calendar"; targetDate: string | null; ownerId: string; selectedConceptVersionIds: string[]; outputPlan: { revision: number; includedConceptIds: string[]; requiredContentIds: string[]; optionalContentIds: string[] }; }
export interface ConceptVersion { id: string; conceptId: string; number: number; titleFa: string; titleEn?: string; thesisFa: string; dropRationaleFa: string; directions: OutputType[]; feedbackAppliedFa: string | null; createdAt: string }
export interface Concept { id: string; projectId: string; activeVersionId: string; reviewStatus: ReviewStatus; freshness: "current" | "stale"; pendingRevisionId: string | null; replacesConceptId: string | null }
export interface ContentVersion { id: string; contentId: string; conceptVersionId: string; number: number; titleFa: string; bodyFa: string; sourceIds: string[]; createdAt: string }
export interface ContentItem { id: string; projectId: string; conceptId: string; type: OutputType; activeVersionId: string; reviewStatus: ReviewStatus; freshness: "current" | "stale"; editorialStatus: "pending" | "passed" | "not_required"; blockedReasonFa: string | null; pendingRevisionId: string | null }
export interface Source { id: string; titleFa: string; url: string; language: string; region: "iran" | "international"; status: "available_demo" | "blocked"; isMock: true }
export interface Comment { id: string; target: Target; actorId: string; bodyFa: string; createdAt: string }
export interface Decision { id: string; target: Target; actorId: string; activeRole: string; outcome: "approved" | "rejected" | "revision_requested"; reasonFa: string | null; createdAt: string }
export interface PackageSnapshot { id: string; familyId: string; projectId: string; version: number; status: "current" | "historical" | "stale"; conceptVersionIds: string[]; contentVersionIds: string[]; files: { path: string; contentVersionId: string | null; body: string }[]; createdAt: string; isMock: true }
export interface CalendarEntry { id: string; projectId: string; packageFamilyId: string; packageVersionId: string; titleFa: string; date: string | null; endDate: string | null; timezone: "Asia/Tehran"; status: "unscheduled" | "planned"; ownerId: string; noteFa: string }
export interface PanelSnapshot { schemaVersion: "drop.panel.mock.v2"; revision: number; clock: string; projects: Project[]; concepts: Concept[]; conceptVersions: ConceptVersion[]; content: ContentItem[]; contentVersions: ContentVersion[]; sources: Source[]; comments: Comment[]; decisions: Decision[]; packages: PackageSnapshot[]; calendar: CalendarEntry[] }
export interface PanelEvent { eventId: string; schemaVersion: string; workspaceId: string; aggregateId: string; aggregateRevision: number; correlationId: string; occurredAt: string; type: string; data: unknown }
export interface PanelGateway {
  getSnapshot(): Promise<PanelSnapshot>;
  createProject(command: CommandMeta & { project: Omit<Project, "id" | "revision" | "workspaceId"> }): Promise<Receipt>;
  addComment(command: CommandMeta & { target: Target; bodyFa: string }): Promise<Receipt>;
  selectConcepts(command: CommandMeta & { projectId: string; conceptVersionIds: string[] }): Promise<Receipt>;
  amendOutputPlan(command: CommandMeta & { projectId: string; requiredContentIds: string[]; optionalContentIds: string[]; reasonFa: string }): Promise<Receipt>;
  updateCalendar(command: CommandMeta & { entry: CalendarEntry }): Promise<Receipt>;
  updateCalendarPackage(command: CommandMeta & { entryId: string; packageVersionId: string }): Promise<Receipt>;
  exportPackage(packageVersionId: string): Promise<Blob>;
  subscribe(listener: (event: PanelEvent) => void): () => void;
}
export interface RevisionGateway {
  requestRevision(command: CommandMeta & { target: Target; feedbackFa: string; route: "concept_revision" | "concept_replacement" | "content_rewrite" | "research_refresh" }): Promise<Receipt>;
}
/** Facade only: implementation MUST delegate to existing MachineGateway.submitApproval. */
export interface ReviewApplicationService {
  reviewItem(command: CommandMeta & { target: Target; outcome: Decision["outcome"]; reasonFa: string | null }): Promise<Receipt>;
}
