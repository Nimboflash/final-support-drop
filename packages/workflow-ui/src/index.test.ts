import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/workflow-ui placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/workflow-ui");
    expect(packageInfo.placeholder).toBe(true);
  });
});
