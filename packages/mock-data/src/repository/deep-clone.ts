/**
 * A pure deep clone for demo state (ticket P3).
 *
 * `structuredClone` is a HOST global, not part of ES2023, and
 * `tsconfig.base.json` pins `"lib": ["ES2023"]` deliberately (ADR-0019 D17) —
 * so this package cannot name it without widening the lib for every contract
 * module. JSON round-tripping would also work, but it silently drops
 * `undefined` and would turn a deliberately-absent optional field into a
 * different shape than the one the schemas validated.
 *
 * The demo world is plain JSON-shaped data: objects, arrays, strings, numbers,
 * booleans and null. Anything else is a bug in a fixture, so this throws rather
 * than cloning it half-way.
 */
export function deepClone<T>(value: T): T {
  return clone(value) as T;
}

function clone(value: unknown): unknown {
  if (value === null) return null;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean" || type === "undefined") {
    return value;
  }
  if (Array.isArray(value)) return value.map(clone);
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (type === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = clone(inner);
    }
    return out;
  }
  throw new TypeError(
    `DEMO_STATE_MUST_BE_PLAIN_DATA: cannot clone a value of type "${type}" — ` +
      "demo fixtures are JSON-shaped by contract",
  );
}
