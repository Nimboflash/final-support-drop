import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/mock-data placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/mock-data");
    expect(packageInfo.placeholder).toBe(true);
  });
});
