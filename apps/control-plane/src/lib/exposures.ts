import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Attaches the Durable Object namespace binding to context once per request — same
 * reasoning as lib/db.ts's attachDb and lib/kv.ts's attachKv. Deriving the specific
 * experiment's stub from it (`idFromName`, then `get`) is handler logic, not something
 * this middleware does — the same split as `kv`, where reading a specific key is the
 * handler's job, not the middleware's. */
export const attachExposures = createMiddleware<AppEnv>(async (c, next) => {
  c.set("exposures", c.env.EXPOSURES);
  await next();
});
