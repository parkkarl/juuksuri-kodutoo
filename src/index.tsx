// Rakenduse sisenemispunkt: seadistab Hono äpi, middleware'id, marsruudid.
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { config } from "~/config";
import { adminController } from "~/controllers/admin.controller";
import { publicController } from "~/controllers/public.controller";
import { requestLogger } from "~/middleware/logger";
import { securityHeaders } from "~/middleware/security-headers";
import { type SessionContext, loadSession } from "~/middleware/session";
import { purgeExpiredSessions } from "~/models/session.model";
import { ErrorPage } from "~/views/error-page";

const app = new Hono<SessionContext>();

app.use("*", requestLogger);
app.use("*", securityHeaders);
app.use(
  "/static/*",
  serveStatic({ root: "./public", rewriteRequestPath: (p) => p.replace(/^\/static/, "") }),
);
app.use("*", loadSession);

app.route("/", publicController);
app.route("/admin", adminController);

app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.onError((err, c) => {
  console.error("[error]", err);
  if (err instanceof HTTPException) {
    const res = err.getResponse();
    // Kui HTMLi tüüpi aktsepteeritakse, renderda UI-viga
    if (c.req.header("accept")?.includes("text/html")) {
      return c.html(
        <ErrorPage status={res.status} message={err.message} />,
        res.status as ContentfulStatusCode,
      );
    }
    return res;
  }
  return c.html(
    <ErrorPage status={500} message="Ootamatu viga. Palun proovi hiljem uuesti." />,
    500 as ContentfulStatusCode,
  );
});

app.notFound((c) => {
  if (c.req.header("accept")?.includes("text/html")) {
    return c.html(
      <ErrorPage status={404} message="Lehte ei leitud." />,
      404 as ContentfulStatusCode,
    );
  }
  return c.text("Not found", 404);
});

// Aegunud sessioonide periodiline puhastamine (iga tund)
setInterval(
  () => {
    purgeExpiredSessions().catch((err) => console.error("[sessions] purge failed:", err));
  },
  60 * 60 * 1000,
);

console.log(`Server kuulab pordil ${config.port} (${config.nodeEnv})`);

export default {
  port: config.port,
  fetch: app.fetch,
};
