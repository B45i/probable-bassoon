import { z } from "@hono/zod-openapi";

export const assignQuerySchema = z.object({
  /** The site's public key, not its internal D1 id — this Worker never has D1 access to
   * translate one into the other, and doesn't need to: the KV key is built from this
   * directly. Travels as a query param rather than a header so the request stays a CORS
   * "simple request" (no preflight round trip) for arbitrary customer origins. */
  site_key: z.string().min(1),
  visitor_id: z.string().min(1),
  /** Comma-separated experiment keys, e.g. `hero_copy,pricing_cta`. */
  experiments: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean),
    ),
});
export type AssignQuery = z.infer<typeof assignQuerySchema>;

const assignmentSchema = z.object({
  experiment: z.string(),
  variant: z.string(),
  content: z.record(z.string(), z.unknown()),
});

export const assignResponseSchema = z.object({
  // Experiments the visitor isn't part of (unknown key, not running, below the traffic
  // percentage, or a malformed KV entry) are simply absent here rather than erroring —
  // absence means "show default content" for that experiment.
  assignments: z.array(assignmentSchema),
});
export type AssignResponse = z.infer<typeof assignResponseSchema>;
