import { describe, expect, it } from "vitest";
import { packageInfo } from "./index";

describe("@drop/db placeholder", () => {
  it("exports its typed package info", () => {
    expect(packageInfo.name).toBe("@drop/db");
    expect(packageInfo.placeholder).toBe(true);
  });
});
