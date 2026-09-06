// Bad fixture (ticket P2, AC-P2.10): 18 §6 / ADR-0017 D5 — panel-domain and
// machine-gateway are pure TypeScript + Zod with no framework or transport
// dependency. React must never enter them.
import { useState } from "react";

export const leaked = useState;
