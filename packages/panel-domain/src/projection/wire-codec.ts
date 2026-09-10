import { ACTOR_ROLES, CAPABILITIES, type ActorRole, type Capability } from "../vocabulary/identity";
import { COVERAGE_CLASSES, type CoverageClass } from "../vocabulary/research";
import {
  OUTPUT_TYPES,
  PACKAGE_STATUSES,
  PRODUCT_STAGES,
  REVIEW_STATUSES,
  REVISION_ROUTES,
} from "../vocabulary/product";

/**
 * The wire codec (ADR-0019 D6) — the ONE boundary where the V2 mock JSON's
 * lowercase snake_case becomes the repo's stored UPPER_SNAKE codes.
 *
 * This is a systemic decision, not twelve local ones. `stableCodeSchema` pins
 * `^[A-Z][A-Z0-9_]*$` and ADR-0015 D5 records that "stored values are never
 * renamed for presentation", so every lowercase literal in
 * `docs/frontend-v2/mock/` is a WIRE form. Normalizing here means no schema has
 * to accept both spellings and no component has to know either.
 *
 * The codec never invents a code. An unmapped wire value returns `null`, and the
 * caller decides whether that is a fixture bug or an open coordination item.
 */

/** `snake_case` → `SNAKE_CASE`, the mechanical half of the translation. */
export function toStoredCode(wire: string): string {
  return wire.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/** `SNAKE_CASE` → `snake_case`, for writing fixtures back out. */
export function toWireCode(stored: string): string {
  return stored.toLowerCase();
}

function decodeInto<T extends string>(
  allowed: readonly T[],
  wire: string | null | undefined,
): T | null {
  if (wire === null || wire === undefined) return null;
  const candidate = toStoredCode(wire);
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : null;
}

export const decodeReviewStatus = (wire: string) => decodeInto(REVIEW_STATUSES, wire);
export const decodeOutputType = (wire: string) => decodeInto(OUTPUT_TYPES, wire);
export const decodeProductStage = (wire: string) => decodeInto(PRODUCT_STAGES, wire);
export const decodePackageStatus = (wire: string) => decodeInto(PACKAGE_STATUSES, wire);
export const decodeRevisionRoute = (wire: string) => decodeInto(REVISION_ROUTES, wire);

/**
 * V2's `Source.region` is `iran | international`; the recorded coverage classes
 * are `IRANIAN_PERSIAN | INTERNATIONAL` (00 §4). Mechanical upper-casing does
 * not bridge `iran`, so the one irregular pair is spelled out.
 */
export function decodeCoverageClass(wire: string): CoverageClass | null {
  if (wire === "iran") return "IRANIAN_PERSIAN";
  return decodeInto(COVERAGE_CLASSES, wire);
}

/**
 * V2's `Source.status` is a single `available_demo | blocked` field. 06 §5 keeps
 * three separate facts — lifecycle, network reachability and content
 * retrievability — and ADR-0019 D6 requires the split be preserved rather than
 * collapsed to suit the fixture shape. Collapsing would lose the distinction
 * between "we cannot reach it" and "we reached it and may not use it", which is
 * exactly what a retrieval request needs to say.
 */
export function decodeSourceStatus(wire: string): {
  lifecycle: "ACTIVE" | "DEACTIVATED";
  networkReachable: boolean;
  contentRetrievable: boolean;
} | null {
  switch (wire) {
    case "available_demo":
      return { lifecycle: "ACTIVE", networkReachable: true, contentRetrievable: true };
    case "blocked":
      // Reachability is unknown from this single field; the conservative reading
      // is "reached but not retrievable", which still produces a retrieval
      // request and never a fake verified citation (V2 01 §5).
      return { lifecycle: "ACTIVE", networkReachable: true, contentRetrievable: false };
    default:
      return null;
  }
}

/**
 * Demo profiles (ADR-0019 D6).
 *
 * V2 03 §5 says these are "demonstration identities", and explicitly warns
 * against resolving the recorded eight-roles-versus-seven conflict by picking a
 * production count. So this table MAPS onto the closed sets and adds nothing to
 * them; a V2 string with no counterpart resolves to `null` and is reported to P8
 * rather than being minted as a new capability.
 */
export const DEMO_ROLE_PROFILES: Readonly<Record<string, ActorRole | null>> = {
  demo_concept_reviewer: "REVIEWER_EDITOR",
  demo_fa_editorial: "REVIEWER_EDITOR",
  demo_planner: "PROJECT_LEAD",
  demo_viewer: "VIEWER",
  demo_owner: "WORKSPACE_OWNER",
};

export const DEMO_CAPABILITY_PROFILES: Readonly<Record<string, Capability | null>> = {
  "fa.editorial": "FA_EDITORIAL",
  // OPEN (P8): the closed 11 §4 capability list has no counterpart for these.
  // They describe panel affordances, not the governed capabilities the machine
  // build enforces, so they map to null rather than growing CAPABILITIES.
  "concept.review": null,
  "content.review": null,
  "comment.create": null,
  "calendar.edit": null,
  read: null,
};

export function decodeDemoRole(wire: string): ActorRole | null {
  return DEMO_ROLE_PROFILES[wire] ?? decodeInto(ACTOR_ROLES, wire);
}

export function decodeDemoCapability(wire: string): Capability | null {
  if (Object.hasOwn(DEMO_CAPABILITY_PROFILES, wire)) {
    return DEMO_CAPABILITY_PROFILES[wire] ?? null;
  }
  return decodeInto(CAPABILITIES, wire);
}

/** Every V2 profile string with no recorded counterpart, for the P8 handoff. */
export const UNMAPPED_DEMO_CAPABILITIES: readonly string[] = Object.entries(
  DEMO_CAPABILITY_PROFILES,
)
  .filter(([, mapped]) => mapped === null)
  .map(([wire]) => wire);

/**
 * V2's subject/target field is `kind`; the stored field is `type`
 * (ADR-0019 D6 — existing repo field names are not renamed). Both call sites
 * are `.strict()`, so a raw `kind` is rejected rather than silently ignored,
 * which is what makes this translation mandatory rather than cosmetic.
 */
export function decodeTarget(wire: {
  kind: string;
  id: string;
  versionId: string;
}): { type: "CONCEPT" | "CONTENT"; id: string; versionId: string } | null {
  const type = toStoredCode(wire.kind);
  if (type !== "CONCEPT" && type !== "CONTENT") return null;
  return { type, id: wire.id, versionId: wire.versionId };
}
