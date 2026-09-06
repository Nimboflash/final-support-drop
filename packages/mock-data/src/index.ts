/**
 * @drop/mock-data — the deterministic demo world (ticket P3; 18 §10).
 *
 * The canonical demo repository, the normalized V2 seed, the twenty-four
 * scenario recipes, demo persistence and the package exporter. Components never
 * import this package — the ESLint boundary zone forbids it (18 §6-§7), and the
 * mock adapters in `@drop/machine-gateway` are the only consumers.
 */

// ports and the injected clock
export * from "./ports";

// the world
export * from "./seed/base-world";
export * from "./seed/normalize";
export * from "./seed/demo-profiles";
export * from "./seed/density";

// scenarios
export * from "./scenarios/types";
export * from "./scenarios/registry";
export * from "./scenarios/load";
export * from "./scenarios/journeys";

// the repository and its command behaviour
export * from "./repository/demo-repository";
export * from "./repository/deep-clone";

// persistence
export * from "./storage/demo-persistence";

// discovery and export
export * from "./discovery";
export * from "./export/zip";
export * from "./export/package-export";
