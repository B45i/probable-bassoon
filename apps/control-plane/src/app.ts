import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

// `Env` comes from the ambient `declare global` in ./env.d.ts — no import needed.
//
// Deliberately separate from index.ts (the Worker entry point, which also exports the
// ExperimentExposures Durable Object): scripts/generate-openapi.ts imports this file
// under plain Node via tsx, and the DO's `cloudflare:workers` import only resolves
// inside the actual Workers runtime.
//
// Routers for tracking (POST /v1/events/*), config (POST /v1/experiments/*), and results
// (GET /v1/experiments/:key/results) land with their respective implementations —
// see docs/DESIGN.md Appendix A for the full contract.
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
  info: { title: "AB Tester — Control Plane", version: "0.0.0" },
});

export default app;
