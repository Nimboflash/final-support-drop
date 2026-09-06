// Bad fixture (ticket P2, AC-P2.10): 18 §6 — "React Flow node and edge objects
// must be created by a dedicated canvas adapter and must never become the
// external integration contract." React Flow types stay inside workflow-ui.
import type { Node } from "@xyflow/react";

export type Leaked = Node;
