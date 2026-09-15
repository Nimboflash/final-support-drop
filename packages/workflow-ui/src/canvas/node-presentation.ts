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
/**
 * The ONE Persian name per node state (ADR-0020 D7).
 *
 * Both renderers read it: the canvas node badge and the accessible stage list.
 * Engine briefly kept a second, differently-worded copy of its own, so the same
 * node read «در انتظار بررسی» on the canvas and «منتظر اقدام شما» in the list
 * beside it — one screen, two names for one state. The wording below is the
 * panel's, because D5 says the interface speaks to the person: "waiting for
 * your action" tells them what to do, "awaiting review" describes a queue.
 */
export const NODE_STATE_LABEL_FA: Readonly<Record<NodeState, string>> = {
  PENDING: "هنوز شروع نشده",
  RUNNING: "در حال اجرا",
  AWAITING_REVIEW: "منتظر اقدام شما",
  DONE: "کامل",
  BLOCKED: "متوقف",
  REJECTED: "کنار گذاشته‌شده",
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

/**
 * Tone classes, used ALONGSIDE the icon and label, never instead of them.
 *
 * ADR-0022 draws the line this map had blurred. `AWAITING_REVIEW` and
 * `BLOCKED` were the same amber, so "this is waiting for YOU" and "this is
 * stuck on something else" were indistinguishable on a canvas of forty-six
 * near-identical dark cards — on the one surface whose job is to show you
 * where you are needed.
 *
 * Acid Lime now means a person is the blocker, and nothing else does. `DONE`
 * stays deliberately quiet: finished work has no claim on anyone's attention.
 */
export const NODE_STATE_TONE: Readonly<Record<NodeState, string>> = {
  PENDING: "border-border text-muted-foreground",
  RUNNING: "border-selected",
  AWAITING_REVIEW: "border-attention",
  DONE: "border-success",
  BLOCKED: "border-warning",
  REJECTED: "border-destructive",
};
