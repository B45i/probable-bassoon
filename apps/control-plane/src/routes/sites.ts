import { createDb, sites, type NewSite } from "@ab-tester/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { toHex } from "../lib/auth/encoding";
import { requireAuth } from "../lib/auth/middleware";
import type { AppEnv } from "../types";

const app = new OpenAPIHono<AppEnv>();
app.use("*", requireAuth);

const siteResponse = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  ownerUserId: z.string(),
});

const createSiteRoute = createRoute({
  method: "post",
  path: "/",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: z.object({ name: z.string().min(1).max(200) }) } } },
  },
  responses: {
    201: { description: "Site created", content: { "application/json": { schema: siteResponse } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ error: z.string() }) } } },
  },
});

app.openapi(createSiteRoute, async (c) => {
  const { name } = c.req.valid("json");
  const owner = c.get("user");
  const db = createDb(c.env.DB);

  // Public, ships in the browser snippet (docs/DESIGN.md §3.5) — not a secret, so no
  // hashing here, unlike sessions/passwords. Prefixed the way Stripe-style keys are, so
  // it's recognizable in logs/devtools as what it is.
  const newSite: NewSite = {
    ownerUserId: owner.id,
    name,
    apiKey: `site_${toHex(crypto.getRandomValues(new Uint8Array(24)))}`,
  };
  const [created] = await db.insert(sites).values(newSite).returning();
  if (!created) {
    throw new Error("Site insert returned no row");
  }

  return c.json(
    { id: created.id, name: created.name, apiKey: created.apiKey, ownerUserId: created.ownerUserId },
    201,
  );
});

const listSitesRoute = createRoute({
  method: "get",
  path: "/",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Sites owned by the authenticated user",
      content: { "application/json": { schema: z.array(siteResponse) } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ error: z.string() }) } } },
  },
});

app.openapi(listSitesRoute, async (c) => {
  const owner = c.get("user");
  const db = createDb(c.env.DB);
  const rows = await db.select().from(sites).where(eq(sites.ownerUserId, owner.id));
  return c.json(
    rows.map((row) => ({ id: row.id, name: row.name, apiKey: row.apiKey, ownerUserId: row.ownerUserId })),
    200,
  );
});

export default app;
