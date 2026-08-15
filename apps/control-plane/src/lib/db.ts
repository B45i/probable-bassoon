import { createDb } from "@ab-tester/db";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Attaches a Drizzle client to context once per request, so route wiring reads
 * `c.get("db")` instead of every handler call site re-wrapping `c.env.DB` itself. */
export const attachDb = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});
