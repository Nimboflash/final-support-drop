import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/retrieval placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/retrieval");
    expect(packageInfo.placeholder).toBe(true);
  });
});
