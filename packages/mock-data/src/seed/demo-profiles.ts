import {
  ACTOR_ROLES,
  CAPABILITIES,
  DEMO_CAPABILITY_PROFILES,
  UNMAPPED_DEMO_CAPABILITIES,
  decodeDemoRole,
  type ActorRole,
} from "@drop/panel-domain";

/**
 * The demo-profile assignment table (AC-P3.2; ADR-0019 D6).
 *
 * V2 03 §5 calls these "demonstration identities, not a new canonical role
 * taxonomy", and warns against resolving the recorded eight-roles-versus-seven
 * conflict by picking a production count. So this table ASSIGNS each demo actor
 * to one existing `ACTOR_ROLES` member and adds nothing to the closed set.
 *
 * The capability side is deliberately asymmetric. P2's codec maps
 * `fa.editorial → FA_EDITORIAL` and leaves the other five `null`, because the
 * closed 11 §4 capability list has no counterpart for them — they describe
 * panel affordances, not governed capabilities the machine build enforces.
 * P3 does not "finish" that mapping: it records what each one grants IN THE DEMO
 * WORLD, which is a different claim, and reports the unresolved rows to P8.
 */

export interface DemoActorProfile {
  readonly id: string;
  readonly nameFa: string;
  /** The closed-set role this demo actor acts as. */
  readonly actedAsRole: ActorRole;
  readonly wireCapabilities: readonly string[];
  /** What the demo world lets this actor do. NOT a capability grant. */
  readonly demoEligibility: {
    readonly reviewConcepts: boolean;
    readonly reviewContent: boolean;
    readonly editorialGate: boolean;
    readonly comment: boolean;
    readonly editCalendar: boolean;
    /** V2 acceptance A16 — a read-only actor's commands are rejected. */
    readonly readOnly: boolean;
  };
}

const ELIGIBILITY_BY_WIRE_CAPABILITY = {
  "concept.review": "reviewConcepts",
  "content.review": "reviewContent",
  "fa.editorial": "editorialGate",
  "comment.create": "comment",
  "calendar.edit": "editCalendar",
  read: null,
} as const;

export const DEMO_ACTOR_ROLE_ASSIGNMENT: Readonly<Record<string, ActorRole>> = {
  // The Guardian reviews concepts — 11 §3's DROP_GUARDIAN is the recorded role
  // whose remit that is.
  "actor-guardian": "DROP_GUARDIAN",
  "actor-editor": "REVIEWER_EDITOR",
  "actor-planner": "PROJECT_LEAD",
  "actor-viewer": "VIEWER",
};

export function roleForDemoActor(actorId: string): ActorRole {
  const assigned = DEMO_ACTOR_ROLE_ASSIGNMENT[actorId];
  if (assigned !== undefined) return assigned;
  throw new Error(`UNASSIGNED_DEMO_ACTOR: ${actorId} has no closed-set role`);
}

/**
 * Resolves the `activeRole` string the seed's decisions carry.
 *
 * AC-P3.2 requires an unknown string to be REJECTED rather than passed through
 * as `actedAsRole`: an unrecognized role that reaches a command would be an
 * invented member of a closed set, arriving by accident.
 */
export function roleForDemoRoleString(wireRole: string): ActorRole {
  const decoded = decodeDemoRole(wireRole);
  if (decoded === null) {
    throw new Error(
      `UNKNOWN_DEMO_ROLE: "${wireRole}" has no closed ACTOR_ROLES counterpart; ` +
        "add it to DEMO_ROLE_PROFILES rather than widening the recorded set",
    );
  }
  return decoded;
}

export function buildDemoProfile(wire: {
  id: string;
  nameFa: string;
  capabilities: readonly string[];
}): DemoActorProfile {
  const eligibility = {
    reviewConcepts: false,
    reviewContent: false,
    editorialGate: false,
    comment: false,
    editCalendar: false,
    readOnly: wire.capabilities.every((c) => c === "read"),
  };
  for (const capability of wire.capabilities) {
    const key = ELIGIBILITY_BY_WIRE_CAPABILITY[capability as keyof typeof ELIGIBILITY_BY_WIRE_CAPABILITY];
    if (key !== null && key !== undefined) eligibility[key] = true;
  }
  return {
    id: wire.id,
    nameFa: wire.nameFa,
    actedAsRole: roleForDemoActor(wire.id),
    wireCapabilities: wire.capabilities,
    demoEligibility: eligibility,
  };
}

/**
 * The P8 report (AC-P3.2). Both halves matter: what was assigned, and what was
 * deliberately left unresolved for the machine team.
 */
export const DEMO_PROFILE_REPORT = {
  closedRoleCount: ACTOR_ROLES.length,
  closedCapabilityCount: CAPABILITIES.length,
  assignedRoles: DEMO_ACTOR_ROLE_ASSIGNMENT,
  mappedCapabilities: Object.entries(DEMO_CAPABILITY_PROFILES)
    .filter(([, mapped]) => mapped !== null)
    .map(([wire, mapped]) => ({ wire, capability: mapped })),
  unresolvedCapabilities: UNMAPPED_DEMO_CAPABILITIES,
} as const;
