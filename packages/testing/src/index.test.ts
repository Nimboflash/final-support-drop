import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/testing placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/testing");
    expect(packageInfo.placeholder).toBe(true);
  });
});
