import type {
  CommandEnvelope,
  CommandReceipt,
  OutputPlan,
  PackageExport,
  PanelCalendarEntry,
  PanelEvent,
  PanelProject,
  PanelSnapshot,
  Target,
} from "@drop/panel-domain";

/**
 * `PanelCommandGateway` — the panel's write surface (ADR-0019 D3).
 *
 * WHY THIS IS A SEPARATE INTERFACE. `docs/frontend-v2/mock/panel-contracts.ts`
 * proposes hanging six mutations plus `exportPackage` and `subscribe` off
 * `PanelGateway`. But ADR-0018 D1 is an owner condition that `PanelGateway` is
 * **read-only**, and its docblock says adding a write method "would open the
 * second write path ADR-0013 exists to remove". The owner ruled (ADR-0019 D3)
 * that the V2 capabilities land here instead: `PanelGateway` keeps its seven
 * read members untouched, `MachineGateway` gains nothing, and the panel still
 * gets everything the journey needs.
 *
 * WHAT IS DELIBERATELY ABSENT: any method that records a review decision. Those
 * travel through `ReviewApplicationService.reviewItem` →
 * `MachineGateway.submitApproval`, which is the single approval write path of
 * ADR-0013 D1. A `decide()` here would be exactly the second path that decision
 * forbids, and the conformance suite proves it does not exist by replacing
 * `submitApproval` with a rejecting stub and asserting no decision is recorded.
 *
 * PROVISIONAL (18 §9): a panel-side contract, reported in the P8 handoff as an
 * open coordination point. It is never silently imposed on the machine build.
 */
export interface PanelCommandGateway {
  /** The whole demo world, validated. Read here rather than on PanelGateway
   *  because the snapshot includes state this gateway's commands mutate. */
  getSnapshot(): Promise<PanelSnapshot>;

  createProject(
    command: CommandEnvelope & {
      project: Omit<PanelProject, "id" | "rowVersion" | "workspaceId">;
    },
  ): Promise<CommandReceipt>;

  /** V2 01 §4 — "Append a version-linked comment, no approval change". */
  addComment(command: CommandEnvelope & { target: Target; bodyFa: string }): Promise<CommandReceipt>;

  /** V2 01 §4 — the explicit batch transition «ادامه با کانسپت‌های تأییدشده (N)». */
  selectConcepts(
    command: CommandEnvelope & { projectId: string; conceptVersionIds: readonly string[] },
  ): Promise<CommandReceipt>;

  /** V2 01 §6 — a required item leaves the plan only through an explicit
   *  amendment carrying a reason, which is why `reasonFa` is not optional. */
  amendOutputPlan(
    command: CommandEnvelope & {
      projectId: string;
      requiredContentIds: readonly string[];
      optionalContentIds: readonly string[];
      reasonFa: string;
    },
  ): Promise<CommandReceipt>;

  updateCalendar(command: CommandEnvelope & { entry: PanelCalendarEntry }): Promise<CommandReceipt>;

  /** V2 01 §6 — relinking a family to a new package version is an explicit
   *  action, never a duplicate entry (ADR-0019 D7). */
  updateCalendarPackage(
    command: CommandEnvelope & { entryId: string; packageVersionId: string },
  ): Promise<CommandReceipt>;

  /**
   * ADR-0019 D17 — returns bytes, not a `Blob`. `tsconfig.base.json` pins
   * `"lib": ["ES2023"]` because these packages are transport-free; `apps/web`
   * constructs the Blob at the edge.
   */
  exportPackage(packageVersionId: string): Promise<PackageExport>;

  /**
   * Mock subscriptions now; the polling-versus-SSE choice is deferred to the
   * machine team's contract (18 §9). The returned function must actually stop
   * delivery — the conformance suite asserts it.
   */
  subscribe(listener: (event: PanelEvent) => void): () => void;
}
