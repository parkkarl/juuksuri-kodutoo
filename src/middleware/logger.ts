// Lihtne päringulogija — kirjutab stdoutile meetodi, tee ja olekukoodi.
import { createMiddleware } from "hono/factory";

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`,
  );
});
