// Admin kasutaja seeding env muutujatest (ADMIN_USERNAME + ADMIN_PASSWORD).
// Parooli räsi arvutatakse bcrypt-iga, plaintext parooli andmebaasi ei salvestata.
import bcrypt from "bcryptjs";
import { config } from "~/config";
import { sql } from "~/db/client";

async function seedAdmin(): Promise<void> {
  const username = config.adminUsername;
  const password = config.adminPassword;

  if (!username || !password) {
    console.error("ADMIN_USERNAME ja ADMIN_PASSWORD peavad olema .env failis seatud.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("ADMIN_PASSWORD peab olema vähemalt 8 märki pikk.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${hash})
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;

  console.log(`Admin kasutaja "${username}" loodud/uuendatud.`);
}

seedAdmin()
  .catch((err) => {
    console.error("Seed viga:", err);
    process.exit(1);
  })
  .finally(() => sql.end());
