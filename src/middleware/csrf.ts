// CSRF kontroll mutating-päringutel (POST/PUT/DELETE).
// Double-submit cookie: vormi peidetud väli peab vastama cookie'le.
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { CSRF_COOKIE } from "~/middleware/session";
import { tokensMatch } from "~/utils/csrf";

export const requireCsrf = createMiddleware(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const cookieToken = getCookie(c, CSRF_COOKIE);
  const contentType = c.req.header("content-type") ?? "";

  let formToken = "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await c.req.parseBody();
    formToken = typeof body._csrf === "string" ? body._csrf : "";
    // Pane keha tagasi kättesaadavaks (Hono säilitab selle cache'is)
  } else if (contentType.includes("application/json")) {
    formToken = c.req.header("x-csrf-token") ?? "";
  }

  if (!cookieToken || !formToken || !tokensMatch(cookieToken, formToken)) {
    throw new HTTPException(403, { message: "Invaliidne CSRF token." });
  }
  return next();
});
