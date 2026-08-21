import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  ActorRoleChip,
  ApprovalBadge,
  BidiIdentifier,
  BlockerCallout,
  DegradedModeBanner,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineState,
  PermissionDeniedState,
  PersianDateTime,
  ProgramStatusBadge,
  RunStatusBadge,
  StageStatusBadge,
  STAGE_STATUSES,
  RUN_STATUSES,
  PROGRAM_STATUSES,
  APPROVAL_STATES,
  ACTOR_ROLES,
  faLabel,
} from "../../index";

function renderRtl(node: ReactElement) {
  return render(<div dir="rtl">{node}</div>);
}

// ---------- AC-P1.8 — enum-exhaustive badges ----------
describe("StageStatusBadge — all 14 ADR-0012 stage states", () => {
  it.each([...STAGE_STATUSES])("%s renders icon + central Persian label", (status) => {
    const { container, unmount } = renderRtl(<StageStatusBadge status={status} />);
    expect(screen.getByText(faLabel("stage", status))).toBeInTheDocument();
    expect(container.querySelector("svg"), `${status} must render an icon`).not.toBeNull();
    unmount();
  });
});

describe("RunStatusBadge — all 9 ADR-0012 run states", () => {
  it.each([...RUN_STATUSES])("%s renders icon + central Persian label", (status) => {
    const { container, unmount } = renderRtl(<RunStatusBadge status={status} />);
    expect(screen.getByText(faLabel("run", status))).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    unmount();
  });
});

describe("ProgramStatusBadge — ADR-0015 program states", () => {
  it.each([...PROGRAM_STATUSES])("%s renders central Persian label", (status) => {
    const { unmount } = renderRtl(<ProgramStatusBadge status={status} />);
    expect(screen.getByText(faLabel("program", status))).toBeInTheDocument();
    unmount();
  });
});

describe("ApprovalBadge / ActorRoleChip", () => {
  it.each([...APPROVAL_STATES])("approval %s renders", (state) => {
    const { unmount } = renderRtl(<ApprovalBadge state={state} />);
    expect(screen.getByText(faLabel("approval", state))).toBeInTheDocument();
    unmount();
  });
  it.each([...ACTOR_ROLES])("role %s renders", (role) => {
    const { unmount } = renderRtl(<ActorRoleChip role={role} />);
    expect(screen.getByText(faLabel("role", role))).toBeInTheDocument();
    unmount();
  });
});

describe("unknown enum values — safe fallback, never a crash (failure_states)", () => {
  it("StageStatusBadge falls back with a diagnostic", () => {
    renderRtl(<StageStatusBadge status={"BOGUS_STATE" as never} />);
    expect(screen.getByText(/ناشناخته/)).toBeInTheDocument();
    const badge = screen.getByTestId("stage-status-badge");
    expect(badge).toHaveAttribute("data-diagnostic", expect.stringContaining("BOGUS_STATE"));
  });
  it("RunStatusBadge falls back with a diagnostic", () => {
    renderRtl(<RunStatusBadge status={"???" as never} />);
    expect(screen.getByTestId("run-status-badge")).toHaveAttribute(
      "data-diagnostic",
      expect.stringContaining("???"),
    );
  });
});

// ---------- AC-P1.6 — bidi isolation ----------
describe("BidiIdentifier (09 §5, §12)", () => {
  it("renders the identifier inside an isolated dir=ltr span", () => {
    renderRtl(<BidiIdentifier value="run_01J8ZKW9-42" />);
    const el = screen.getByText("run_01J8ZKW9-42");
    const ltr = el.closest('[dir="ltr"]');
    expect(ltr).not.toBeNull();
  });

  it("mixed Persian/Latin content keeps the raw value intact for copy", () => {
    renderRtl(<BidiIdentifier value="https://drop.local/studio/runs/42?x=1" />);
    const el = screen.getByText("https://drop.local/studio/runs/42?x=1");
    expect(el.textContent).toBe("https://drop.local/studio/runs/42?x=1");
  });

  it("exposes a copy action", () => {
    renderRtl(<BidiIdentifier value="prg_123" />);
    expect(screen.getByRole("button", { name: /کپی/ })).toBeInTheDocument();
  });
});

// ---------- AC-P1.7 — Jalali dates ----------
describe("PersianDateTime (09 §12; 05 §2)", () => {
  // Known-answer fixtures worked out by hand (independent source, not recomputed):
  // 2026-08-21T12:00:00Z → Tehran (+03:30) 15:30 → 30 Mordad 1405.
  // 2026-03-20T20:31:00Z → Tehran 00:01 next day → 1 Farvardin 1405 (Nowruz boundary).
  it("renders 2026-08-21T12:00:00Z as 30 Mordad 1405, 15:30 Tehran time", () => {
    renderRtl(<PersianDateTime value="2026-08-21T12:00:00.000Z" />);
    const el = screen.getByTestId("persian-datetime");
    expect(el.textContent).toContain("۳۰ مرداد ۱۴۰۵");
    expect(el.textContent).toContain("۱۵:۳۰");
  });

  it("renders the Nowruz boundary instant as 1 Farvardin 1405", () => {
    renderRtl(<PersianDateTime value="2026-03-20T20:31:00.000Z" />);
    const el = screen.getByTestId("persian-datetime");
    expect(el.textContent).toContain("۱ فروردین ۱۴۰۵");
    expect(el.textContent).toContain("۰۰:۰۱");
  });

  it("exposes the raw UTC instant for sorting", () => {
    renderRtl(<PersianDateTime value="2026-08-21T12:00:00.000Z" />);
    expect(screen.getByTestId("persian-datetime")).toHaveAttribute(
      "data-utc",
      "2026-08-21T12:00:00.000Z",
    );
  });
});

// ---------- AC-P1.10 — state primitives ----------
describe("state primitives (18 §4.1)", () => {
  const cases: Array<[string, ReactElement, RegExp]> = [
    ["LoadingState", <LoadingState key="l" />, /در حال بارگذاری/],
    ["EmptyState", <EmptyState key="e" />, /چیزی برای نمایش نیست/],
    ["ErrorState", <ErrorState key="r" diagnosticId="diag-1" />, /خطایی رخ داد/],
    ["OfflineState", <OfflineState key="o" />, /اتصال برقرار نیست/],
    ["PermissionDeniedState", <PermissionDeniedState key="p" />, /دسترسی مجاز نیست/],
    ["DegradedModeBanner", <DegradedModeBanner key="d" />, /محدود/],
  ];

  it.each(cases)("%s renders Persian text from the package API", (_name, node, pattern) => {
    const { unmount } = renderRtl(node);
    expect(screen.getByText(pattern)).toBeInTheDocument();
    unmount();
  });

  it("ErrorState shows the diagnostic id in bidi isolation", () => {
    renderRtl(<ErrorState diagnosticId="diag-42" />);
    const el = screen.getByText("diag-42");
    expect(el.closest('[dir="ltr"]')).not.toBeNull();
  });

  it("BlockerCallout names the blocker with Persian explanation", () => {
    renderRtl(<BlockerCallout title="ورودی الزامی موجود نیست" detail="فایل بریف بارگذاری نشده است" />);
    expect(screen.getByText("ورودی الزامی موجود نیست")).toBeInTheDocument();
    expect(screen.getByText("فایل بریف بارگذاری نشده است")).toBeInTheDocument();
  });
});
