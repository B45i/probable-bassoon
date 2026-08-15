import type { Experiment, Variant } from "@ab-tester/db";
import type { ExperimentConfig } from "@ab-tester/shared";
import type { ExperimentResponse } from "./schemas";

function toVariantContent(content: unknown): Record<string, unknown> {
  // Drizzle's `mode: "json"` column has no static shape (packages/db/src/schema.ts) —
  // it round-trips through D1 as opaque JSON either way, so this is a cast, not a
  // runtime check. Variant content is arbitrary author-supplied JSON (headline/CTA text
  // and whatever else a variant needs), serialized the same way whether it's headed to
  // an API response or to KV.
  return content as Record<string, unknown>;
}

/** What the admin API returns. */
export function toExperimentResponse(experiment: Experiment, variants: Variant[]): ExperimentResponse {
  return {
    id: experiment.id,
    siteId: experiment.siteId,
    key: experiment.key,
    version: experiment.version,
    status: experiment.status,
    trafficBp: experiment.trafficBp,
    createdAt: experiment.createdAt.toISOString(),
    variants: variants.map((v) => ({
      id: v.id,
      key: v.key,
      weightBp: v.weightBp,
      isControl: v.isControl,
      content: toVariantContent(v.content),
    })),
  };
}

/** What gets written through to KV — deliberately not the same shape as the API
 * response: this carries `salt` (Assignment needs it to compute the bucketing hash,
 * nothing admin-facing does) and drops `id`/`siteId`/`createdAt` (Assignment addresses
 * an experiment by site key + experiment key, not by internal row id, so those fields
 * have no reader). */
export function toExperimentConfig(experiment: Experiment, variants: Variant[]): ExperimentConfig {
  return {
    key: experiment.key,
    version: experiment.version,
    salt: experiment.salt,
    status: experiment.status,
    trafficBp: experiment.trafficBp,
    variants: variants.map((v) => ({
      key: v.key,
      weightBp: v.weightBp,
      isControl: v.isControl,
      content: toVariantContent(v.content),
    })),
  };
}
