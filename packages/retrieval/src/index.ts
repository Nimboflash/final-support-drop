/**
 * @drop/retrieval — source registry, reachability and content retrieval adapters.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface RetrievalPackageInfo {
  readonly name: "@drop/retrieval";
  readonly placeholder: true;
}

export const packageInfo: RetrievalPackageInfo = {
  name: "@drop/retrieval",
  placeholder: true,
};
