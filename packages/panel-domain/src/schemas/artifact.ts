import { z } from "zod";
import {
  displayTextSchema,
  idSchema,
  instantSchema,
  stableCodeSchema,
} from "./common";

/**
 * Artifact DTOs — 06 §7 (`studio.artifacts`, `artifact_versions`,
 * `artifact_validations`), 18 §4.1 (artifact views), 18 §6 (`listArtifacts`).
 */

/**
 * PROVISIONAL. No authority document enumerates `studio.artifact_versions.status`
 * (06 §7 names the column only). Rather than invent a closed enum, the panel
 * records the states the documents *do* name — approved artifact versions
 * (00 §4, 06 §11) and the validation-failed condition (10 §9
 * `artifact.validation.failed`) — and accepts any stable English code.
 * OPEN — P8 coordination with the machine build.
 */
export const RECORDED_ARTIFACT_VERSION_STATUSES = [
  "DRAFT",
  "VALIDATION_FAILED",
  "APPROVED",
  "SUPERSEDED",
] as const;
export type RecordedArtifactVersionStatus =
  (typeof RECORDED_ARTIFACT_VERSION_STATUSES)[number];

export const artifactVersionStatusSchema = stableCodeSchema;

/** 06 §7 — `studio.artifact_validations`: validator identity per result. */
export const artifactValidationSchema = z
  .object({
    validatorKey: stableCodeSchema,
    /** ADR-0015 D4 — executor/validator identity is code version + checksum. */
    validatorCodeVersion: z.string().min(1, "VALIDATOR_CODE_VERSION_REQUIRED"),
    validatorChecksum: z.string().min(1, "VALIDATOR_CHECKSUM_REQUIRED"),
    passed: z.boolean(),
    checkedAt: instantSchema,
    findings: z.array(z.object({ code: stableCodeSchema, detail: z.string().max(2000).optional() })),
  })
  .strict()
  .superRefine((validation, ctx) => {
    // 00 §4 — missing validators block progression, fail closed. A "passed"
    // result carrying findings would let the UI show a green artifact over red
    // evidence.
    if (validation.passed === true && validation.findings.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["passed"],
        message: "PASSED_VALIDATION_MUST_HAVE_NO_FINDINGS",
      });
    }
  });
export type ArtifactValidation = z.infer<typeof artifactValidationSchema>;

export const artifactVersionSummarySchema = z
  .object({
    id: idSchema,
    versionNumber: z.int().min(1, "VERSION_NUMBER_MUST_BE_POSITIVE"),
    status: artifactVersionStatusSchema,
    createdAt: instantSchema,
    /** 06 §7 — producer identity; 06 §4 separates supplier from record creator. */
    producedByActorId: idSchema.optional(),
    /** 06 §7 — confidence recorded alongside the version. */
    confidence: z.number().min(0).max(1).optional(),
    validation: artifactValidationSchema.optional(),
    /** 06 §2.2 — the approval event that authorised an approved version. */
    approvedByEventId: idSchema.optional(),
  })
  .strict()
  .superRefine((version, ctx) => {
    // 06 §2.2 / 00 §4 — an approved version must point at the approval event
    // that authorised it; provenance is not optional for approved history.
    if (version.status === "APPROVED" && version.approvedByEventId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["approvedByEventId"],
        message: "APPROVED_VERSION_REQUIRES_ITS_APPROVAL_EVENT",
      });
    }
  });
export type ArtifactVersionSummary = z.infer<typeof artifactVersionSummarySchema>;

export const artifactSummarySchema = z
  .object({
    id: idSchema,
    /** 06 §7 — stable artifact identity plus latest version pointer. */
    artifactKey: stableCodeSchema,
    title: displayTextSchema,
    /** Artifact classification (06 §7 manifest item classification). Open set. */
    kind: stableCodeSchema,
    runId: idSchema.optional(),
    programId: idSchema.optional(),
    latestVersion: artifactVersionSummarySchema,
    versionCount: z.int().min(1, "VERSION_COUNT_MUST_BE_POSITIVE"),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (artifact.latestVersion.versionNumber > artifact.versionCount) {
      ctx.addIssue({
        code: "custom",
        path: ["versionCount"],
        message: "LATEST_VERSION_NUMBER_EXCEEDS_VERSION_COUNT",
      });
    }
  });
export type ArtifactSummary = z.infer<typeof artifactSummarySchema>;
