import type { PackageExport, PackageSnapshot, PanelSnapshot } from "@drop/panel-domain";
import { createZip, type ZipEntry } from "./zip";

/**
 * Builds the downloadable package archive (ticket P3; ADR-0019 D17).
 *
 * V2 01 §6 is blunt about the failure mode this replaces: "ZIP download must
 * contain real sample files that match the manifest; no dead download buttons or
 * empty fake archives."
 *
 * `manifest.json` is SYNTHESIZED, not a `files[]` member — the reference archive
 * in `docs/frontend-v2/mock/DEMO_PACKAGE_p2_v1.zip` has four entries where its
 * snapshot lists three, and the fourth is the snapshot itself with file bodies
 * stripped. Treating the manifest as a stored file would either duplicate every
 * body inside itself or leave the archive describing a file it does not contain.
 */

export interface PackageManifest {
  readonly id: string;
  readonly familyId: string;
  readonly projectId: string;
  readonly version: number;
  readonly status: string;
  readonly conceptVersionIds: readonly string[];
  readonly contentVersionIds: readonly string[];
  readonly createdAt: string;
  readonly isMock: true;
  /** Paths and provenance only — the bodies live in the archive entries. */
  readonly files: readonly { readonly path: string; readonly contentVersionId: string | null }[];
}

export function buildManifest(snapshot: PackageSnapshot): PackageManifest {
  return {
    id: snapshot.id,
    familyId: snapshot.familyId,
    projectId: snapshot.projectId,
    version: snapshot.version,
    status: snapshot.status,
    conceptVersionIds: snapshot.conceptVersionIds,
    contentVersionIds: snapshot.contentVersionIds,
    createdAt: snapshot.createdAt,
    isMock: true,
    files: snapshot.files.map((file) => ({
      path: file.path,
      contentVersionId: file.contentVersionId,
    })),
  };
}

export function buildPackageExport(snapshot: PackageSnapshot): PackageExport {
  const entries: ZipEntry[] = snapshot.files.map((file) => ({
    path: file.path,
    body: file.body,
  }));
  entries.push({
    path: "manifest.json",
    body: `${JSON.stringify(buildManifest(snapshot), null, 2)}\n`,
  });
  return {
    bytes: createZip(entries),
    filename: `${snapshot.id}.zip`,
    mediaType: "application/zip",
  };
}

export class UnknownPackageError extends Error {
  constructor(id: string) {
    super(`UNKNOWN_PACKAGE: ${id}`);
    this.name = "UnknownPackageError";
  }
}

export function exportPackageFrom(world: PanelSnapshot, packageVersionId: string): PackageExport {
  const snapshot = world.packages.find((p) => p.id === packageVersionId);
  // Never an empty archive for a missing id: a silent empty ZIP is precisely
  // the "dead download button" V2 01 §6 rules out.
  if (snapshot === undefined) throw new UnknownPackageError(packageVersionId);
  return buildPackageExport(snapshot);
}
