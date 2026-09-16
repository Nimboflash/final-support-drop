"use client";

/**
 * The sessions this browser has started, so there is a way BACK.
 *
 * «شروع کانسپت جدید» repoints the panel at a new machine session — deliberately,
 * because the brief only reaches the machine through session creation. What
 * it used to lack was any control that could return to the previous one: the
 * cookie moved and the old session simply left the panel. This keeps a short
 * list, per browser, and Settings renders it as rows a person can switch to.
 *
 * `localStorage` on purpose, and NOT the demo key. This is a convenience list
 * of ids, not state: losing it costs a person the shortcut, never a decision
 * (those live beside the session on the machine). The demo key is validated
 * on hydration under its own discriminator and must not learn about sessions.
 */
const KEY = "drop-machine-sessions-v1";
const KEEP = 12;

export interface StartedSession {
  readonly id: string;
  /** The first line of what was asked, so a row is recognisable. */
  readonly briefFa: string;
  readonly startedAt: string;
}

const SESSION_ID = /^[a-f0-9]{12}$/;

export function readStartedSessions(): readonly StartedSession[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: StartedSession[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || !SESSION_ID.test(row.id)) continue;
      out.push({
        id: row.id,
        briefFa: typeof row.briefFa === "string" ? row.briefFa : "",
        startedAt: typeof row.startedAt === "string" ? row.startedAt : "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function rememberStartedSession(session: StartedSession): void {
  try {
    const prior = readStartedSessions().filter((row) => row.id !== session.id);
    const next = [session, ...prior].slice(0, KEEP);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full store. The list is a convenience; the session
    // itself is already on the machine and in the cookie.
  }
}
