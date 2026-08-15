import { chiSquaredDistributionTable, cumulativeStdNormalProbability } from "simple-statistics";

/** Φ⁻¹(0.975) — the two-tailed critical value for a 95% confidence interval. A fixed,
 * well-known constant, not something computed: inverting the normal CDF needs its own
 * numerical approximation, and there's no need to carry that risk for a single constant
 * every statistics textbook already agrees on. */
const Z_95 = 1.959964;

export interface WilsonInterval {
  lower: number;
  upper: number;
}

/**
 * The Wilson score interval for a proportion — narrower and better-behaved than the
 * naive Wald interval (`p̂ ± z·SE`) at small sample sizes and extreme proportions, where
 * Wald can produce a bound outside [0, 1]. Reported per variant, at a fixed 95%
 * confidence level (the level the design doc's reporting section commits to; not
 * exposed as a parameter here since nothing in this system varies it per request).
 */
export function wilsonInterval(successes: number, trials: number): WilsonInterval {
  if (trials === 0) {
    return { lower: 0, upper: 0 };
  }
  const phat = successes / trials;
  const z2 = Z_95 * Z_95;
  const denominator = 1 + z2 / trials;
  const center = (phat + z2 / (2 * trials)) / denominator;
  const margin = (Z_95 * Math.sqrt((phat * (1 - phat)) / trials + z2 / (4 * trials * trials))) / denominator;
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

export interface TwoProportionZTest {
  z: number;
  pValue: number;
}

/**
 * Two-tailed two-proportion z-test, comparing a variant's conversion rate against
 * control's. Standard error uses the pooled proportion (the two groups' combined
 * conversion rate) rather than each group's own rate — the correct choice specifically
 * under the null hypothesis this test assumes, that both groups share one true rate.
 */
export function twoProportionZTest(controlSuccesses: number, controlTrials: number, variantSuccesses: number, variantTrials: number): TwoProportionZTest {
  if (controlTrials === 0 || variantTrials === 0) {
    return { z: 0, pValue: 1 };
  }
  const p1 = controlSuccesses / controlTrials;
  const p2 = variantSuccesses / variantTrials;
  const pooled = (controlSuccesses + variantSuccesses) / (controlTrials + variantTrials);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / controlTrials + 1 / variantTrials));
  if (standardError === 0) {
    // Both groups converted at 0% or 100% — no variance to test against.
    return { z: 0, pValue: 1 };
  }
  const z = (p2 - p1) / standardError;
  const pValue = 2 * (1 - cumulativeStdNormalProbability(Math.abs(z)));
  return { z, pValue };
}

/** Degrees of freedom this system can ever produce (variants are capped at 20 per
 * experiment — see routes/experiments/schemas.ts — so at most 19). Narrower than the
 * library's own table, which goes further; kept narrow here so a typo can't silently
 * request an unsupported df and fall through to `undefined`. */
type SupportedDegreesOfFreedom = Exclude<keyof typeof chiSquaredDistributionTable, 40 | 50 | 60 | 70 | 80 | 90 | 100>;

/** Stricter than the 0.05 used for the significance test on purpose: this check runs
 * automatically on every results request, not once as a deliberate hypothesis test, so
 * it needs a higher bar before crying wolf on ordinary sampling noise. 0.005 is the
 * strictest level in the reference table this library ships (sourced from Hines &
 * Montgomery's standard tables) — an even stricter threshold is common in practice, but
 * this is the tightest one available from a table that's actually been checked against
 * a citable source, rather than a value typed in from memory. */
const SRM_SIGNIFICANCE = 0.005;

export interface SrmResult {
  chiSquared: number;
  degreesOfFreedom: number;
  /** True when the observed exposure split deviates from the configured traffic split
   * more than chance alone would explain, at the SRM_SIGNIFICANCE threshold above. */
  detected: boolean;
}

/**
 * Sample Ratio Mismatch check — a Pearson chi-squared goodness-of-fit test comparing
 * actual exposure counts per variant against the split `weightBp` configured for them.
 * A mismatch means something upstream is wrong (a bucketing defect, a broken
 * integration, bot traffic skewing one variant) regardless of what the significance
 * test on conversion rate says — that's why this is checked independently rather than
 * folded into the lift/p-value numbers above.
 */
export function srmCheck(observedCounts: number[], expectedProportions: number[]): SrmResult {
  const total = observedCounts.reduce((sum, count) => sum + count, 0);
  const degreesOfFreedom = observedCounts.length - 1;

  if (total === 0 || degreesOfFreedom < 1) {
    // Nothing exposed yet, or only one variant to compare against itself — there's no
    // meaningful ratio to check.
    return { chiSquared: 0, degreesOfFreedom: Math.max(degreesOfFreedom, 0), detected: false };
  }

  let chiSquared = 0;
  for (let i = 0; i < observedCounts.length; i++) {
    const expected = total * (expectedProportions[i] ?? 0);
    if (expected > 0) {
      chiSquared += (observedCounts[i]! - expected) ** 2 / expected;
    }
  }

  const criticalValue = chiSquaredDistributionTable[degreesOfFreedom as SupportedDegreesOfFreedom]?.[SRM_SIGNIFICANCE];
  const detected = criticalValue !== undefined && chiSquared > criticalValue;
  return { chiSquared, degreesOfFreedom, detected };
}
