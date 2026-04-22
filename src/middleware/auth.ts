// Admin-vaate valvur: suuna login-lehele, kui sessioon puudub.
import { createMiddleware } from "hono/factory";
import type { SessionContext } from "~/middleware/session";

export const requireAdmin = createMiddleware<SessionContext>(async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.redirect("/admin/login");
  }
  return next();
});
