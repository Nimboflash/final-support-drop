// FORBIDDEN (05 §4): subpath Drizzle import — the way people actually write it.
// Locks in the pattern-based rule (review F2).
import { pgTable } from "drizzle-orm/pg-core";
export const leak = pgTable;
