// Sessioonide hoidmine andmebaasis. Cookie hoiab ainult sessiooni ID,
// kõik tegelikud andmed on serveri pool.
import { randomBytes } from "node:crypto";
import { sql } from "~/db/client";

export interface SessionRow {
  id: string;
  user_id: number;
  expires_at: Date;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 tundi

export function generateSessionId(): string {
  // 32 baiti juhuslikku andmeid = 256-bit session ID, base64url
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: number): Promise<SessionRow> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const rows = await sql<SessionRow[]>`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${id}, ${userId}, ${expiresAt})
    RETURNING id, user_id, expires_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Sessiooni ei saanud luua");
  return row;
}

export async function findValidSession(id: string): Promise<SessionRow | null> {
  const rows = await sql<SessionRow[]>`
    SELECT id, user_id, expires_at
    FROM sessions
    WHERE id = ${id} AND expires_at > now()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${id}`;
}

export async function purgeExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at <= now()`;
}
