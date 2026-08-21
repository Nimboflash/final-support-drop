import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/core placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/core");
    expect(packageInfo.placeholder).toBe(true);
  });
});
