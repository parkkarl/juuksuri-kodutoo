// Keskne konfiguratsioonimoodul — kõik env-muutujad loetakse siin, mitte
// juhuslikult üle koodi. See teeb testimise ja deploy'mise lihtsamaks.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Puudub kohustuslik keskkonnamuutuja: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number.parseInt(optional("PORT", "3100"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: optional("NODE_ENV", "development") === "production",
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  adminUsername: optional("ADMIN_USERNAME", ""),
  adminPassword: optional("ADMIN_PASSWORD", ""),
} as const;

// Sanity check: sessioonisalasõna peab olema piisavalt pikk
if (config.sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET peab olema vähemalt 32 märki pikk (turvaline juhuslik string).");
}
