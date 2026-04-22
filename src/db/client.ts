import postgres from "postgres";
import { config } from "~/config";

// Üksainus ühenduse pool rakenduse jaoks.
// postgres-lib kasutab parameteriseeritud päringuid (template literal),
// mis välistab SQL-süstimise.
export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export type SqlClient = typeof sql;
