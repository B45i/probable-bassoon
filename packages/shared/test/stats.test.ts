import { describe, expect, it } from "vitest";
import { srmCheck, twoProportionZTest, wilsonInterval } from "../src/stats";

describe("wilsonInterval", () => {
  it("is symmetric around 0.5 when the observed rate is exactly 0.5", () => {
    const { lower, upper } = wilsonInterval(50, 100);
    expect(0.5 - lower).toBeCloseTo(upper - 0.5, 9);
  });

  it("matches the widely-published reference case (50/100 at 95%)", () => {
    const { lower, upper } = wilsonInterval(50, 100);
    expect(lower).toBeCloseTo(0.404, 2);
    expect(upper).toBeCloseTo(0.596, 2);
  });

  it("never goes below 0 successes", () => {
    expect(wilsonInterval(0, 50).lower).toBe(0);
  });

  it("never exceeds 1 at a 100% observed rate", () => {
    expect(wilsonInterval(50, 50).upper).toBeCloseTo(1, 9);
  });

  it("returns a degenerate interval for zero trials rather than dividing by zero", () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 0 });
  });
});

describe("twoProportionZTest", () => {
  it("reports no difference when both rates are identical", () => {
    const { z, pValue } = twoProportionZTest(50, 100, 50, 100);
    expect(z).toBe(0);
    expect(pValue).toBe(1);
  });

  it("reports high significance for a large, obvious gap", () => {
    const { pValue } = twoProportionZTest(50, 1000, 150, 1000);
    expect(pValue).toBeLessThan(0.01);
  });

  it("is symmetric under swapping which side improved", () => {
    const a = twoProportionZTest(50, 1000, 150, 1000);
    const b = twoProportionZTest(150, 1000, 50, 1000);
    expect(a.pValue).toBeCloseTo(b.pValue, 9);
    expect(a.z).toBeCloseTo(-b.z, 9);
  });

  it("doesn't divide by zero when a group has no trials", () => {
    expect(twoProportionZTest(0, 0, 5, 10)).toEqual({ z: 0, pValue: 1 });
  });
});

describe("srmCheck", () => {
  it("never flags an exact match to the expected split", () => {
    const result = srmCheck([500, 500], [0.5, 0.5]);
    expect(result.chiSquared).toBe(0);
    expect(result.detected).toBe(false);
  });

  it("flags an obviously lopsided split", () => {
    const result = srmCheck([700, 300], [0.5, 0.5]);
    expect(result.detected).toBe(true);
  });

  it("matches a hand-computed statistic against the library's own sourced critical value", () => {
    // observed = [557, 443], expected = [500, 500]: chiSq = 57²/500 + 57²/500 = 12.996.
    // 1 df, 0.005 significance critical value is 7.88 (Hines & Montgomery table) — above it.
    const result = srmCheck([557, 443], [0.5, 0.5]);
    expect(result.chiSquared).toBeCloseTo(12.996, 3);
    expect(result.degreesOfFreedom).toBe(1);
    expect(result.detected).toBe(true);
  });

  it("doesn't flag anything with zero total exposures", () => {
    expect(srmCheck([0, 0], [0.5, 0.5])).toEqual({ chiSquared: 0, degreesOfFreedom: 1, detected: false });
  });

  it("handles more than two variants", () => {
    const result = srmCheck([340, 330, 330], [1 / 3, 1 / 3, 1 / 3]);
    expect(result.degreesOfFreedom).toBe(2);
    expect(result.detected).toBe(false);
  });
});
