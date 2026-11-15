import { describe, expect, it } from "vitest";

import { findCatalogEntry } from "@/desktop/ai/model-catalog";

import {
  ACTIVATION_CASES,
  activationDecision,
  activationRecord,
  type EvaluationReportLike,
} from "./ai-setup";
import { LocalModelActivationSchema } from "./installation";

const ok = {
  afterRepairValidRate: 1,
  prohibitedWordViolations: 0,
  unsupportedClaimFlags: 0,
  flaggedTerms: [] as string[],
};
const report = (
  overrides: Record<string, Partial<typeof ok>> = {},
): EvaluationReportLike => ({
  suiteVersion: "1.4.0",
  generatedAt: "2026-11-15T10:00:00.000Z",
  model: "gemma4:12b-it-qat",
  hardware: "Apple M4, 32 GB, darwin",
  cases: ACTIVATION_CASES.map((id) => ({
    id,
    summary: { ...ok, ...overrides[id] },
  })),
});
const gemma = findCatalogEntry("gemma4-12b-qat")!;

describe("local model activation policy (L4b)", () => {
  it("approves valid structure without prohibited words, reporting claim flags for review", () => {
    const decision = activationDecision(
      report({
        "copy.product_description": {
          unsupportedClaimFlags: 1,
          flaggedTerms: ["durable"],
        },
      }),
    );
    expect(decision).toEqual({
      approved: true,
      reasons: [],
      claimFlags: [{ caseId: "copy.product_description", terms: ["durable"] }],
    });
  });

  it("refuses invalid structure, prohibited words and missing cases", () => {
    expect(
      activationDecision(report({ brand_profile: { afterRepairValidRate: 0 } }))
        .reasons,
    ).toEqual(["brand_profile: invalid structure after repair"]);
    expect(
      activationDecision(
        report({ "website.home": { prohibitedWordViolations: 2 } }),
      ).approved,
    ).toBe(false);
    expect(
      activationDecision({ ...report(), cases: report().cases.slice(1) })
        .reasons,
    ).toEqual(["brand_profile: not evaluated"]);
  });

  it("builds a valid activation record only for an approved run of the catalog version", () => {
    const record = activationRecord({
      entry: gemma,
      digest: gemma.manifestDigest,
      licenseAcceptedAt: "2026-11-15T09:55:00.000Z",
      report: report(),
    });
    expect(LocalModelActivationSchema.parse(record)).toMatchObject({
      catalogId: "gemma4-12b-qat",
      tag: "gemma4:12b-it-qat",
      evaluation: { passed: true, suite: "1.4.0" },
    });
    expect(() =>
      activationRecord({
        entry: gemma,
        digest: "0".repeat(64),
        licenseAcceptedAt: "2026-11-15T09:55:00.000Z",
        report: report(),
      }),
    ).toThrow(/catalog version/);
    expect(() =>
      activationRecord({
        entry: gemma,
        digest: gemma.manifestDigest,
        licenseAcceptedAt: "2026-11-15T09:55:00.000Z",
        report: report({ brand_profile: { afterRepairValidRate: 0 } }),
      }),
    ).toThrow(/did not pass/);
  });
});
