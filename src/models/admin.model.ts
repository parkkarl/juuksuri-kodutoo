import bcrypt from "bcryptjs";
import { sql } from "~/db/client";

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  const rows = await sql<AdminUser[]>`
    SELECT id, username, password_hash
    FROM admin_users
    WHERE username = ${username}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Kontrolli parooli. Tagastab admin kasutaja kui sobib, muidu null.
 *
 * Kasutab bcrypt-compare-i, mis on ajakonstantne — kaitseb timing-rünnakute
 * vastu. Kui kasutajat pole, teeme ikkagi bcrypt võrdlemise dummy räsi
 * vastu, et vastusaeg oleks ühtne (anti-user-enumeration).
 */
const DUMMY_HASH = "$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUV";

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<AdminUser | null> {
  const user = await findAdminByUsername(username);
  const hash = user?.password_hash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return ok && user ? user : null;
}
