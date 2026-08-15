import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/auth/middleware";
import { attachDb } from "../../lib/db";
import { attachKv } from "../../lib/kv";
import { BEARER_AUTH, errorResponseSpec, jsonContent } from "../../lib/http";
import { EXPERIMENT_PATHS, EXPERIMENTS_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { createExperimentBodySchema, experimentResponseSchema, setStatusBodySchema } from "./schemas";

// Two apps, not one — see routes/paths.ts's EXPERIMENTS_BASE/EXPERIMENT_BASE comment for
// why (an @hono/zod-openapi limitation, not a routing need): every path param has to
// live in the mount prefix, so "collection" (create) and "by key" (status, and later
// generate/results) can't share a single mount point once status needs its own `:key`.

const siteIdParam = z.object({ siteId: z.string() });

export const collectionRoutes = new OpenAPIHono<AppEnv>();
collectionRoutes.use("*", attachDb);
collectionRoutes.use("*", attachKv);

const createExperimentRoute = createRoute({
  method: "post",
  path: EXPERIMENTS_PATHS.root,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  request: {
    params: siteIdParam,
    body: { content: jsonContent(createExperimentBodySchema) },
  },
  responses: {
    201: { description: "Experiment created", content: jsonContent(experimentResponseSchema) },
    404: errorResponseSpec("Site not found"),
    409: errorResponseSpec("Experiment key already exists for this site"),
  },
});

collectionRoutes.openapi(createExperimentRoute, async (c) => {
  const { siteId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await handlers.createExperiment({
    db: c.get("db"),
    kv: c.get("kv"),
    siteId,
    ownerUserId: c.get("user").id,
    ...body,
  });
  if (result.status === 201) return c.json(result.body, 201);
  if (result.status === 404) return c.json(result.body, 404);
  return c.json(result.body, 409);
});

export const byKeyRoutes = new OpenAPIHono<AppEnv>();
byKeyRoutes.use("*", attachDb);
byKeyRoutes.use("*", attachKv);

const setStatusRoute = createRoute({
  method: "post",
  path: EXPERIMENT_PATHS.status,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  request: {
    params: siteIdParam.extend({ key: z.string() }),
    body: { content: jsonContent(setStatusBodySchema) },
  },
  responses: {
    200: { description: "Status updated", content: jsonContent(experimentResponseSchema) },
    404: errorResponseSpec("Site or experiment not found"),
  },
});

byKeyRoutes.openapi(setStatusRoute, async (c) => {
  const { siteId, key } = c.req.valid("param");
  const { status } = c.req.valid("json");
  const result = await handlers.setExperimentStatus({
    db: c.get("db"),
    kv: c.get("kv"),
    siteId,
    key,
    ownerUserId: c.get("user").id,
    status,
  });
  return result.status === 200 ? c.json(result.body, 200) : c.json(result.body, 404);
});
