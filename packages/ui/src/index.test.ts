import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/ui placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/ui");
    expect(packageInfo.placeholder).toBe(true);
  });
});
