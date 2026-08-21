/**
 * AC-4 positive fixture (05 §4): these imports are ALLOWED edges and must
 * always compile. The forbidden directions live in tests/repo/boundary-fixtures-bad
 * and must always fail lint.
 */
import { packageInfo as contractsInfo } from "@drop/contracts";
import { packageInfo as dbInfo } from "@drop/db";

export const allowedEdges: readonly string[] = [contractsInfo.name, dbInfo.name];
