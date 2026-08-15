import { murmur3 } from "./murmur3";
import type { ExperimentConfig } from "./kv-config";

export interface Bucketed {
  variant: string;
  content: Record<string, unknown>;
}

/**
 * A pure function of (experiment key, salt, visitor id) — same visitor, same experiment,
 * same answer forever, computed independently on whichever edge location handles the
 * request, with no state and no coordination between locations. Two independent hashes
 * keep the two questions separate: whether the visitor is in the experiment at all, and
 * which variant they land in if so. Sharing one hash for both would correlate inclusion
 * with variant assignment, which biases the split.
 *
 * Returns null when the visitor isn't part of the experiment (below the traffic
 * percentage) — the caller omits the experiment from its response rather than treating
 * this as an error, so the visitor sees default content for it.
 */
export function bucketVisitor(config: ExperimentConfig, visitorId: string): Bucketed | null {
  const inclusionPoint = murmur3(`inc:${config.key}:${config.salt}:${visitorId}`) % 10000;
  if (inclusionPoint >= config.trafficBp) {
    return null;
  }

  const variantPoint = murmur3(`var:${config.key}:${config.salt}:${visitorId}`) % 10000;
  let upperBound = 0;
  // Non-null: `experimentConfigSchema` requires at least one variant, and this config
  // already passed that schema to get here. TS can't see that invariant through the
  // array type, but the loop below always overwrites this before it's read.
  let lastVariant = config.variants[0]!;
  for (const variant of config.variants) {
    lastVariant = variant;
    upperBound += variant.weightBp;
    if (variantPoint < upperBound) {
      return { variant: variant.key, content: variant.content };
    }
  }

  // Only reachable if the weights don't sum to 10000, which the Config worker's write-time
  // validation is supposed to prevent. Falling back to the last variant rather than
  // throwing keeps a data problem elsewhere from taking down the assignment hot path.
  return { variant: lastVariant.key, content: lastVariant.content };
}
