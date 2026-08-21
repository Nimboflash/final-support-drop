// FORBIDDEN (05 §4): packages/ui importing feature/domain services.
import { packageInfo } from "@drop/core";
export const leak = packageInfo;
