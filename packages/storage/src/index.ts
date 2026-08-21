/**
 * @drop/storage — S3/MinIO abstraction and signed/streamed access.
 * Safe placeholder only (ticket 0.1 AC-5): a typed export proving the package
 * boundary exists. Real content arrives with this package's owning ticket.
 */
export interface StoragePackageInfo {
  readonly name: "@drop/storage";
  readonly placeholder: true;
}

export const packageInfo: StoragePackageInfo = {
  name: "@drop/storage",
  placeholder: true,
};
