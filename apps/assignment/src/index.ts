import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Env } from "./env";

/**
 * Assignment — the only Worker on the critical page-render path (docs/DESIGN.md §3.2,
 * §3.5). It reads KV and nothing else: no D1, no Durable Objects, no calls to the other
 * Worker. That's enforced by this app having no bindings for them, not just by convention
 * — deployed separately (isolation of the assignment path, §3.2) from apps/control-plane
 * so a bug or bad deploy there can never affect this bundle.
 *
 * GET /v1/assign lands with the bucketing algorithm (§5.1).
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
