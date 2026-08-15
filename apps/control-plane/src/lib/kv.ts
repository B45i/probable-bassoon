import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Attaches the config KV binding to context once per request — same reasoning as
 * lib/db.ts's attachDb. Only routes/experiments uses this; nothing else in this Worker
 * writes to KV. */
export const attachKv = createMiddleware<AppEnv>(async (c, next) => {
  c.set("kv", c.env.EXPERIMENT_CONFIG);
  await next();
});
