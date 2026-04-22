// Sessioonide middleware: loeb cookie'st sessioon-ID, laadib kasutaja,
// teeb Context'ile kättesaadavaks.
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { config } from "~/config";
import { findValidSession } from "~/models/session.model";

export const SESSION_COOKIE = "juuksur_session";
export const CSRF_COOKIE = "juuksur_csrf";

export type SessionContext = {
  Variables: {
    userId: number | null;
    csrfToken: string;
  };
};

export const loadSession = createMiddleware<SessionContext>(async (c, next) => {
  const sid = getCookie(c, SESSION_COOKIE);
  let userId: number | null = null;
  if (sid) {
    const session = await findValidSession(sid);
    if (session) userId = session.user_id;
  }
  c.set("userId", userId);

  // Anna CSRF token alati edasi (kas olemasolev cookie või uus)
  let csrf = getCookie(c, CSRF_COOKIE);
  if (!csrf) {
    const { generateCsrfToken } = await import("~/utils/csrf");
    csrf = generateCsrfToken();
    setCookie(c, CSRF_COOKIE, csrf, {
      httpOnly: false, // peab olema JS-loetav, et vormi lisada
      secure: config.isProduction,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  c.set("csrfToken", csrf);

  await next();
});
