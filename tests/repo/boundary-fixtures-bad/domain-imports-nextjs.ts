// FORBIDDEN (05 §4): packages/core or packages/studio importing Next.js.
// This fixture must FAIL lint — asserted by dependency-direction.test.ts.
import { useRouter } from "next/navigation";
export const leak = useRouter;
