import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { jsonContent } from "../../lib/http";
import { attachDb } from "../../lib/db";
import { attachExposures } from "../../lib/exposures";
import { EVENTS_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { conversionBodySchema, exposureBodySchema, trackingQuerySchema } from "./schemas";

export const trackingRoutes = new OpenAPIHono<AppEnv>();
// `.use("*", ...)`, not `createRoute({ middleware: [...] })`: this needs to run for the
// preflight OPTIONS request too, not just the POST these routes actually declare.
// `sendBeacon` with a JSON body isn't a CORS "simple request" the way Assignment's plain
// GET is, so — unlike Assignment — a real preflight round trip does happen here. That's
// fine: this path has no latency requirement to protect (fire-and-forget, async), unlike
// Assignment's page-render-blocking GET.
trackingRoutes.use("*", cors({ origin: "*" }));
trackingRoutes.use("*", attachDb);
trackingRoutes.use("*", attachExposures);

const exposureRoute = createRoute({
  method: "post",
  path: EVENTS_PATHS.exposure,
  request: {
    query: trackingQuerySchema,
    body: { content: jsonContent(exposureBodySchema) },
  },
  responses: {
    202: { description: "Recorded (or silently dropped if the site/experiment aren't recognized)" },
  },
});

trackingRoutes.openapi(exposureRoute, async (c) => {
  const { site_key } = c.req.valid("query");
  const { visitor_id, experiment, variant } = c.req.valid("json");
  const result = await handlers.recordExposure({
    exposures: c.get("exposures"),
    siteKey: site_key,
    experiment,
    variant,
    visitorId: visitor_id,
  });
  return c.body(null, result.status);
});

const conversionRoute = createRoute({
  method: "post",
  path: EVENTS_PATHS.conversion,
  request: {
    query: trackingQuerySchema,
    body: { content: jsonContent(conversionBodySchema) },
  },
  responses: {
    202: { description: "Recorded" },
  },
});

trackingRoutes.openapi(conversionRoute, async (c) => {
  const { site_key } = c.req.valid("query");
  const { visitor_id, goal } = c.req.valid("json");
  const result = await handlers.recordConversion({
    db: c.get("db"),
    siteKey: site_key,
    visitorId: visitor_id,
    goal,
  });
  return c.body(null, result.status);
});
