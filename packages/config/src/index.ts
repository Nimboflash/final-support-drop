/**
 * @drop/config — typed environment and feature flags.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface ConfigPackageInfo {
  readonly name: "@drop/config";
  readonly placeholder: true;
}

export const packageInfo: ConfigPackageInfo = {
  name: "@drop/config",
  placeholder: true,
};
