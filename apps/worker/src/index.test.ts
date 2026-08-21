import { describe, expect, it } from "vitest";
import { workerBoundary } from "./index";

describe("apps/worker placeholder", () => {
  it("holds the allowed worker-adapter edges", () => {
    expect(workerBoundary).toEqual(["@drop/pipeline", "@drop/config", "@drop/observability"]);
  });
});
