/**
 * @drop/core — workspaces, actors, RBAC, approval, audit, comments.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface CorePackageInfo {
  readonly name: "@drop/core";
  readonly placeholder: true;
}

export const packageInfo: CorePackageInfo = {
  name: "@drop/core",
  placeholder: true,
};

export { allowedEdges } from "./boundary-proof";
