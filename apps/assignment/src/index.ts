import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

/**
 * Assignment — the only Worker on the critical page-render path: every visitor hits this
 * on every page load, with a hard latency budget. It reads KV and nothing else — no D1,
 * no Durable Objects, no calls to the other Worker. That's enforced by this app having no
 * bindings for them, not just by convention — deployed as its own Worker, separate from
 * apps/control-plane, so a bug or bad deploy in the low-stakes admin/tracking surface can
 * never affect this bundle or add latency to it.
 *
 * `Env` comes from the ambient `declare global` in ./env.d.ts — no import needed.
 *
 * GET /v1/assign lands with the bucketing algorithm.
 */
const app = new OpenAPIHono<{ Bindings: Env }>();

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: {
      description: "Liveness check",
      content: {
        "application/json": {
          schema: z.object({ ok: z.literal(true) }),
        },
      },
    },
  },
});

app.openapi(healthRoute, (c) => c.json({ ok: true as const }));

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "AB Tester — Assignment", version: "0.0.0" },
});

export default app;
