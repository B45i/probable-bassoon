import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { SNIPPET_SOURCE } from "./generated/snippet-source";
import { jsonContent } from "./lib/http";
import { assignRoutes } from "./routes/assign";
import { ASSIGN_BASE, HEALTH_PATH, SNIPPET_PATH } from "./routes/paths";
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

// Not part of the JSON API/OpenAPI surface — `app.get`, not `createRoute`/`.openapi()`.
// A plain `<script src>` load isn't subject to CORS the way `fetch`/XHR are, so this
// needs no CORS handling either, unlike every JSON route in this app. Cached at
// Cloudflare's own edge via these headers — the same network the rest of this system
// already runs on, not a separate CDN product. Short-ish `max-age` with a longer
// `stale-while-revalidate` means an edge location serves its cached copy instantly and
// refreshes it in the background, rather than a customer's page ever waiting on that
// refresh; unversioned on purpose, so a customer's embed code never needs to change to
// pick up a fix.
app.get(SNIPPET_PATH, (c) =>
  c.text(SNIPPET_SOURCE, 200, {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
  }),
);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "AB Tester — Assignment", version: "0.0.0" },
});

export default app;
