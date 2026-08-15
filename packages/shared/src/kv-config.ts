import { z } from "zod";

/**
 * The value stored in KV under an experiment's key. Config writes this through to KV
 * immediately after its D1 write; Assignment reads it directly on every request and
 * never touches D1 itself — the request-time hot path can't afford a database round
 * trip, so KV (globally replicated, fast local reads) is the only thing it's allowed to
 * depend on. This schema is the one contract that crosses the isolation boundary between
 * the two Workers — keep both sides on it rather than hand-rolling the shape twice.
 */
export const experimentConfigSchema = z.object({
  key: z.string(),
  version: z.number().int().positive(),
  salt: z.string(),
  status: z.enum(["draft", "running", "paused", "archived"]),
  /** Basis points, 10000 = 100%. May only increase while running — narrowing it would
   * drop visitors who were already included. */
  trafficBp: z.number().int().min(0).max(10000),
  variants: z
    .array(
      z.object({
        key: z.string(),
        /** Basis points; fixed while running and sums to 10000 across all variants. */
        weightBp: z.number().int().min(0).max(10000),
        isControl: z.boolean(),
        content: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
});

export type ExperimentConfig = z.infer<typeof experimentConfigSchema>;

/**
 * The KV key both sides have to agree on byte-for-byte. Built from the site's *public*
 * key, not its internal `site_id` — Assignment only ever has the public key from the
 * incoming request, since that's what the browser snippet sends, and it never touches
 * D1 to translate an id into one. Config is the only writer and must build this the same
 * way, using the site row it already has on hand from the ownership check.
 */
export function experimentConfigKey(siteKey: string, experimentKey: string): string {
  return `experiment:${siteKey}:${experimentKey}`;
}
