// Bad fixture (ticket P2, AC-P2.10): 18 §6–7 — "All UI code must depend on
// application-level interfaces rather than fixture files"; "components must
// never import fixture JSON directly". Linted individually with --no-ignore by
// dependency-direction.test.ts and MUST fail there.
import { packageInfo } from "@drop/mock-data";

export const leaked = packageInfo.name;
