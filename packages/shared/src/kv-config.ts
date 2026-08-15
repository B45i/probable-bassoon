import { z } from "zod";

/**
 * The value stored in KV under an experiment's key. Config writes this through to KV
 * immediately after the D1 write (docs/DESIGN.md D2); Assignment reads it directly on
 * every request (D1, §5.1) and never touches D1 itself. This schema is the one contract
 * that crosses the isolation boundary between the two Workers — keep both sides on it
 * rather than hand-rolling the shape twice.
 */
export const experimentConfigSchema = z.object({
  key: z.string(),
  version: z.number().int().positive(),
  salt: z.string(),
  status: z.enum(["draft", "running", "paused", "archived"]),
  /** Basis points, 10000 = 100% (§5.1). May only increase while running (§5.3). */
  trafficBp: z.number().int().min(0).max(10000),
  variants: z
    .array(
      z.object({
        key: z.string(),
        /** Basis points; fixed while running and sums to 10000 across all variants (§5.3). */
        weightBp: z.number().int().min(0).max(10000),
        isControl: z.boolean(),
        content: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
});

export type ExperimentConfig = z.infer<typeof experimentConfigSchema>;
