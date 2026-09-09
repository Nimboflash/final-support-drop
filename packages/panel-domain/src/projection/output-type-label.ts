import { OUTPUT_TYPES, type OutputType } from "../vocabulary/product";

/**
 * The one Persian name for each output type (ADR-0020 D5).
 *
 * It lives in the projection layer rather than in `apps/web` because two
 * renderers need it: the panel surfaces AND the Engine graph in
 * `@drop/workflow-ui`, which cannot import from the app. When the map lived in
 * the app only, every graph node fell through to its `?? item.type` escape and
 * Engine rendered raw `EDITORIAL` / `FILM` / `LANDING` — the exact failure D5
 * describes, on the one surface no surface-tree guard was scanning.
 *
 * The `Record<OutputType, string>` type is the guard against a repeat: adding a
 * member to `OUTPUT_TYPES` without a Persian name is a compile error, not a
 * silent identifier on screen.
 */
export const OUTPUT_TYPE_LABEL_FA: Readonly<Record<OutputType, string>> = {
  EDITORIAL: "روایت سردبیری",
  FILM: "فیلم",
  MUSIC: "موسیقی",
  BOOK: "کتاب",
  ART_DESIGN: "هنر و طراحی",
  SOCIAL: "شبکه‌های اجتماعی",
  LANDING: "صفحهٔ فرود",
  PRODUCTION_BRIEF: "بریف تولید",
};

/**
 * Never returns an identifier. A value outside the enum can only arrive from
 * corrupt stored demo state, and the honest answer there is "unknown type",
 * not the raw string.
 */
export function outputTypeLabelFa(value: string): string {
  return (OUTPUT_TYPES as readonly string[]).includes(value)
    ? OUTPUT_TYPE_LABEL_FA[value as OutputType]
    : "نوع نامشخص";
}
