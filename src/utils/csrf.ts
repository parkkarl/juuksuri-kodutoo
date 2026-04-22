// CSRF kaitse: double-submit cookie muster.
// Cookie väärtus peab vormi peidetud väljal kattuma.
import { randomBytes, timingSafeEqual } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
