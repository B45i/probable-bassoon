import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/auth/middleware";
import { attachDb } from "../../lib/db";
import { attachExposures } from "../../lib/exposures";
import { BEARER_AUTH, errorResponseSpec, jsonContent } from "../../lib/http";
import { EXPERIMENT_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { resultsQuerySchema, resultsResponseSchema } from "./schemas";

// Mounted at the same EXPERIMENT_BASE as routes/experiments' byKeyRoutes — both are
// `/v1/sites/:siteId/experiments/:key/*`, and Hono allows more than one sub-app on the
// same mount point as long as their relative paths don't collide (`/status` vs
// `/results` here).
export const resultsRoutes = new OpenAPIHono<AppEnv>();
resultsRoutes.use("*", attachDb);
resultsRoutes.use("*", attachExposures);

const getResultsRoute = createRoute({
  method: "get",
  path: EXPERIMENT_PATHS.results,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ siteId: z.string(), key: z.string() }),
    query: resultsQuerySchema,
  },
  responses: {
    200: { description: "Per-variant results for the given goal", content: jsonContent(resultsResponseSchema) },
    404: errorResponseSpec("Site or experiment not found"),
  },
});

resultsRoutes.openapi(getResultsRoute, async (c) => {
  const { siteId, key } = c.req.valid("param");
  const { goal } = c.req.valid("query");
  const result = await handlers.getResults({
    db: c.get("db"),
    exposures: c.get("exposures"),
    siteId,
    ownerUserId: c.get("user").id,
    key,
    goal,
  });
  return result.status === 200 ? c.json(result.body, 200) : c.json(result.body, 404);
});
