import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "./lib/http";
import { AUTH_BASE, EVENTS_BASE, EXPERIMENT_BASE, EXPERIMENTS_BASE, HEALTH_PATH, SITES_BASE } from "./routes/paths";
import authRoutes from "./routes/auth";
import { byKeyRoutes as experimentByKeyRoutes, collectionRoutes as experimentCollectionRoutes } from "./routes/experiments";
import siteRoutes from "./routes/sites";
import { trackingRoutes } from "./routes/tracking";
import type { AppEnv } from "./types";

// `Env` comes from the ambient `declare global` in ./env.d.ts — no import needed.
//
// Deliberately separate from index.ts (the Worker entry point, which also exports the
// ExperimentExposures Durable Object): scripts/generate-openapi.ts imports this file
// under plain Node via tsx, and the DO's `cloudflare:workers` import only resolves
// inside the actual Workers runtime.
//
// Results (GET /v1/sites/:siteId/experiments/:key/results) lands with its own
// implementation. Everything else — auth, sites, experiment config, and tracking — is
// wired below.
const app = new OpenAPIHono<AppEnv>();

app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
});

const healthRoute = createRoute({
  method: "get",
  path: HEALTH_PATH,
  responses: {
    200: { description: "Liveness check", content: jsonContent(z.object({ ok: z.literal(true) })) },
  },
});

app.openapi(healthRoute, (c) => c.json({ ok: true as const }));

app.route(AUTH_BASE, authRoutes);
app.route(SITES_BASE, siteRoutes);
app.route(EXPERIMENTS_BASE, experimentCollectionRoutes);
app.route(EXPERIMENT_BASE, experimentByKeyRoutes);
app.route(EVENTS_BASE, trackingRoutes);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "AB Tester — Control Plane", version: "0.0.0" },
});

export default app;
