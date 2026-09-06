/**
 * @drop/mock-data — typed deterministic scenarios and fixtures (18 §10).
 *
 * Safe placeholder only. Ticket P2 creates this package so the (18 §10) panel
 * boundary exists and the ESLint zone that forbids components from importing it
 * (18 §6–7) has a real module specifier to bind to. The fourteen (18 §7.2)
 * scenarios and the MockMachineGateway arrive with ticket P3.
 */
export interface MockDataPackageInfo {
  readonly name: "@drop/mock-data";
  readonly placeholder: true;
}

export const packageInfo: MockDataPackageInfo = {
  name: "@drop/mock-data",
  placeholder: true,
};
