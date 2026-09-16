"use client";

import { toast } from "@drop/ui";
import { commandErrorFa, commandErrorTone } from "./commands";

/**
 * What the panel says out loud, and when (ADR-0026 D5).
 *
 * Two kinds of notice, and the distinction is the whole design:
 *
 *   machine work   a paid call that takes tens of seconds. It gets a loading
 *                  toast that stays until the call settles and counts the
 *                  seconds while it does, then turns into the result. This is
 *                  the "thinking" state made visible somewhere other than the
 *                  sheet that started it — the person can close that sheet
 *                  and still know the machine is working and not press again.
 *
 *   a recorded     a panel-side write that lands in milliseconds. A short
 *   decision       success notice and nothing else; a loading toast that
 *                  flashes for forty milliseconds is noise.
 *
 * Every sentence is in one place so two surfaces cannot describe the same
 * event differently, and every failure goes through `commandErrorFa` — the
 * toast says exactly what the inline line says.
 */
export type MachineWork = "generate" | "build" | "rebuild" | "refine";

const WORK_FA: Readonly<Record<MachineWork, { doing: string; done: string }>> = {
  generate: { doing: "ماشین در حال ساخت کانسپت‌هاست", done: "کانسپت‌ها ساخته شدند." },
  build: { doing: "ماشین در حال ساخت تحقیق و محتواست", done: "محتوا ساخته شد؛ در «محتوا» ببینید." },
  rebuild: { doing: "ماشین در حال بازسازی محتواست", done: "محتوا از نو ساخته شد." },
  refine: { doing: "ماشین در حال بازنگری کانسپت است", done: "نسخهٔ تازهٔ کانسپت رسید." },
};

const COSTS_FA = "این کار هزینه دارد و چند ده ثانیه طول می‌کشد؛ دوباره نزنید.";

/** Persian digits, and a unit that reads naturally rather than «۹۰ ثانیه». */
export function formatElapsedFa(seconds: number): string {
  const fa = (value: number): string =>
    String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
  if (seconds < 60) return `${fa(seconds)} ثانیه`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${fa(minutes)} دقیقه` : `${fa(minutes)} دقیقه و ${fa(rest)} ثانیه`;
}

export interface MachineWorkNotice {
  done(): void;
  fail(error: unknown): void;
}

/**
 * Opens the loading toast for a paid call and keeps its clock running.
 *
 * The toast is updated IN PLACE by id (the Sonner pattern), so the seconds
 * tick inside one notice rather than stacking new ones, and the result
 * replaces the loading state instead of appearing beside it.
 */
export function beginMachineWork(kind: MachineWork): MachineWorkNotice {
  const words = WORK_FA[kind];
  const started = Date.now();
  const id = toast.loading(words.doing, { description: COSTS_FA, duration: Infinity });
  const timer = setInterval(() => {
    const elapsed = Math.round((Date.now() - started) / 1000);
    toast.loading(`${words.doing} — ${formatElapsedFa(elapsed)}`, {
      id,
      description: COSTS_FA,
      duration: Infinity,
    });
  }, 1_000);

  return {
    done() {
      clearInterval(timer);
      toast.success(words.done, { id, description: undefined, duration: 6_000 });
    },
    fail(error) {
      clearInterval(timer);
      notifyFailure(error, id);
    },
  };
}

/** A failure, in the tone its classification gives it. */
export function notifyFailure(error: unknown, id?: string | number): void {
  const message = commandErrorFa(error);
  const options = { id, description: undefined, duration: 9_000 };
  switch (commandErrorTone(error)) {
    case "wait":
      toast.info(message, options);
      return;
    case "conflict":
    case "refused":
      toast.warning(message, options);
      return;
    default:
      toast.error(message, options);
  }
}

export type RecordedDecision =
  | "approved"
  | "changesRequested"
  | "setAside"
  | "selected"
  | "dated"
  | "undated"
  | "sentToCalendar"
  | "downloaded"
  | "sourceAdded";

const RECORDED_FA: Readonly<Record<RecordedDecision, string>> = {
  approved: "تأیید شد.",
  changesRequested: "درخواست تغییر ثبت شد.",
  setAside: "کنار گذاشته شد.",
  selected: "انتخاب شد.",
  dated: "تاریخ ذخیره شد.",
  undated: "به فهرست بدون تاریخ برگشت.",
  sentToCalendar: "به تقویم فرستاده شد.",
  downloaded: "بارگیری شد.",
  sourceAdded: "منبع ثبت شد.",
};

/** A short notice for a decision that landed. Nothing was spent. */
export function notifyRecorded(kind: RecordedDecision): void {
  toast.success(RECORDED_FA[kind], { duration: 2_500 });
}
