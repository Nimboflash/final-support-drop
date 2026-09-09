import type { NodeState, ProductNodeClass } from "../model/product-graph";

/**
 * Node presentation (AC-P5.8).
 *
 * Status is ALWAYS icon plus label. ADR-0010 D11 makes colour never sufficient
 * on its own, and a graph is exactly where that rule is easiest to break —
 * a coloured dot on a canvas node reads as informative until someone cannot
 * distinguish the colours.
 *
 * Kept as data rather than JSX so both the canvas and the accessible stage list
 * render the same vocabulary from one place; a divergence between them would be
 * invisible to a sighted reviewer.
 */
export const NODE_STATE_LABEL_FA: Readonly<Record<NodeState, string>> = {
  PENDING: "هنوز شروع نشده",
  RUNNING: "در حال اجرا",
  AWAITING_REVIEW: "در انتظار بررسی",
  DONE: "کامل",
  BLOCKED: "متوقف",
  REJECTED: "ردشده",
};

/** Lucide icon names; the components are resolved at the render site. */
export const NODE_STATE_ICON: Readonly<Record<NodeState, string>> = {
  PENDING: "CircleDashed",
  RUNNING: "Loader",
  AWAITING_REVIEW: "ShieldQuestion",
  DONE: "CircleCheck",
  BLOCKED: "CircleSlash",
  REJECTED: "CircleX",
};

export const NODE_CLASS_LABEL_FA: Readonly<Record<ProductNodeClass, string>> = {
  INPUT: "ورودی",
  CONCEPT_GENERATION: "تولید کانسپت",
  CONCEPT_REVIEW: "بررسی کانسپت",
  RESEARCH: "تحقیق",
  CONTENT_GENERATION: "تولید محتوا",
  CONTENT_REVIEW: "بررسی محتوا",
  // The node CLASS keeps its recorded name `PACKAGE`; only what a person reads
  // changes (ADR-0020 D5).
  PACKAGE: "خروجی",
  CALENDAR: "تقویم",
};

/** Tone classes, used ALONGSIDE the icon and label, never instead of them. */
export const NODE_STATE_TONE: Readonly<Record<NodeState, string>> = {
  PENDING: "border-border text-muted-foreground",
  RUNNING: "border-selected",
  AWAITING_REVIEW: "border-warning",
  DONE: "border-success/60",
  BLOCKED: "border-warning",
  REJECTED: "border-destructive",
};
