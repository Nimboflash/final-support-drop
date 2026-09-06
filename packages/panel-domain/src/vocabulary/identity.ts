/**
 * Identity vocabulary — 11 §2 (actor types), 11 §3 (canonical administrative
 * roles) and 11 §4 (initial capabilities, plus the two additions recorded by
 * ADR-0012 D5 and ADR-0013 D6).
 */

/** 11 §2 — the unified actor model (06 §2.1 `core.actors.actor_type`). */
export const ACTOR_TYPES = ["HUMAN", "MACHINE", "SERVICE"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

/** 11 §3 — canonical administrative roles. */
export const ACTOR_ROLES = [
  "WORKSPACE_OWNER",
  "DROP_GUARDIAN",
  "PROJECT_LEAD",
  "REVIEWER_EDITOR",
  "CONTRIBUTOR",
  "VIEWER",
  "TECHNICAL_MAINTAINER",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

/** 11 §3 — roles are scoped to workspace, module or project. */
export const ROLE_SCOPES = ["WORKSPACE", "MODULE", "PROJECT"] as const;
export type RoleScope = (typeof ROLE_SCOPES)[number];

/**
 * 11 §4 initial capabilities, extended by two recorded additions:
 * `RUN_STAGE_SKIP` (ADR-0012 D5, "added to the 11 §4 initial capability list")
 * and `RAW_RESPONSE_READ` (ADR-0013 D6).
 */
export const CAPABILITIES = [
  "FA_EDITORIAL",
  "CULTURAL_REVIEW",
  "HISTORICAL_REVIEW",
  "RIGHTS_REVIEW",
  "SOURCE_REGISTRY_REVIEW",
  "WORKFLOW_TEMPLATE_EDIT",
  "WORKFLOW_TEMPLATE_PUBLISH",
  "PROMPT_CONFIGURE",
  "MODEL_CONFIGURE",
  "EXTERNAL_ARTIFACT_SUBMIT",
  "OPERATOR_GUIDE_ACCESS",
  "RUN_STAGE_SKIP",
  "RAW_RESPONSE_READ",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** 06 §2.1 — `core.memberships.status`. */
export const MEMBERSHIP_STATUSES = ["INVITED", "ACTIVE", "DISABLED"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
