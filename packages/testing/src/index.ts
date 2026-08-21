/**
 * @drop/testing — fixtures, builders and seam harnesses.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface TestingPackageInfo {
  readonly name: "@drop/testing";
  readonly placeholder: true;
}

export const packageInfo: TestingPackageInfo = {
  name: "@drop/testing",
  placeholder: true,
};

export { allowedEdges } from "./boundary-proof";
