import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Attaches the config KV binding to context once per request, so handlers read
 * `c.get("kv")` instead of reaching into `c.env` themselves. */
export const attachKv = createMiddleware<AppEnv>(async (c, next) => {
  c.set("kv", c.env.EXPERIMENT_CONFIG);
  await next();
});
