import { z } from "@hono/zod-openapi";

export const resultsQuerySchema = z.object({
  goal: z.string().min(1),
});
export type ResultsQuery = z.infer<typeof resultsQuerySchema>;

const confidenceIntervalSchema = z.object({
  lower: z.number(),
  upper: z.number(),
});

const variantResultSchema = z.object({
  key: z.string(),
  isControl: z.boolean(),
  exposures: z.number().int(),
  conversions: z.number().int(),
  rate: z.number(),
  confidenceInterval: confidenceIntervalSchema,
  /** Null for the control variant itself — there's nothing to compare it against. */
  lift: z.number().nullable(),
  pValue: z.number().nullable(),
  significant: z.boolean().nullable(),
});
export type VariantResult = z.infer<typeof variantResultSchema>;

const srmSchema = z.object({
  chiSquared: z.number(),
  degreesOfFreedom: z.number().int(),
  detected: z.boolean(),
});

export const resultsResponseSchema = z.object({
  goal: z.string(),
  variants: z.array(variantResultSchema),
  srm: srmSchema,
});
export type ResultsResponse = z.infer<typeof resultsResponseSchema>;
