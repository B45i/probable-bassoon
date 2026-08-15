import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "./lib/http";
import { assignRoutes } from "./routes/assign";
import { ASSIGN_BASE, HEALTH_PATH } from "./routes/paths";
import type { AppEnv } from "./types";

/**
 * Assignment — the only Worker on the critical page-render path: every visitor hits this
 * on every page load, with a hard latency budget. It reads KV and nothing else — no D1,
 * no Durable Objects, no calls to the other Worker. That's enforced by this app having no
 * bindings for them, not just by convention — deployed as its own Worker, separate from
 * apps/control-plane, so a bug or bad deploy in the low-stakes admin/tracking surface can
 * never affect this bundle or add latency to it.
 *
 * `Env` comes from the ambient `declare global` in ./env.d.ts — no import needed.
 */
const app = new OpenAPIHono<AppEnv>();

const healthRoute = createRoute({
  method: "get",
  path: HEALTH_PATH,
  responses: {
    200: { description: "Liveness check", content: jsonContent(z.object({ ok: z.literal(true) })) },
  },
});

app.openapi(healthRoute, (c) => c.json({ ok: true as const }));

app.route(ASSIGN_BASE, assignRoutes);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "AB Tester — Assignment", version: "0.0.0" },
});

export default app;
