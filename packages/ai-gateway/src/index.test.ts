import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/ai-gateway placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/ai-gateway");
    expect(packageInfo.placeholder).toBe(true);
  });
});
