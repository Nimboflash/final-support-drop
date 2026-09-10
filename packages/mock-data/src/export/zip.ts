/**
 * A minimal store-only ZIP writer (ticket P3; ADR-0019 D17).
 *
 * Why hand-written rather than a dependency: `packages/mock-data` is
 * transport-free and dependency-light by design, the archive is a handful of
 * small UTF-8 text files, and V2 04 §5 requires the generated archive to be
 * INSPECTED against its manifest — which is far easier to trust when the writer
 * is 100 readable lines than when it is a compression library.
 *
 * Compression method 0 (stored) throughout. No deflate stream means no
 * dependency and no ambiguity: `unzip -l` and any language's zipfile module read
 * it, which is exactly what P7's "inspect the ZIP against its manifest" needs.
 */

/** CRC-32 (IEEE 802.3), the checksum every ZIP entry carries. */
const CRC_TABLE: readonly number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xff_ff_ff_ff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

export interface ZipEntry {
  readonly path: string;
  readonly body: string;
}

/**
 * UTF-8 encoding, by hand.
 *
 * `TextEncoder` is a HOST global, not ES2023, and `tsconfig.base.json` pins the
 * lib deliberately (ADR-0019 D17) — reaching for it would widen the lib for
 * every contract module. This matters more than usual here: the archive is
 * Persian, so almost every character is multi-byte, and a naive `charCodeAt`
 * loop would corrupt the file bodies AND the entry names.
 */
export function utf8(text: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  for (const character of text) {
    // Iterating the string yields whole code points, so surrogate pairs arrive
    // already combined rather than as two lone halves.
    const code = character.codePointAt(0)!;
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x1_00_00) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  const bytes = new Uint8Array(out.length);
  bytes.set(out);
  return bytes;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}
function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/**
 * A fixed DOS timestamp. ADR-0019 D16 forbids reading the clock here, and a
 * real timestamp would make the exported bytes differ on every run — which
 * would defeat "loading the same scenario twice yields deep-equal state".
 * 2026-09-06 00:00:00 in DOS packed form.
 */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (9 << 5) | 6;

export function createZip(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  const local: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = utf8(entry.path);
    const bodyBytes = utf8(entry.body);
    const checksum = crc32(bodyBytes);

    const header = [
      ...u32(0x04_03_4b_50), // local file header signature
      ...u16(20), // version needed
      ...u16(0x08_00), // general purpose flag: bit 11, UTF-8 names
      ...u16(0), // method 0 — stored
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(checksum),
      ...u32(bodyBytes.length),
      ...u32(bodyBytes.length),
      ...u16(nameBytes.length),
      ...u16(0), // extra field length
    ];
    local.push(...header, ...nameBytes, ...bodyBytes);

    central.push(
      ...u32(0x02_01_4b_50), // central directory header signature
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0x08_00),
      ...u16(0),
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(checksum),
      ...u32(bodyBytes.length),
      ...u32(bodyBytes.length),
      ...u16(nameBytes.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk number
      ...u16(0), // internal attributes
      ...u32(0), // external attributes
      ...u32(offset),
      ...nameBytes,
    );

    offset += header.length + nameBytes.length + bodyBytes.length;
  }

  const centralOffset = offset;
  const end = [
    ...u32(0x06_05_4b_50), // end of central directory signature
    ...u16(0), // disk
    ...u16(0), // disk with central directory
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(centralOffset),
    ...u16(0), // comment length
  ];

  // `new Uint8Array(length)` is backed by a plain ArrayBuffer, which is what
  // `packageExportSchema` requires; `Uint8Array.from` widens to ArrayBufferLike.
  const all = [...local, ...central, ...end];
  const out = new Uint8Array(all.length);
  out.set(all);
  return out;
}
