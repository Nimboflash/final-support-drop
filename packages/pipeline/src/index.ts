/**
 * @drop/pipeline — definitions, executor, gates, checkpoints, run manifests.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface PipelinePackageInfo {
  readonly name: "@drop/pipeline";
  readonly placeholder: true;
}

export const packageInfo: PipelinePackageInfo = {
  name: "@drop/pipeline",
  placeholder: true,
};

export { allowedEdges } from "./boundary-proof";
