import { conversions, experiments, sites, type Database } from "@ab-tester/db";
import { srmCheck, twoProportionZTest, wilsonInterval } from "@ab-tester/shared";
import { and, eq } from "drizzle-orm";
import type { ExperimentExposures } from "../../durable-objects/experiment-exposures";
import type { ErrorBody } from "../../lib/http";
import { isOwnedBy, SITE_NOT_FOUND } from "../../lib/ownership";
import type { ResultsResponse, VariantResult } from "./schemas";

/** Below this many exposures, a variant's rate is too noisy to act on regardless of what
 * the p-value says — an arbitrary but documented floor, not derived from a power
 * analysis of any particular experiment (this system doesn't ask for an expected effect
 * size or baseline rate up front, so it has nothing to run one against). Both the
 * control and the variant being compared need to clear it before `significant` can be
 * true, even when `pValue` alone would already read as significant. */
const MIN_SAMPLE_SIZE = 100;

const SIGNIFICANCE_THRESHOLD = 0.05;

interface GetResultsInput {
  db: Database;
  exposures: DurableObjectNamespace<ExperimentExposures>;
  siteId: string;
  ownerUserId: string;
  key: string;
  /** When omitted, every conversion recorded for the site counts — see schemas.ts. */
  goal?: string;
}

type GetResultsResult = { status: 200; body: ResultsResponse } | { status: 404; body: ErrorBody };

export async function getResults(input: GetResultsInput): Promise<GetResultsResult> {
  const { db, exposures, siteId, ownerUserId, key, goal } = input;

  const [site, experiment] = await Promise.all([
    db
      .select()
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1)
      .then((rows) => rows[0]),
    db.query.experiments.findFirst({
      where: and(eq(experiments.siteId, siteId), eq(experiments.key, key)),
      with: { variants: true },
    }),
  ]);

  if (!isOwnedBy(site, ownerUserId)) {
    return SITE_NOT_FOUND;
  }
  if (!experiment) {
    return { status: 404, body: { error: "Experiment not found" } };
  }

  // Same name the exposure-recording side builds (routes/tracking/handlers.ts) — the
  // object was never looked up by id, so it can't be looked up by id here either.
  const stub = exposures.get(exposures.idFromName(`${site.apiKey}:${key}`));

  const [exposureRows, conversionRows] = await Promise.all([
    stub.getExposures(),
    db
      .select()
      .from(conversions)
      .where(goal ? and(eq(conversions.siteKey, site.apiKey), eq(conversions.goalKey, goal)) : eq(conversions.siteKey, site.apiKey)),
  ]);

  // Attribution (D4): a conversion only counts toward an experiment if it happened after
  // the visitor was exposed. Exposures live in the Durable Object, conversions in D1 —
  // cross-referenced here in application code rather than a single query, since the two
  // never shared a store to join within.
  const convertedAt = new Map<string, number>();
  for (const row of conversionRows) {
    convertedAt.set(row.visitorId, row.firstTs.getTime());
  }

  const exposureCounts = new Map<string, number>();
  const conversionCounts = new Map<string, number>();
  for (const variant of experiment.variants) {
    exposureCounts.set(variant.key, 0);
    conversionCounts.set(variant.key, 0);
  }
  for (const exposure of exposureRows) {
    exposureCounts.set(exposure.variantKey, (exposureCounts.get(exposure.variantKey) ?? 0) + 1);
    const convertedTs = convertedAt.get(exposure.visitorId);
    if (convertedTs !== undefined && convertedTs >= exposure.firstTs) {
      conversionCounts.set(exposure.variantKey, (conversionCounts.get(exposure.variantKey) ?? 0) + 1);
    }
  }

  const control = experiment.variants.find((variant) => variant.isControl);
  const controlExposures = control ? (exposureCounts.get(control.key) ?? 0) : 0;
  const controlConversions = control ? (conversionCounts.get(control.key) ?? 0) : 0;
  const controlRate = controlExposures === 0 ? 0 : controlConversions / controlExposures;

  const variantResults: VariantResult[] = experiment.variants.map((variant) => {
    const variantExposures = exposureCounts.get(variant.key) ?? 0;
    const variantConversions = conversionCounts.get(variant.key) ?? 0;
    const rate = variantExposures === 0 ? 0 : variantConversions / variantExposures;
    const confidenceInterval = wilsonInterval(variantConversions, variantExposures);

    if (variant.isControl) {
      return {
        key: variant.key,
        isControl: true,
        exposures: variantExposures,
        conversions: variantConversions,
        rate,
        confidenceInterval,
        lift: null,
        pValue: null,
        significant: null,
      };
    }

    const { pValue } = twoProportionZTest(controlConversions, controlExposures, variantConversions, variantExposures);
    // Relative lift is undefined, not zero, when the control converted nobody — there's
    // no baseline to move relative to.
    const lift = controlConversions === 0 ? null : (rate - controlRate) / controlRate;
    const significant =
      pValue < SIGNIFICANCE_THRESHOLD && controlExposures >= MIN_SAMPLE_SIZE && variantExposures >= MIN_SAMPLE_SIZE;

    return {
      key: variant.key,
      isControl: false,
      exposures: variantExposures,
      conversions: variantConversions,
      rate,
      confidenceInterval,
      lift,
      pValue,
      significant,
    };
  });

  const srm = srmCheck(
    experiment.variants.map((variant) => exposureCounts.get(variant.key) ?? 0),
    experiment.variants.map((variant) => variant.weightBp / 10000),
  );

  return { status: 200, body: { goal: goal ?? null, variants: variantResults, srm } };
}
