/**
 * AC-4 positive fixture (05 §4): these imports are ALLOWED edges and must
 * always compile. The forbidden directions live in tests/repo/boundary-fixtures-bad
 * and must always fail lint.
 */
import { packageInfo as coreInfo } from "@drop/core";
import { packageInfo as studioInfo } from "@drop/studio";
import { packageInfo as ai_gatewayInfo } from "@drop/ai-gateway";
import { packageInfo as retrievalInfo } from "@drop/retrieval";
import { packageInfo as storageInfo } from "@drop/storage";

export const allowedEdges: readonly string[] = [coreInfo.name, studioInfo.name, ai_gatewayInfo.name, retrievalInfo.name, storageInfo.name];
