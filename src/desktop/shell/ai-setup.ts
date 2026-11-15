import type { CatalogEntry } from "@/desktop/ai/model-catalog";

import type { LocalModelActivation } from "./installation";

// L4b: activation policy for a local model on this computer. A quick on-device
// run (1 sample) of four representative cases must produce valid structure in
// every case (repair allowed) and no prohibited brand word. Unsupported-claim
// flags do not block: they are shown for human review (doc 48 — gemma4 still
// invents an occasional attribute).

export const ACTIVATION_CASES = [
  "brand_profile",
  "copy.marketing_email",
  "copy.product_description",
  "website.home",
] as const;

type CaseSummary = Readonly<{
  afterRepairValidRate: number;
  prohibitedWordViolations: number;
  unsupportedClaimFlags: number;
  flaggedTerms: readonly string[];
}>;

export type EvaluationReportLike = Readonly<{
  suiteVersion: string;
  generatedAt: string;
  model: string;
  hardware: string | null;
  cases: readonly { id: string; summary: CaseSummary }[];
}>;

export function activationDecision(report: EvaluationReportLike) {
  const reasons: string[] = [];
  for (const required of ACTIVATION_CASES)
    if (!report.cases.some((testCase) => testCase.id === required))
      reasons.push(`${required}: not evaluated`);
  for (const { id, summary } of report.cases) {
    if (summary.afterRepairValidRate < 1)
      reasons.push(`${id}: invalid structure after repair`);
    if (summary.prohibitedWordViolations > 0)
      reasons.push(
        `${id}: ${summary.prohibitedWordViolations} prohibited word(s)`,
      );
  }
  return {
    approved: reasons.length === 0,
    reasons,
    claimFlags: report.cases
      .filter(({ summary }) => summary.unsupportedClaimFlags > 0)
      .map(({ id, summary }) => ({ caseId: id, terms: summary.flaggedTerms })),
  };
}

export function activationRecord(input: {
  entry: CatalogEntry;
  digest: string;
  licenseAcceptedAt: string;
  report: EvaluationReportLike;
}): LocalModelActivation {
  if (!activationDecision(input.report).approved)
    throw new Error("The on-device evaluation did not pass.");
  if (input.digest !== input.entry.manifestDigest)
    throw new Error("The installed model is not the catalog version.");
  return {
    catalogId: input.entry.id,
    tag: input.entry.tag,
    digest: input.digest,
    structuredMode: input.entry.structuredMode,
    license: input.entry.license.spdx,
    licenseAcceptedAt: input.licenseAcceptedAt,
    evaluation: {
      suite: input.report.suiteVersion,
      passed: true,
      evaluatedAt: input.report.generatedAt,
      hardware: input.report.hardware,
    },
  };
}
