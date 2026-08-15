import { z } from "@hono/zod-openapi";

const variantInputSchema = z.object({
  key: z.string().min(1).max(100),
  /** Basis points; fixed while running and must sum to 10000 across all variants. */
  weightBp: z.number().int().min(0).max(10000),
  isControl: z.boolean(),
  content: z.record(z.string(), z.unknown()),
});

export const createExperimentBodySchema = z
  .object({
    key: z.string().min(1).max(100),
    /** Basis points, 10000 = 100%. Once an experiment is running, this may only
     * increase, never decrease — moving a live split's boundaries reassigns visitors
     * who were already bucketed. Not enforced here, that invariant belongs to the
     * status/traffic-change endpoint, since it only applies to an existing running
     * experiment, not creation. */
    trafficBp: z.number().int().min(0).max(10000).default(10000),
    variants: z.array(variantInputSchema).min(2).max(20),
  })
  .refine((body) => body.variants.reduce((sum, v) => sum + v.weightBp, 0) === 10000, {
    message: "variant weights must sum to 10000",
    path: ["variants"],
  })
  .refine((body) => body.variants.filter((v) => v.isControl).length === 1, {
    message: "exactly one variant must be the control",
    path: ["variants"],
  })
  .refine((body) => new Set(body.variants.map((v) => v.key)).size === body.variants.length, {
    message: "variant keys must be unique within an experiment",
    path: ["variants"],
  });
export type CreateExperimentBody = z.infer<typeof createExperimentBodySchema>;

const variantResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  weightBp: z.number().int(),
  isControl: z.boolean(),
  content: z.record(z.string(), z.unknown()),
});

export const experimentResponseSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  key: z.string(),
  version: z.number().int(),
  status: z.enum(["draft", "running", "paused", "archived"]),
  trafficBp: z.number().int(),
  createdAt: z.iso.datetime(),
  variants: z.array(variantResponseSchema),
});
export type ExperimentResponse = z.infer<typeof experimentResponseSchema>;

// Only the two transitions an author actually drives from here — running to launch,
// paused as the kill switch. Not the full draft | running | paused | archived state
// machine: draft is create's job, archived isn't reachable from anywhere yet.
export const setStatusBodySchema = z.object({
  status: z.enum(["running", "paused"]),
});
export type SetStatusBody = z.infer<typeof setStatusBodySchema>;
