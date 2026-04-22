// Admin-vaate kontroller: login, logout, broneeringute nimekiri.
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { config } from "~/config";
import { requireAdmin } from "~/middleware/auth";
import { requireCsrf } from "~/middleware/csrf";
import { SESSION_COOKIE, type SessionContext } from "~/middleware/session";
import { verifyAdminCredentials } from "~/models/admin.model";
import { listBookings } from "~/models/booking.model";
import { createSession, deleteSession } from "~/models/session.model";
import { AdminBookingsPage } from "~/views/admin-bookings";
import { AdminLoginPage } from "~/views/admin-login";

export const adminController = new Hono<SessionContext>();

// GET /admin/login — login vorm
adminController.get("/login", (c) => {
  const userId = c.get("userId");
  if (userId) return c.redirect("/admin/bookings");
  return c.html(<AdminLoginPage csrfToken={c.get("csrfToken")} error={null} />);
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

// POST /admin/login — kontrolli paroole, loo sessioon
adminController.post("/login", requireCsrf, async (c) => {
  const form = await c.req.parseBody();
  const parsed = loginSchema.safeParse(form);

  if (!parsed.success) {
    return c.html(
      <AdminLoginPage
        csrfToken={c.get("csrfToken")}
        error="Palun sisesta kasutajanimi ja parool."
      />,
      400 as ContentfulStatusCode,
    );
  }

  const user = await verifyAdminCredentials(parsed.data.username, parsed.data.password);
  if (!user) {
    return c.html(
      <AdminLoginPage csrfToken={c.get("csrfToken")} error="Vale kasutajanimi või parool." />,
      401 as ContentfulStatusCode,
    );
  }

  const session = await createSession(user.id);
  setCookie(c, SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "Lax",
    path: "/",
    expires: session.expires_at,
  });
  return c.redirect("/admin/bookings");
});

// POST /admin/logout — tühjenda sessioon
adminController.post("/logout", requireCsrf, async (c) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) await deleteSession(sid);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.redirect("/");
});

// GET /admin/bookings — broneeringute loend (kaitstud)
adminController.get("/bookings", requireAdmin, async (c) => {
  const userId = c.get("userId");
  if (userId === null) return c.redirect("/admin/login");
  const date = c.req.query("date") || null;
  const bookings = await listBookings({ date });
  return c.html(<AdminBookingsPage bookings={bookings} selectedDate={date} userId={userId} />);
});
