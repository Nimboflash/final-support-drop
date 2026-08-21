/**
 * @drop/db — Drizzle schema, repositories, committed migrations.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface DbPackageInfo {
  readonly name: "@drop/db";
  readonly placeholder: true;
}

export const packageInfo: DbPackageInfo = {
  name: "@drop/db",
  placeholder: true,
};

export { allowedEdges } from "./boundary-proof";
