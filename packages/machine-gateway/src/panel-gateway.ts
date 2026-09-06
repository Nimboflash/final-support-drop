import type {
  ApprovalRequestSummary,
  NotificationSummary,
  PanelListFilters,
  Program,
  ProgramSummary,
  RetrievalRequestSummary,
  WeeklyLens,
  WeeklyLensSummary,
} from "@drop/panel-domain";

/**
 * PanelGateway — the companion read-only contract (ADR-0018 D1).
 *
 * The (18 §7.1) entity set exceeds MachineGateway's method set, and (18 §6)
 * requires *all* UI data to flow through application-level interfaces. This
 * interface covers exactly the five entity groups the owner named: **Programs,
 * Weekly Lenses, approval lists, requests, and notifications**. MachineGateway
 * gains no members.
 *
 * Read-only by construction: there is no mutating method here. Commands —
 * including approval decisions — travel through `MachineGateway.submitApproval`,
 * preserving ADR-0013's single approval write path. Adding a write method to
 * this interface would open the second write path ADR-0013 exists to remove.
 *
 * PROVISIONAL (18 §9). This is a panel-side contract, reported in the P8
 * handoff as an open coordination point. It must never be silently imposed on
 * the machine build.
 *
 * Not carried here (ADR-0018 D1, verbatim): users/roles remain a session
 * concern; research sources and coverage gaps keep their P3 fixtures, and their
 * transport contract is an open P8 coordination decision — not a silent
 * extension of either gateway.
 */
export interface PanelGateway {
  listPrograms(filters?: PanelListFilters): Promise<ProgramSummary[]>;
  getProgram(id: string): Promise<Program>;
  listWeeklyLenses(filters?: PanelListFilters): Promise<WeeklyLensSummary[]>;
  getWeeklyLens(id: string): Promise<WeeklyLens>;
  listApprovalRequests(filters?: PanelListFilters): Promise<ApprovalRequestSummary[]>;
  listRetrievalRequests(filters?: PanelListFilters): Promise<RetrievalRequestSummary[]>;
  listNotifications(filters?: PanelListFilters): Promise<NotificationSummary[]>;
}
