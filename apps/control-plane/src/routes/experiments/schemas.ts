import { z } from "@hono/zod-openapi";

const variantInputSchema = z.object({
  key: z.string().min(1).max(100),
  /** Basis points; fixed while running and must sum to 10000 across all variants. */
  weightBp: z.number().int().min(0).max(10000),
  isControl: z.boolean(),
  content: z.record(z.string(), z.unknown()),
});

// Lowercase letters, numbers, hyphens, and underscores only — this isn't just a display
// label, it's embedded directly into a live `<script data-experiments="...">` attribute
// on a customer's own site and sent as a query string on every `/v1/assign` call, so it
// needs to actually behave like an identifier. Both separators are allowed, not just
// one — this codebase's own examples throughout docs/DESIGN.md and the test suite use
// snake_case ("hero_copy"), so a hyphen-only pattern would reject the project's own
// established convention, not just enforce a new one. The UI enforces the same pattern
// before ever submitting, but this is the layer that actually has to hold — anything
// that can call this endpoint directly (curl, a future integration) bypasses
// client-side validation entirely.
const EXPERIMENT_KEY_PATTERN = /^[a-z0-9]+([_-][a-z0-9]+)*$/;

export const createExperimentBodySchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(100)
      .regex(EXPERIMENT_KEY_PATTERN, "Lowercase letters, numbers, hyphens, and underscores only"),
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
