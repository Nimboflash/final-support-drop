// Bad fixture (ticket P2, AC-P2.10): 18 §6 — no framework dependency in the
// panel contract packages. The subpath form is the realistic violation.
import { headers } from "next/headers";

export const leaked = headers;
