import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/config placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/config");
    expect(packageInfo.placeholder).toBe(true);
  });
});
