import { z } from "@hono/zod-openapi";

export const trackingQuerySchema = z.object({
  /** The site's public key, same query-param placement and CORS reasoning as
   * Assignment's `site_key` — this path is hit via `sendBeacon` from arbitrary customer
   * origins too. */
  site_key: z.string().min(1),
});
export type TrackingQuery = z.infer<typeof trackingQuerySchema>;

export const exposureBodySchema = z.object({
  visitor_id: z.string().min(1),
  experiment: z.string().min(1),
  variant: z.string().min(1),
});
export type ExposureBody = z.infer<typeof exposureBodySchema>;

export const conversionBodySchema = z.object({
  visitor_id: z.string().min(1),
  goal: z.string().min(1),
});
export type ConversionBody = z.infer<typeof conversionBodySchema>;
