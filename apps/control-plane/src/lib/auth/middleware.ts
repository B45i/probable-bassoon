import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../../types";
import { verifyAuthToken } from "./jwt";

const BEARER_PREFIX = "Bearer ";

/** Applied to any route that needs a logged-in user — verifies the bearer token's
 * signature and sets the claims it carries on context (AppEnv's Variables), or
 * short-circuits with 401. No D1 or KV lookup: the JWT is self-describing, so this is
 * pure computation. Doesn't check site ownership itself; that's a per-route concern (a
 * token proves *who* you are, not which sites you own — each resource's handlers.ts
 * checks ownership against the site/experiment it's actually touching). */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("authorization");
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await verifyAuthToken(token, c.env.JWT_SECRET);
    c.set("user", { id: payload.sub, email: payload.email, createdAt: payload.createdAt });
  } catch {
    // Covers everything hono/jwt's verify() throws for — expired, mis-signed, malformed
    // — plus our own shape check in verifyAuthToken. All of it is just "not a valid
    // session" from the caller's point of view.
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
