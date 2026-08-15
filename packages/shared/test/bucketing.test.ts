import { describe, expect, it } from "vitest";
import { bucketVisitor } from "../src/bucketing";
import type { ExperimentConfig } from "../src/kv-config";

function config(overrides: Partial<ExperimentConfig> = {}): ExperimentConfig {
  return {
    key: "hero_copy",
    version: 1,
    salt: "fixed-salt",
    status: "running",
    trafficBp: 10000,
    variants: [
      { key: "control", weightBp: 5000, isControl: true, content: { headline: "A" } },
      { key: "b", weightBp: 5000, isControl: false, content: { headline: "B" } },
    ],
    ...overrides,
  };
}

function visitorIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `visitor-${i}`);
}

describe("bucketVisitor", () => {
  it("is sticky: the same visitor and config always resolve the same way", () => {
    const cfg = config();
    for (const visitorId of visitorIds(50)) {
      const first = bucketVisitor(cfg, visitorId);
      const second = bucketVisitor(cfg, visitorId);
      expect(second).toEqual(first);
    }
  });

  it("excludes everyone when traffic is 0%", () => {
    const cfg = config({ trafficBp: 0 });
    for (const visitorId of visitorIds(200)) {
      expect(bucketVisitor(cfg, visitorId)).toBeNull();
    }
  });

  it("includes everyone when traffic is 100%", () => {
    const cfg = config({ trafficBp: 10000 });
    for (const visitorId of visitorIds(200)) {
      expect(bucketVisitor(cfg, visitorId)).not.toBeNull();
    }
  });

  it("splits a large population close to the configured weights", () => {
    const cfg = config({
      variants: [
        { key: "control", weightBp: 9000, isControl: true, content: {} },
        { key: "b", weightBp: 1000, isControl: false, content: {} },
      ],
    });

    const counts = { control: 0, b: 0 };
    const sampleSize = 5000;
    for (const visitorId of visitorIds(sampleSize)) {
      const result = bucketVisitor(cfg, visitorId);
      if (result) counts[result.variant as "control" | "b"]++;
    }

    // MurmurHash3 is uniform but not exact on a finite sample — allow a few points either
    // side of the 90/10 split rather than asserting an exact count.
    expect(counts.control / sampleSize).toBeGreaterThan(0.87);
    expect(counts.control / sampleSize).toBeLessThan(0.93);
  });

  it("returns the assigned variant's own content", () => {
    const cfg = config();
    const result = bucketVisitor(cfg, "visitor-0");
    const variant = cfg.variants.find((v) => v.key === result?.variant);
    expect(result?.content).toEqual(variant?.content);
  });

  it("decorrelates across experiments: same visitor, different keys, not lock-stepped", () => {
    const a = config({ key: "exp_a" });
    const b = config({ key: "exp_b" });

    let sameVariant = 0;
    const sampleSize = 500;
    for (const visitorId of visitorIds(sampleSize)) {
      if (bucketVisitor(a, visitorId)?.variant === bucketVisitor(b, visitorId)?.variant) {
        sameVariant++;
      }
    }

    // With a 50/50 split in both, pure chance alone lands around half. If the salt/key
    // weren't actually mixed into the hash, this would be 100%.
    expect(sameVariant / sampleSize).toBeLessThan(0.65);
  });
});
