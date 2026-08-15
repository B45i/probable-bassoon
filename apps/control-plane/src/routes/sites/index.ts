import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/auth/middleware";
import { attachDb } from "../../lib/db";
import { BEARER_AUTH, jsonContent, UNAUTHORIZED_RESPONSE } from "../../lib/http";
import { SITES_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { createSiteBodySchema, siteResponseSchema } from "./schemas";

const app = new OpenAPIHono<AppEnv>();
app.use("*", attachDb);

const createSiteRoute = createRoute({
  method: "post",
  path: SITES_PATHS.root,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  request: { body: { content: jsonContent(createSiteBodySchema) } },
  responses: {
    201: { description: "Site created", content: jsonContent(siteResponseSchema) },
    401: UNAUTHORIZED_RESPONSE,
  },
});

app.openapi(createSiteRoute, async (c) => {
  const { name } = c.req.valid("json");
  const result = await handlers.createSite({ db: c.get("db"), ownerUserId: c.get("user").id, name });
  return c.json(result.body, 201);
});

const listSitesRoute = createRoute({
  method: "get",
  path: SITES_PATHS.root,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Sites owned by the authenticated user",
      content: jsonContent(z.array(siteResponseSchema)),
    },
    401: UNAUTHORIZED_RESPONSE,
  },
});

app.openapi(listSitesRoute, async (c) => {
  const result = await handlers.listSites({ db: c.get("db"), ownerUserId: c.get("user").id });
  return c.json(result.body, 200);
});

export default app;
