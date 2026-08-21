import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/contracts placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/contracts");
    expect(packageInfo.placeholder).toBe(true);
  });
});
