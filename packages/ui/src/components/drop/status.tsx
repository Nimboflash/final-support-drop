"use client";

/**
 * Status/domain components over the presentation vocabulary (ADR-0017 D4).
 * Icon + text always — color never carries state alone (ADR 0010 D11).
 * Labels resolve ONLY through the central mapping (09 §9).
 * Unknown values render the safe neutral fallback with a diagnostic marker,
 * never a crash (P1 failure_states).
 */

import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  FileClock,
  Hand,
  Hourglass,
  Layers,
  ListChecks,
  Loader,
  OctagonAlert,
  Pause,
  Play,
  RotateCcw,
  ShieldQuestion,
  SkipForward,
  UserRound,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
  type ActorRole,
  type ApprovalState,
  type Freshness,
  type PackageStatus,
  type ProgramStatus,
  type ReviewStatus,
  type RunStatus,
  type StageStatus,
} from "./vocabulary";
import { FA_LABELS, faLabel, type LabelDomain } from "./labels-fa";

type Tone = "neutral" | "active" | "waiting" | "success" | "warning" | "danger";

// ADR-0019 D14: `--accent` is the neutral hover tint now, so `active` reaches
// for `--selected` — the single brand accent — and the `--success`/`--warning`
// bracket escapes become real utilities, since @theme inline finally maps them.
const toneClass: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  active: "bg-selected/10 text-foreground border-selected",
  waiting: "bg-warning/10 text-foreground border-warning",
  success: "bg-success/10 text-foreground border-success",
  warning: "bg-warning/15 text-foreground border-warning",
  danger: "bg-destructive/10 text-foreground border-destructive",
};

interface StatusVisual {
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}

const STAGE_VISUALS: Record<StageStatus, StatusVisual> = {
  DRAFT: { icon: FileClock, tone: "neutral" },
  READY: { icon: ListChecks, tone: "neutral" },
  QUEUED: { icon: Clock, tone: "neutral" },
  RUNNING: { icon: Loader, tone: "active" },
  WAITING_FOR_DEPENDENCY: { icon: Hourglass, tone: "waiting" },
  WAITING_FOR_INPUT: { icon: Hand, tone: "waiting" },
  WAITING_FOR_APPROVAL: { icon: ShieldQuestion, tone: "waiting" },
  PAUSED: { icon: Pause, tone: "warning" },
  FAILED_RETRYABLE: { icon: RotateCcw, tone: "danger" },
  FAILED_FINAL: { icon: OctagonAlert, tone: "danger" },
  SUCCEEDED: { icon: CircleCheck, tone: "success" },
  SKIPPED: { icon: SkipForward, tone: "neutral" },
  CANCELLED: { icon: Ban, tone: "neutral" },
  SUPERSEDED: { icon: Layers, tone: "neutral" },
};

const RUN_VISUALS: Record<RunStatus, StatusVisual> = {
  DRAFT: { icon: FileClock, tone: "neutral" },
  QUEUED: { icon: Clock, tone: "neutral" },
  RUNNING: { icon: Play, tone: "active" },
  WAITING_INPUT: { icon: Hand, tone: "waiting" },
  WAITING_APPROVAL: { icon: ShieldQuestion, tone: "waiting" },
  PAUSED: { icon: Pause, tone: "warning" },
  SUCCEEDED: { icon: CircleCheck, tone: "success" },
  FAILED: { icon: CircleX, tone: "danger" },
  CANCELLED: { icon: Ban, tone: "neutral" },
};

const UNKNOWN_VISUAL: StatusVisual = { icon: CircleDashed, tone: "neutral" };

function StatusBadge({
  domain,
  value,
  visuals,
  testId,
}: {
  // Derived from the central label table, so a new vocabulary cannot be
  // badged without also being labelled (09 §9).
  domain: LabelDomain;
  value: string;
  visuals: Partial<Record<string, StatusVisual>>;
  testId: string;
}) {
  const known = Object.hasOwn(FA_LABELS[domain], value);
  const visual = (known ? visuals[value] : undefined) ?? UNKNOWN_VISUAL;
  const Icon = visual.icon;
  return (
    <Badge
      variant="outline"
      data-testid={testId}
      data-status={known ? value : "UNKNOWN"}
      data-diagnostic={known ? undefined : `unknown-${domain}-status: ${value}`}
      className={cn("gap-1", toneClass[visual.tone])}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{faLabel(domain, value)}</span>
    </Badge>
  );
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <StatusBadge domain="stage" value={status} visuals={STAGE_VISUALS} testId="stage-status-badge" />;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <StatusBadge domain="run" value={status} visuals={RUN_VISUALS} testId="run-status-badge" />;
}

const PROGRAM_VISUALS: Partial<Record<ProgramStatus, StatusVisual>> = {
  DRAFT: { icon: FileClock, tone: "neutral" },
  IN_PIPELINE: { icon: Loader, tone: "active" },
  APPROVED: { icon: CircleCheck, tone: "success" },
  ARCHIVED: { icon: Layers, tone: "neutral" },
};

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  return <StatusBadge domain="program" value={status} visuals={PROGRAM_VISUALS} testId="program-status-badge" />;
}

const APPROVAL_VISUALS: Partial<Record<ApprovalState, StatusVisual>> = {
  PENDING: { icon: ShieldQuestion, tone: "waiting" },
  APPROVED: { icon: CircleCheck, tone: "success" },
  CHANGES_REQUESTED: { icon: RotateCcw, tone: "warning" },
  REJECTED: { icon: CircleX, tone: "danger" },
  ESCALATED: { icon: OctagonAlert, tone: "danger" },
};

export function ApprovalBadge({ state }: { state: ApprovalState }) {
  return <StatusBadge domain="approval" value={state} visuals={APPROVAL_VISUALS} testId="approval-badge" />;
}

export function ActorRoleChip({ role }: { role: ActorRole }) {
  return (
    <Badge variant="secondary" data-testid="actor-role-chip" data-role={role} className="gap-1">
      <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{faLabel("role", role)}</span>
    </Badge>
  );
}

/** A named blocker with Persian explanation (18 §3 "understand blocked states"). */
export function BlockerCallout({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      data-testid="blocker-callout"
      className={cn(
        "rounded-md border border-warning bg-warning/10 p-3 text-sm",
        "flex items-start gap-2",
      )}
    >
      <CircleSlash className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium leading-none">{title}</p>
        {detail ? <p className="text-muted-foreground">{detail}</p> : null}
        {children}
      </div>
    </div>
  );
}

const REVIEW_VISUALS: Partial<Record<ReviewStatus, StatusVisual>> = {
  DRAFT: { icon: FileClock, tone: "neutral" },
  IN_REVIEW: { icon: ShieldQuestion, tone: "waiting" },
  REVISION_REQUESTED: { icon: RotateCcw, tone: "warning" },
  APPROVED: { icon: CircleCheck, tone: "success" },
  REJECTED: { icon: CircleX, tone: "danger" },
};

/** The V2 card review axis (ADR-0019 D5). Icon plus label, never color alone. */
export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <StatusBadge domain="review" value={status} visuals={REVIEW_VISUALS} testId="review-status-badge" />;
}

const FRESHNESS_VISUALS: Partial<Record<Freshness, StatusVisual>> = {
  CURRENT: { icon: CircleCheck, tone: "neutral" },
  STALE: { icon: FileClock, tone: "warning" },
};

/**
 * Freshness is a SEPARATE axis from review status (V2 01 §8): an approved card
 * whose upstream concept changed stays approved AND becomes stale, so the two
 * badges must be able to appear together.
 */
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return <StatusBadge domain="freshness" value={freshness} visuals={FRESHNESS_VISUALS} testId="freshness-badge" />;
}

const PACKAGE_VISUALS: Partial<Record<PackageStatus, StatusVisual>> = {
  CURRENT: { icon: CircleCheck, tone: "success" },
  HISTORICAL: { icon: Layers, tone: "neutral" },
  STALE: { icon: FileClock, tone: "warning" },
};

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return <StatusBadge domain="packageStatus" value={status} visuals={PACKAGE_VISUALS} testId="package-status-badge" />;
}
