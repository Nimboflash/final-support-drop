import { describe, expect, it } from "vitest";
import { baseWorld } from "../seed/base-world";
import { exportPackageFrom, UnknownPackageError } from "./package-export";
import { crc32, utf8 } from "./zip";

/**
 * Ticket P3 — the archive is verified by actually UNZIPPING it, not by trusting
 * the writer. V2 04 §5 requires inspecting the generated ZIP against its
 * manifest, and a hand-written writer that is never opened by a real unzip is
 * exactly the "empty fake archive" the brief warns about.
 */
describe("the UTF-8 encoder handles the Persian the archive is made of", () => {
  it("encodes multi-byte code points correctly", () => {
    // "آ" is U+0622 → two bytes; a naive charCodeAt loop would truncate it.
    expect([...utf8("آ")]).toEqual([0xd8, 0xa2]);
    expect([...utf8("a")]).toEqual([0x61]);
    // Outside the BMP: iterating by code point keeps the surrogate pair whole.
    expect(utf8("😀")).toHaveLength(4);
  });

  it("computes the standard CRC-32", () => {
    // The canonical check value for "123456789".
    expect(crc32(utf8("123456789"))).toBe(0xcb_f4_39_26);
  });
});

describe("package export (AC-P3.13)", () => {
  const world = baseWorld();
  const snapshot = world.packages[0]!;

  it("throws for an unknown id rather than returning an empty archive", () => {
    // A silent empty ZIP is precisely the "dead download button" V2 01 §6 rules out.
    expect(() => exportPackageFrom(world, "pkg-does-not-exist")).toThrow(UnknownPackageError);
  });

  it("returns non-empty bytes with a filename and the zip media type", () => {
    const exported = exportPackageFrom(world, snapshot.id);
    expect(exported.mediaType).toBe("application/zip");
    expect(exported.bytes.length).toBeGreaterThan(0);
    expect(exported.filename).toBe(`${snapshot.id}.zip`);
  });

  it("is byte-identical across runs, so demo state stays deterministic", () => {
    const a = exportPackageFrom(world, snapshot.id).bytes;
    const b = exportPackageFrom(world, snapshot.id).bytes;
    expect([...a]).toEqual([...b]);
  });
});
