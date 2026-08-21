// FORBIDDEN (05 §4): React components writing directly to Drizzle.
import { sql } from "drizzle-orm";
export const leak = sql;
