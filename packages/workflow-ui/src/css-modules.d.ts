/**
 * Side-effect CSS imports.
 *
 * `tsconfig.base.json` has no bundler-CSS awareness, so a `import "…/style.css"`
 * has no type. Next resolves it through `transpilePackages`; this declaration is
 * only so `tsc --noEmit` agrees the import is legitimate.
 */
declare module "*.css";
