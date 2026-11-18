import { describe, expect, it } from "vitest";

import {
  heldOutClaimHits,
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
      productionNotes: "Never say gimmick on screen.",
      visualDirection: { avoid: ["neon lighting"] },
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

  it("flags Portuguese attributes and claims, in any gender and number", () => {
    const context = {
      clientKnowledge: [
        {
          text: "A malha é de poliéster reciclado e a sola de borracha natural.",
        },
      ],
    };
    const output = {
      description:
        "Sapatilhas recicladas, respiráveis e impermeáveis, com sola de borracha. Mais vendidas em 2026, com portes grátis e 5000 clientes satisfeitos.",
      benefits: [
        "Ergonómicas",
        "Feitas à mão em Portugal",
        "Garantia de 2 anos",
        "Peso ultra-leve",
      ],
    };
    expect(unsupportedClaimHits(output, context).sort()).toEqual([
      "5000 clientes",
      "Mais vendidas",
      "ergonómicas",
      "feitas à mão",
      "garantia",
      "impermeáveis",
      "portes grátis",
      "respiráveis",
      "ultra-leve",
    ]);
  });

  it("accepts a material phrase when the context states the material", () => {
    const context = {
      sheet:
        "A sola exterior é de borracha natural. The outsole is natural rubber.",
    };
    const output = {
      body: "Sola de borracha natural e rubber sole; gáspea em pele.",
    };
    expect(unsupportedClaimHits(output, context)).toEqual(["em pele"]);
  });

  it("does not flag Portuguese words inside other words or the verb leve", () => {
    const output = {
      body: "Leve o conforto consigo; a peleja diária acaba aqui. Recicladora não é atributo.",
    };
    expect(unsupportedClaimHits(output, {})).toEqual([]);
  });

  it("flags the synonyms that used to survive the revision", () => {
    const output = {
      body: "Leveza duradoura, amiga do ambiente e muito macia. Sapatos leves; leve-os já.",
      en: "Featherlight, long-lasting and kind to the planet.",
    };
    expect(
      unsupportedClaimHits(output, { sheet: "Sola macia." }).sort(),
    ).toEqual([
      "amiga do ambiente",
      "duradoura",
      "featherlight",
      "leves",
      "leveza",
      "long-lasting",
      "planet",
    ]);
  });

  it("measures held-out synonyms the detector does not know", () => {
    const output = {
      body: "Levinhos, robustos e suaves. Sturdy and weightless.",
    };
    expect(
      heldOutClaimHits(output, { sheet: "Palmilha suave." }).sort(),
    ).toEqual(["levinhos", "robustos", "sturdy", "weightless"]);
    expect(unsupportedClaimHits(output, {})).toEqual([]);
  });
});
