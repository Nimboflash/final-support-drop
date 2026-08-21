/**
 * @drop/studio — Programs, Lenses, sources, concepts, outputs, requests.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface StudioPackageInfo {
  readonly name: "@drop/studio";
  readonly placeholder: true;
}

export const packageInfo: StudioPackageInfo = {
  name: "@drop/studio",
  placeholder: true,
};

export { allowedEdges } from "./boundary-proof";
