import { DEMO_EPOCH } from "./ports";

/**
 * Mock concept discovery (AC-P3.8; ADR-0019 D16).
 *
 * V2 01 §3: "'Random' discovery is seeded variation in mock mode; Reset Demo
 * reproduces the same sequence. Advancing the seed yields a different predefined
 * batch."
 *
 * So: an AUTHORED, FINITE table selected by `batches[seed mod batches.length]`.
 * No PRNG, not even a seeded one — a PRNG would make "Reset Demo reproduces the
 * identical sequence" depend on nobody ever changing the call order, and
 * `Math.random` is unreachable from this package by construction anyway
 * (`tests/repo/determinism.test.ts` proves it).
 *
 * The content is fictional demo material. It represents no real research and no
 * AI output (V2 00 §1).
 */
export interface DiscoveryCandidate {
  readonly titleFa: string;
  readonly titleEn: string;
  readonly thesisFa: string;
  readonly dropRationaleFa: string;
  readonly directions: readonly string[];
}

export interface DiscoveryBatch {
  readonly key: string;
  readonly candidates: readonly DiscoveryCandidate[];
}

/**
 * V2 01 §3 requires "a seeded set of THREE distinct concepts" per attempt, so
 * every batch holds exactly three.
 */
export const DISCOVERY_BATCHES: readonly DiscoveryBatch[] = [
  {
    key: "BATCH_1",
    candidates: [
      {
        titleFa: "زیبایی ناتمام",
        titleEn: "Beautiful Imperfection",
        thesisFa:
          "نقص کوچک می‌تواند رد حضور انسان باشد؛ چیزی که تجربه را از یک محصول بی‌نام جدا می‌کند.",
        dropRationaleFa: "توجه به شخصیت ماده و انتخاب آگاهانه، پیوند این ایده با Taste است.",
        directions: ["EDITORIAL", "FILM", "MUSIC", "LANDING"],
      },
      {
        titleFa: "صدای پیش از حرف",
        titleEn: "Sound Before Speech",
        thesisFa: "پیش از آنکه چیزی گفته شود، فضا لحنی دارد؛ آن لحن بخشی از میزبانی است.",
        dropRationaleFa: "میزبانی در DROP با شنیدن آغاز می‌شود، نه با توضیح دادن.",
        directions: ["EDITORIAL", "MUSIC", "SOCIAL"],
      },
      {
        titleFa: "میز به‌مثابه مرز",
        titleEn: "The Table as a Border",
        thesisFa: "میز هم جدا می‌کند و هم جمع می‌کند؛ همین دوگانگی، آیین نشستن را می‌سازد.",
        dropRationaleFa: "خوراک و نوشیدنی هر دو بیان برابر Taste‌اند؛ میز جایی است که این برابری دیده می‌شود.",
        directions: ["EDITORIAL", "ART_DESIGN", "PRODUCTION_BRIEF"],
      },
    ],
  },
  {
    key: "BATCH_2",
    candidates: [
      {
        titleFa: "آیین مکث",
        titleEn: "The Ritual of Pause",
        thesisFa: "چند لحظه توجه، بدون تبدیل شدن به تمرین بزرگ، ریتم روز را عوض می‌کند.",
        dropRationaleFa: "مکث، شکل کوچکی از احترام به تجربهٔ مشترک است.",
        directions: ["EDITORIAL", "SOCIAL", "LANDING"],
      },
      {
        titleFa: "رد دست در اشیا",
        titleEn: "The Hand's Trace in Objects",
        thesisFa: "اثر انگشت روی لعاب، تاریخ کوتاه یک شیء را روایت می‌کند.",
        dropRationaleFa: "ماده و دست انسان، دو منبع اصلی شخصیت در زبان بصری DROP‌اند.",
        directions: ["EDITORIAL", "ART_DESIGN", "BOOK"],
      },
      {
        titleFa: "نور به‌عنوان تقویم",
        titleEn: "Light as a Calendar",
        thesisFa: "تغییر نور در طول فصل، برنامهٔ پنهان یک فضاست.",
        dropRationaleFa: "برنامه‌ریزی فصلی در DROP از مشاهده آغاز می‌شود، نه از تقویم اداری.",
        directions: ["EDITORIAL", "FILM", "PRODUCTION_BRIEF"],
      },
    ],
  },
  {
    key: "BATCH_3",
    candidates: [
      {
        titleFa: "آنچه سرو نمی‌شود",
        titleEn: "What Is Not Served",
        thesisFa: "حذف آگاهانه به اندازهٔ افزودن، بخشی از طراحی تجربه است.",
        dropRationaleFa: "انتخاب نکردن هم یک انتخاب است؛ این همان انضباط Taste است.",
        directions: ["EDITORIAL", "SOCIAL"],
      },
      {
        titleFa: "همسایگی طعم‌ها",
        titleEn: "The Neighbourhood of Flavours",
        thesisFa: "کنار هم نشستن دو طعم، معنایی می‌سازد که هیچ‌کدام به‌تنهایی ندارند.",
        dropRationaleFa: "خوراک و نوشیدنی در DROP هم‌وزن‌اند و در کنار هم خوانده می‌شوند.",
        directions: ["EDITORIAL", "MUSIC", "LANDING"],
      },
      {
        titleFa: "حافظهٔ کوتاه یک عصر",
        titleEn: "The Short Memory of an Afternoon",
        thesisFa: "بعضی تجربه‌ها ساخته می‌شوند تا فراموش شوند؛ همین موقتی بودن ارزششان است.",
        dropRationaleFa: "ثبت‌نکردن هم شکلی از احترام به لحظه است.",
        directions: ["EDITORIAL", "FILM", "BOOK"],
      },
    ],
  },
];

/** `batches[seed mod batches.length]` — the whole selection rule. */
export function batchForSeed(seed: number): DiscoveryBatch {
  const count = DISCOVERY_BATCHES.length;
  const index = ((seed % count) + count) % count;
  const batch = DISCOVERY_BATCHES[index];
  if (batch === undefined) throw new Error("DISCOVERY_TABLE_IS_EMPTY");
  return batch;
}

/** Advancing is an explicit user action, never a side effect of reading. */
export function advanceSeed(seed: number): number {
  return seed + 1;
}

export const DISCOVERY_EPOCH = DEMO_EPOCH;
