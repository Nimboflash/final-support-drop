import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/pipeline placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/pipeline");
    expect(packageInfo.placeholder).toBe(true);
  });
});
