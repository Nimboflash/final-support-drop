import {
  artifactSummarySchema,
  auditEventSchema,
  commandReceiptSchema,
  machineSummarySchema,
  workflowDefinitionSchema,
  workflowRunSchema,
  workflowRunSummarySchema,
  type ApprovalCommand,
  type RunFilters,
  type StartRunCommand,
} from "@drop/panel-domain";
import type { z } from "zod";
import type { MachineGateway } from "../machine-gateway";
import { GatewayError } from "../errors";

/**
 * The adapter-contract conformance suite (18 §12; AC-P2.7).
 *
 * Written against the `MachineGateway` **interface**, never against any one
 * implementation: `MockMachineGateway` (P3) and a future `RealMachineGateway`
 * both submit to exactly this suite unmodified. That is what makes "replacing
 * MockMachineGateway with RealMachineGateway requires no page-level redesign"
 * (18 §12) a testable claim rather than an aspiration.
 *
 * Runner-agnostic by construction: the suite returns plain cases that throw on
 * violation, so it carries no Vitest dependency into the shipped package and
 * the machine build can run it under whatever runner it uses.
 */

/** Raised when an adapter violates the contract. Never caught by the suite. */
export class ConformanceViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConformanceViolation";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConformanceViolation(message);
}

function assertSchema(schema: z.ZodType, value: unknown, label: string): void {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConformanceViolation(
      `${label} is not schema-valid: ${JSON.stringify(result.error.issues)}`,
    );
  }
}

/** Determinism check (18 §7): identical calls must serialise identically. */
function assertIdentical(a: unknown, b: unknown, label: string): void {
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    `${label} is not deterministic: two identical calls returned different data`,
  );
}

async function expectGatewayError(
  call: () => Promise<unknown>,
  reason: GatewayError["reason"],
  label: string,
): Promise<void> {
  let thrown: unknown;
  try {
    const value = await call();
    throw new ConformanceViolation(
      `${label} resolved with ${JSON.stringify(value)} instead of throwing ${reason} — ` +
        "unknown ids and denied actions must never resolve to undefined or a silent null",
    );
  } catch (error) {
    if (error instanceof ConformanceViolation) throw error;
    thrown = error;
  }
  assert(
    thrown instanceof GatewayError,
    `${label} threw ${String(thrown)} instead of a typed GatewayError`,
  );
  assert(
    (thrown as GatewayError).reason === reason,
    `${label} threw GatewayError(${(thrown as GatewayError).reason}), expected ${reason}`,
  );
}

/** The adapter-supplied handles the suite needs to exercise a real world. */
export interface ConformanceFixtures {
  readonly knownWorkflowDefinitionId: string;
  readonly unknownWorkflowDefinitionId: string;
  readonly knownRunId: string;
  readonly unknownRunId: string;
  /** A filter the adapter's data actually narrows on (18 §6 `listRuns`). */
  readonly narrowingRunFilters: RunFilters;
  /** A run the adapter accepts a pause for (18 §7.3). */
  readonly pausableRunId: string;
  /** A stage the adapter accepts a retry for, preserving history (18 §7.3). */
  readonly retryableStage: { readonly runId: string; readonly stageId: string };
  readonly startRunCommand: StartRunCommand;
  readonly approvalCommand: ApprovalCommand;
}

export interface ConformanceOptions {
  readonly name: string;
  readonly createGateway: () => MachineGateway | Promise<MachineGateway>;
  readonly fixtures: ConformanceFixtures;
}

export interface ConformanceCase {
  readonly name: string;
  run(): Promise<void>;
}

export function createGatewayConformanceSuite(options: ConformanceOptions): ConformanceCase[] {
  const { fixtures } = options;
  const gateway = async (): Promise<MachineGateway> => await options.createGateway();

  const cases: ConformanceCase[] = [
    {
      name: "listMachines returns schema-valid MachineSummary values",
      async run() {
        const machines = await (await gateway()).listMachines();
        assert(Array.isArray(machines), "listMachines must return an array");
        machines.forEach((m, i) => assertSchema(machineSummarySchema, m, `machine[${i}]`));
      },
    },
    {
      name: "listWorkflowDefinitions returns schema-valid definitions",
      async run() {
        const definitions = await (await gateway()).listWorkflowDefinitions();
        assert(Array.isArray(definitions), "listWorkflowDefinitions must return an array");
        definitions.forEach((d, i) =>
          assertSchema(workflowDefinitionSchema, d, `definition[${i}]`),
        );
      },
    },
    {
      name: "getWorkflowDefinition returns a schema-valid definition for a known id",
      async run() {
        const definition = await (await gateway()).getWorkflowDefinition(
          fixtures.knownWorkflowDefinitionId,
        );
        assertSchema(workflowDefinitionSchema, definition, "getWorkflowDefinition result");
        assert(
          definition.id === fixtures.knownWorkflowDefinitionId,
          "getWorkflowDefinition returned a different definition than the one requested",
        );
      },
    },
    {
      name: "getWorkflowDefinition throws UNKNOWN_ID for an unknown id",
      async run() {
        const gw = await gateway();
        await expectGatewayError(
          () => gw.getWorkflowDefinition(fixtures.unknownWorkflowDefinitionId),
          "UNKNOWN_ID",
          "getWorkflowDefinition(unknown)",
        );
      },
    },
    {
      name: "listRuns returns schema-valid run summaries",
      async run() {
        const runs = await (await gateway()).listRuns();
        assert(Array.isArray(runs), "listRuns must return an array");
        runs.forEach((r, i) => assertSchema(workflowRunSummarySchema, r, `run[${i}]`));
      },
    },
    {
      name: "listRuns honours its filters rather than ignoring them",
      async run() {
        const gw = await gateway();
        const all = await gw.listRuns();
        const filtered = await gw.listRuns(fixtures.narrowingRunFilters);
        assert(Array.isArray(filtered), "filtered listRuns must return an array");
        assert(
          filtered.length <= all.length,
          "a filtered listRuns returned more rows than the unfiltered call",
        );
        const wanted = fixtures.narrowingRunFilters.status;
        if (wanted !== undefined) {
          for (const run of filtered) {
            assert(
              wanted.includes(run.status),
              `listRuns returned status ${run.status}, which the status filter excluded`,
            );
          }
        }
        if (fixtures.narrowingRunFilters.programId !== undefined) {
          for (const run of filtered) {
            assert(
              run.programId === fixtures.narrowingRunFilters.programId,
              "listRuns returned a run outside the requested programId",
            );
          }
        }
      },
    },
    {
      name: "getRun returns a schema-valid run for a known id",
      async run() {
        const run = await (await gateway()).getRun(fixtures.knownRunId);
        assertSchema(workflowRunSchema, run, "getRun result");
        assert(
          run.summary.id === fixtures.knownRunId,
          "getRun returned a different run than the one requested",
        );
      },
    },
    {
      name: "getRun throws UNKNOWN_ID for an unknown id",
      async run() {
        const gw = await gateway();
        await expectGatewayError(
          () => gw.getRun(fixtures.unknownRunId),
          "UNKNOWN_ID",
          "getRun(unknown)",
        );
      },
    },
    {
      name: "listArtifacts returns schema-valid artifacts for a known run",
      async run() {
        const artifacts = await (await gateway()).listArtifacts(fixtures.knownRunId);
        assert(Array.isArray(artifacts), "listArtifacts must return an array");
        artifacts.forEach((a, i) => assertSchema(artifactSummarySchema, a, `artifact[${i}]`));
      },
    },
    {
      name: "listArtifacts throws UNKNOWN_ID for an unknown run",
      async run() {
        const gw = await gateway();
        await expectGatewayError(
          () => gw.listArtifacts(fixtures.unknownRunId),
          "UNKNOWN_ID",
          "listArtifacts(unknown)",
        );
      },
    },
    {
      name: "listAuditEvents returns schema-valid events inside the 18 §9 envelope",
      async run() {
        const events = await (await gateway()).listAuditEvents();
        assert(Array.isArray(events), "listAuditEvents must return an array");
        events.forEach((e, i) => assertSchema(auditEventSchema, e, `auditEvent[${i}]`));
      },
    },
    {
      name: "listAuditEvents honours the runId filter",
      async run() {
        const gw = await gateway();
        const scoped = await gw.listAuditEvents({ runId: fixtures.knownRunId });
        for (const event of scoped) {
          assert(
            event.runId === fixtures.knownRunId,
            "listAuditEvents returned an event outside the requested runId",
          );
        }
      },
    },
    {
      name: "startRun returns a schema-valid receipt that declares its origin",
      async run() {
        const receipt = await (await gateway()).startRun(fixtures.startRunCommand);
        assertSchema(commandReceiptSchema, receipt, "startRun receipt");
        // 18 §12 — no UI state may falsely claim a real machine operation.
        assert(
          receipt.origin === "MOCK" || receipt.origin === "REAL",
          "a command receipt must declare its origin so mock actions can be labelled",
        );
      },
    },
    {
      name: "pauseRun appends an audit event observable on a subsequent read (18 §7.3)",
      async run() {
        const gw = await gateway();
        const before = await gw.listAuditEvents({ runId: fixtures.pausableRunId });
        const receipt = await gw.pauseRun(fixtures.pausableRunId);
        assertSchema(commandReceiptSchema, receipt, "pauseRun receipt");
        assert(receipt.accepted, "pauseRun on a pausable run must be accepted");
        const after = await gw.listAuditEvents({ runId: fixtures.pausableRunId });
        assert(
          after.length > before.length,
          "an accepted pauseRun produced no new audit event — 18 §7.3 requires the " +
            "mock state to change and an audit event to be appended",
        );
      },
    },
    {
      name: "retryStage creates a new attempt while preserving history (18 §7.3)",
      async run() {
        const gw = await gateway();
        const { runId, stageId } = fixtures.retryableStage;
        const before = await gw.getRun(runId);
        const beforeStage = before.stages.find((s) => s.id === stageId);
        assert(beforeStage !== undefined, `retryableStage ${stageId} is not present on run ${runId}`);
        const beforeAttempts = beforeStage.attempts;

        const receipt = await gw.retryStage(runId, stageId);
        assertSchema(commandReceiptSchema, receipt, "retryStage receipt");
        assert(receipt.accepted, "retryStage on a retryable stage must be accepted");

        const after = await gw.getRun(runId);
        const afterStage = after.stages.find((s) => s.id === stageId);
        assert(afterStage !== undefined, "the retried stage vanished from the run");
        assert(
          afterStage.attempts.length === beforeAttempts.length + 1,
          "retryStage must add exactly one attempt",
        );
        // History preservation is the point: earlier attempts must survive
        // unchanged, not be replaced by a fresh single attempt.
        for (let i = 0; i < beforeAttempts.length; i += 1) {
          assertIdentical(
            afterStage.attempts[i],
            beforeAttempts[i],
            `attempt[${i}] after retryStage`,
          );
        }
      },
    },
    {
      name: "submitApproval returns a schema-valid receipt through the single write path",
      async run() {
        const receipt = await (await gateway()).submitApproval(fixtures.approvalCommand);
        assertSchema(commandReceiptSchema, receipt, "submitApproval receipt");
      },
    },
    {
      name: "reads are deterministic under a controlled clock (18 §7)",
      async run() {
        const gw = await gateway();
        assertIdentical(await gw.listMachines(), await gw.listMachines(), "listMachines");
        assertIdentical(await gw.listRuns(), await gw.listRuns(), "listRuns");
        assertIdentical(
          await gw.getRun(fixtures.knownRunId),
          await gw.getRun(fixtures.knownRunId),
          "getRun",
        );
      },
    },
  ];

  return cases.map((c) => ({ name: `${options.name}: ${c.name}`, run: c.run }));
}
