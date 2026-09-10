// The violation ADR-0018 D3 exists to prevent: machine work landing inside a
// frozen package during panel scope. Present only so the purity check can be
// proven to fire.
export function runMachine(): never {
  throw new Error("machine implementation must not exist in panel scope");
}
