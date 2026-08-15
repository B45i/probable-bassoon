import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { jsonContent } from "../../lib/http";
import { attachKv } from "../../lib/kv";
import { ASSIGN_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { assignQuerySchema, assignResponseSchema } from "./schemas";

export const assignRoutes = new OpenAPIHono<AppEnv>();
assignRoutes.use("*", attachKv);

const assignRoute = createRoute({
  method: "get",
  path: ASSIGN_PATHS.assign,
  // Open to any origin — the snippet runs on arbitrary customer domains, not just one
  // known site. A GET with no custom headers is already a CORS "simple request" that
  // never triggers a preflight; this only adds the response header a page's own JS needs
  // to be allowed to read the body, it doesn't add a request to the hot path.
  middleware: [cors({ origin: "*" })] as const,
  request: { query: assignQuerySchema },
  responses: {
    200: {
      description: "Assignments for the requested experiments (experiments the visitor isn't part of are omitted)",
      content: jsonContent(assignResponseSchema),
    },
  },
});

assignRoutes.openapi(assignRoute, async (c) => {
  const { site_key, visitor_id, experiments } = c.req.valid("query");
  const result = await handlers.assign({
    kv: c.get("kv"),
    siteKey: site_key,
    visitorId: visitor_id,
    experimentKeys: experiments,
  });
  return c.json(result.body, result.status);
});
