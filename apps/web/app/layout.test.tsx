import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import RootLayout from "./layout";

// AC-P1.1 (component half): the root layout commits lang/dir structurally.
// Playwright asserts the rendered document; this pins the source of truth.
describe("root layout direction (AC-P1.1)", () => {
  it("declares lang=fa-IR and dir=rtl on <html>", () => {
    const el = RootLayout({ children: null }) as ReactElement<{
      lang: string;
      dir: string;
    }>;
    expect(el.type).toBe("html");
    expect(el.props.lang).toBe("fa-IR");
    expect(el.props.dir).toBe("rtl");
  });
});
