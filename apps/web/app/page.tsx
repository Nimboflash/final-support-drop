import { allowedEdges } from "@drop/pipeline";
import { packageInfo as uiInfo } from "@drop/ui";
import { packageInfo as workflowUiInfo } from "@drop/workflow-ui";

/**
 * Placeholder shell (ticket 0.1 AC-5). Proves the ui <- web and workflow-ui <- web
 * allowed edges compile (05 §4). The real /studio IA is ticket 0.13.
 */
export default function Home() {
  return (
    <main>
      <h1>DROP OS</h1>
      <p>ماژول استودیو — اسکلت مخزن، تیکت ۰٫۱</p>
      <p dir="ltr">
        {[uiInfo.name, workflowUiInfo.name, ...allowedEdges].join(" · ")}
      </p>
    </main>
  );
}
