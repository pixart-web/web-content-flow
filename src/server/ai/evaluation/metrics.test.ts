import { describe, expect, it } from "vitest";

import {
  percentile,
  prohibitedWordHits,
  summarizeCase,
  unsupportedClaimHits,
  type SampleOutcome,
} from "./metrics";

const ok: SampleOutcome = {
  firstPassValid: true,
  repairAttempted: false,
  validAfterRepair: false,
  errorCode: null,
  latencyMs: 100,
  totalTokens: 200,
  prohibitedWordHits: [],
  unsupportedClaimHits: [],
};

describe("evaluation metrics", () => {
  it("computes nearest-rank percentiles", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 95)).toBe(100);
  });

  it("matches prohibited words as whole words, ignoring provenance", () => {
    const output = {
      headline: "Cheap shoes, no gimmicks",
      provenance: { note: "cheap" },
      wordsToAvoid: ["gimmick"],
      nested: { provenance: { note: "neon" } },
      notes: "Avoid words like 'gimmick' or 'neon'.",
    };
    expect(prohibitedWordHits(output, ["cheap", "gimmick", "neon"])).toEqual([
      "cheap",
    ]);
  });

  it("flags claims only when the context does not contain them", () => {
    const context = { brief: "Rated 4.8 stars by testers; 30% lighter" };
    const output = {
      body: "Award-winning comfort, 30% lighter, loved by 10,000 customers",
    };
    expect(unsupportedClaimHits(output, context).sort()).toEqual([
      "10,000 customers",
      "Award-winning",
    ]);
  });

  it("passes a clean case and explains each failed threshold", () => {
    expect(summarizeCase(Array(10).fill(ok))).toMatchObject({
      passed: true,
      firstPassValidRate: 1,
      latencyP50Ms: 100,
      averageTotalTokens: 200,
    });
    const repaired = {
      ...ok,
      firstPassValid: false,
      repairAttempted: true,
      validAfterRepair: true,
    };
    const broken = {
      ...ok,
      firstPassValid: false,
      repairAttempted: true,
      errorCode: "SCHEMA_VALIDATION_FAILED",
    };
    const summary = summarizeCase(
      [
        ...Array(7).fill(ok),
        repaired,
        broken,
        { ...ok, prohibitedWordHits: ["cheap"], latencyMs: 9_000 },
      ],
      { maxP95LatencyMs: 5_000 },
    );
    expect(summary.passed).toBe(false);
    expect(summary.errors).toEqual({ SCHEMA_VALIDATION_FAILED: 1 });
    expect(summary.failures).toEqual([
      "first-pass valid 80% < 90%",
      "valid after repair 90% < 99%",
      "1 prohibited-word hits (cheap)",
      "p95 latency 9000 ms > 5000 ms",
    ]);
  });

  it("flags invented URLs and product attributes absent from the context", () => {
    const context = {
      brief: "Leather city shoes; see https://example.invalid",
    };
    const output = {
      callToAction: {
        destinationDescription: "https://urbanstride.com/collections/city",
      },
      keyFeatures: ["Breathable materials", "Flexible soles", "Leather upper"],
      cta: "Visit https://example.invalid for details",
      shop: "Order at shop.urbanstride.store today",
    };
    expect(unsupportedClaimHits(output, context).sort()).toEqual([
      "breathable",
      "flexible soles",
      "https://urbanstride.com/collections/city",
      "urbanstride.store",
    ]);
  });
});
