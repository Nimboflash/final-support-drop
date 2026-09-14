import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

/**
 * The provider credential, written where only the machine can read it.
 *
 * The owner asked for somewhere to paste an OpenRouter key, change it and
 * clear it. This is that place, and everything about it is shaped by one fact:
 * **the panel has no authentication**. A route that writes a paid credential to
 * disk is therefore as exposed as the panel is, so it is off unless deliberately
 * switched on, it is meant for a loopback dev server, and it says so.
 *
 * Three rules it keeps:
 *
 * 1. **The key never travels back.** `GET` answers whether one is configured
 *    and the last four characters, nothing more. There is no route, and no
 *    code path, that returns the value — not to the browser, not to a log, not
 *    to an error message.
 *
 * 2. **It can only be written to the ignored path.** `.gitignore` covers
 *    exactly `services/concept-portfolio/.env`; the repository root's `.env` is
 *    NOT ignored. The destination is a constant for that reason — a
 *    configurable one is how a credential ends up in a commit.
 *
 * 3. **The vendored service is not touched.** It reads `OPENROUTER_API_KEY`
 *    from its environment and is byte-frozen (ADR-0021 D2). `scripts/machine-server.py`
 *    loads this file at startup, so a key takes effect on the machine's next
 *    start — which is what the panel tells the person, rather than pretending
 *    it is live.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The one destination. `.gitignore:38` covers exactly this path. */
const ENV_PATH = join(process.cwd(), "..", "..", "services", "concept-portfolio", ".env");
const ENV_KEY = "OPENROUTER_API_KEY";

/**
 * OpenRouter's own key form. Checked so a mistyped paste fails here rather than
 * silently costing a model call later — and so this route cannot be used as a
 * general write-anything-to-a-dotfile endpoint.
 */
const KEY_SHAPE = /^sk-or-v1-[A-Za-z0-9]{32,}$/;

/**
 * On in development, off in production unless explicitly switched on.
 *
 * The first cut required `DROP_PROVIDER_KEY_ADMIN=1` everywhere, which made the
 * feature invisible on the machine it was built for: a dev server starts
 * without it, so the field never appeared and the owner could not paste a key.
 * A safety gate that hides the feature from the only person allowed to use it
 * is not protecting anything.
 *
 * The danger was never `next dev` on loopback — it is a DEPLOYED panel, which
 * has no authentication. So that is what the gate is about now: development
 * has the field, production must ask for it by name.
 */
function enabled(): boolean {
  if (process.env.DROP_PROVIDER_KEY_ADMIN === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function off(): NextResponse {
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

function readEnv(): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(ENV_PATH)) return out;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return out;
}

function writeEnv(values: Map<string, string>): void {
  mkdirSync(dirname(ENV_PATH), { recursive: true });
  const body = [...values].map(([k, v]) => `${k}=${v}`).join("\n");
  writeFileSync(ENV_PATH, body === "" ? "" : `${body}\n`, { encoding: "utf8", mode: 0o600 });
  // Owner-only, even if the file already existed with looser permissions.
  chmodSync(ENV_PATH, 0o600);
}

/** The last four characters, so a person can tell WHICH key is set. Never more. */
function hintOf(key: string | undefined): string | null {
  if (key === undefined || key === "") return null;
  return key.slice(-4);
}

export function GET(): NextResponse {
  if (!enabled()) return off();
  const hint = hintOf(readEnv().get(ENV_KEY));
  return NextResponse.json({ configured: hint !== null, hint });
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!enabled()) return off();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "NOT_JSON" }, { status: 400 });
  }

  const key = (body as { key?: unknown }).key;
  if (typeof key !== "string" || !KEY_SHAPE.test(key.trim())) {
    // The value is never echoed, not even to say what was wrong with it.
    return NextResponse.json({ error: "KEY_SHAPE" }, { status: 400 });
  }

  const values = readEnv();
  values.set(ENV_KEY, key.trim());
  writeEnv(values);
  return NextResponse.json({ configured: true, hint: hintOf(key.trim()), restartRequired: true });
}

export function DELETE(): NextResponse {
  if (!enabled()) return off();
  const values = readEnv();
  values.delete(ENV_KEY);
  writeEnv(values);
  return NextResponse.json({ configured: false, hint: null, restartRequired: true });
}
