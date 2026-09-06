// Bad fixture (ticket P2, AC-P2.10): the same 18 §7 rule reached through
// panel-domain's fixture subpath. Canonical DTO shapes are for adapters, mocks
// and contract tests — a component that imports them bypasses the seam just as
// surely as importing @drop/mock-data.
import { VALID_FIXTURES } from "@drop/panel-domain/fixtures";

export const leaked = Object.keys(VALID_FIXTURES).length;
