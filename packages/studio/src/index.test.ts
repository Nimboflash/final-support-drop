import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/studio placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/studio");
    expect(packageInfo.placeholder).toBe(true);
  });
});
