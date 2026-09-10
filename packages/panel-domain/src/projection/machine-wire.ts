import { z } from "zod";

/**
 * The machine's wire shapes, validated at the boundary (ADR-0021 D6).
 *
 * `services/concept-portfolio` is a separate service in a separate language
 * with its own release cycle. Everything it sends is untrusted input, exactly
 * like the V2 mock JSON that `wire-codec.ts` already decodes here — so it is
 * parsed at the boundary and never trusted structurally.
 *
 * These schemas are deliberately LOOSE where the machine is loose, and the
 * looseness is the finding rather than an oversight:
 *
 *   - `concept_id` is minted by the MODEL, not by the service. Its JSON schema
 *     is a bare `{"type": "string"}` — no pattern, no uniqueness within a round,
 *     no stability across rounds. It is `concept_01..05` every round only
 *     because the mock backend hard-codes that.
 *   - `round_index` is whatever the model echoed back. The service hard-codes
 *     `1` on the initial call and merely *suggests* `previous + 1` on a refine,
 *     never correcting the answer. Two rounds can both say `1`.
 *   - `status` is written but never read as a guard by the service, and it
 *     regresses: a `respond` after a portfolio is built sets it back to
 *     `CONCEPTS_READY` while leaving the portfolio in place.
 *
 * So nothing downstream may key on `concept_id`, order by `round_index`, or
 * trust `status`. Array position is the only reliable identity, and the
 * projection derives stage from facts instead.
 */

/** Passthrough, not strict: the machine may add fields and must not break us. */
const wire = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();

export const machineConceptCardSchema = wire({
  concept_id: z.string(),
  title: z.string(),
  one_line: z.string().default(""),
  human_truth: z.string().default(""),
  central_idea: z.string().default(""),
  guest_takeaway: z.string().default(""),
  territory: z.string().default(""),
  anchor_score: z.number().default(0),
  portfolio_score: z.number().default(0),
  why_it_fits: z.string().default(""),
});
export type MachineConceptCard = z.infer<typeof machineConceptCardSchema>;

export const machineConceptBatchSchema = wire({
  round_index: z.number().default(1),
  concepts: z.array(machineConceptCardSchema),
  notes: z.string().default(""),
});
export type MachineConceptBatch = z.infer<typeof machineConceptBatchSchema>;

/**
 * One recommendation, across all five categories.
 *
 * The subtype fields (`sonic_fit`, `medium`, `summary`, …) are optional on
 * purpose: the machine's own JSON schema requires only rank/title/creator/
 * why_related/source_notes/links, and Pydantic supplies the rest as empty
 * strings. The mock backend is RICHER than the real one here, so a projection
 * built against mock output would assume fields production never sends.
 */
export const machineRecommendationSchema = wire({
  rank: z.number().default(0),
  title: z.string(),
  creator: z.string().default(""),
  why_related: z.string().default(""),
  source_notes: z.string().default(""),
  /** Model-authored URLs. Never trusted, never rendered as a bare href. */
  links: z.array(z.string()).default([]),
});
export type MachineRecommendation = z.infer<typeof machineRecommendationSchema>;

export const machinePortfolioSchema = wire({
  concept_id: z.string(),
  concept_title: z.string().default(""),
  music: z.array(machineRecommendationSchema).default([]),
  films_and_series: z.array(machineRecommendationSchema).default([]),
  artworks: z.array(machineRecommendationSchema).default([]),
  scientific_readings: z.array(machineRecommendationSchema).default([]),
  artistic_readings: z.array(machineRecommendationSchema).default([]),
});
export type MachinePortfolio = z.infer<typeof machinePortfolioSchema>;

export const machineConceptRequestSchema = wire({
  project_brief: z.string().default(""),
  initial_context: z.string().default(""),
  desired_feeling: z.string().default(""),
  seed: z.string().default(""),
  previous_ideas: z.array(z.string()).default([]),
});

/** The machine's own status. Recorded, and deliberately NOT used as a guard. */
export const MACHINE_SESSION_STATUSES = [
  "DRAFT",
  "CONCEPTS_READY",
  "IDEA_APPROVED",
  "PORTFOLIO_READY",
] as const;

export const machineSessionSchema = wire({
  /** 12 hex characters from `uuid4().hex[:12]`. Also a filesystem path segment. */
  session_id: z.string().regex(/^[a-f0-9]{12}$/, "MACHINE_SESSION_ID_MUST_BE_12_HEX"),
  status: z.enum(MACHINE_SESSION_STATUSES),
  input: machineConceptRequestSchema,
  concept_rounds: z.array(machineConceptBatchSchema).default([]),
  approved_concept_id: z.string().nullable().default(null),
  approved_concept: machineConceptCardSchema.nullable().default(null),
  portfolio: machinePortfolioSchema.nullable().default(null),
  /*
    A server filesystem path, present in every response. It is parsed so the
    shape is honest about what arrives, and then deliberately dropped by the
    projection: a server path has no business in a client payload.
  */
  run_dir: z.string().default(""),
});
export type MachineSession = z.infer<typeof machineSessionSchema>;
