import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * The machine's own final report, handed to the person who asked for it.
 *
 * «بارگیری خروجی» was the last dead control in REAL mode. The projection
 * names `final_report.md` — the service really writes it, beside the session
 * in its run directory — but the projection is pure and carries no bytes, so
 * the button rendered enabled, failed every time, and blamed the person's
 * role. Then it was hidden behind a sentence saying the file was "on this
 * device". This route is the file.
 *
 * READ-ONLY, and the vendored service is untouched (ADR-0021 D2): nothing here
 * writes, and nothing here opens `session_state.json` or anything but the one
 * report file. It follows `notes/[sessionId]/route.ts` line for line on the
 * two things that matter — the id is validated before it can become a path
 * segment, and the resolved path is checked to be inside the runs root.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The machine's own id form; twelve hex characters cannot traverse anything. */
const SESSION_ID = /^[a-f0-9]{12}$/;

/** A report is prose. Anything larger than this is not the file we mean. */
const MAX_BYTES = 4 * 1024 * 1024;

const REPORT_FILE = "final_report.md";

/** Off unless the machine is configured at all, so this route simply is not there. */
function configured(): boolean {
  const raw = process.env.DROP_MACHINE_BASE_URL;
  return typeof raw === "string" && raw.trim() !== "";
}

/** The same root the notes route uses, confined the same way. */
function reportPathFor(sessionId: string): string | null {
  const configuredDir = process.env.DROP_RUNS_DIR;
  const root = resolve(
    typeof configuredDir === "string" && configuredDir.trim() !== ""
      ? configuredDir.trim()
      : join(process.cwd(), "..", "..", "drop_runs"),
  );
  const path = resolve(join(root, sessionId, REPORT_FILE));
  return path.startsWith(root + "/") ? path : null;
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  if (!configured()) return notFound();
  const { sessionId } = await context.params;
  if (!SESSION_ID.test(sessionId)) return notFound();

  const path = reportPathFor(sessionId);
  // Absent is honest: a session whose research has not been built has no
  // report yet, and the caller renders that as a state rather than a failure.
  if (path === null || !existsSync(path)) return notFound();

  try {
    if (statSync(path).size > MAX_BYTES) return notFound();
    const body = readFileSync(path);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${sessionId}-${REPORT_FILE}"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return notFound();
  }
}
