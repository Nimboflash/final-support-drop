import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/observability placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/observability");
    expect(packageInfo.placeholder).toBe(true);
  });
});
