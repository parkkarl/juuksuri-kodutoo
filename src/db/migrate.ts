import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "~/db/client";

const MIGRATIONS_DIR = new URL("./migrations/", import.meta.url).pathname;

async function ensureMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await sql<{ filename: string }[]>`
    SELECT filename FROM schema_migrations
  `;
  return new Set(rows.map((r) => r.filename));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[skip]  ${file}`);
      continue;
    }
    const path = join(MIGRATIONS_DIR, file);
    const content = await readFile(path, "utf8");

    // Käivita iga migratsioon transaktsioonis — vea korral rollback.
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`
        INSERT INTO schema_migrations (filename) VALUES (${file})
      `;
    });
    console.log(`[apply] ${file}`);
  }

  console.log("Migratsioonid lõpetatud.");
}

runMigrations()
  .catch((err) => {
    console.error("Migratsiooni viga:", err);
    process.exit(1);
  })
  .finally(() => sql.end());
