// C-04: pure scoring for the AI evaluation suite. Acceptance thresholds come
// from docs/technical/47-execution-plan-and-backlog.md §5.2.

import {
  escapeRegExp,
  generatedText,
  unsupportedClaimHits,
} from "@/server/ai/unsupported-claims";

export { unsupportedClaimHits };

export const EVALUATION_THRESHOLDS = {
  firstPassValidRate: 0.9,
  afterRepairValidRate: 0.99,
  prohibitedWordViolations: 0,
  unsupportedClaimFlags: 0,
} as const;

export type SampleOutcome = Readonly<{
  firstPassValid: boolean;
  repairAttempted: boolean;
  validAfterRepair: boolean;
  errorCode: string | null;
  latencyMs: number;
  totalTokens: number | null;
  prohibitedWordHits: readonly string[];
  unsupportedClaimHits: readonly string[];
}>;

export function percentile(values: readonly number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(rank, 0), sorted.length - 1)]!;
}

export function prohibitedWordHits(
  output: unknown,
  wordsToAvoid: readonly string[],
): string[] {
  const text = generatedText(output);
  return wordsToAvoid.filter((word) =>
    new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}($|[^\\p{L}\\p{N}])`,
      "iu",
    ).test(text),
  );
}

// Measurement only, never used to trigger a revision: qualities a model may
// infer from the client's facts with words the detector does not know. The
// first list became part of the detector on 2026-11-17 (doc 54); these are
// new words, so the measurement stays independent of what triggers revision.
const heldOutAttributeTerms = [
  "weightless",
  "barely there",
  "conscious",
  "kinder to",
  "low-impact",
  "low impact",
  "greener",
  "rugged",
  "sturdy",
  "tough",
  "resilient",
  "cloud-like",
  "soft",
  "springy",
  "premium",
];

// Portuguese, as regular expression sources (gender and number).
const heldOutPortuguesePatterns = [
  "levinh[oa]s?",
  "sem peso",
  "conscientes?",
  "robust[oa]s?",
  "resistência",
  "suaves?",
  "nuvem",
  "premium",
];

const heldOutPatterns = [
  ...new Set([
    ...heldOutAttributeTerms.map(escapeRegExp),
    ...heldOutPortuguesePatterns,
  ]),
].map(
  (source) =>
    new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, "iu"),
);

export function heldOutClaimHits(output: unknown, context: unknown) {
  const text = generatedText(output);
  const contextText = JSON.stringify(context);
  const hits = new Set<string>();
  for (const pattern of heldOutPatterns) {
    const match = text.match(pattern);
    if (match && !pattern.test(contextText))
      hits.add(match[0].toLocaleLowerCase());
  }
  return [...hits];
}

export type CaseSummary = Readonly<{
  samples: number;
  firstPassValidRate: number;
  afterRepairValidRate: number;
  repairAttempts: number;
  prohibitedWordViolations: number;
  unsupportedClaimFlags: number;
  errors: Readonly<Record<string, number>>;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  averageTotalTokens: number | null;
  // Distinct prohibited words and claim phrases found, for manual review.
  flaggedTerms: readonly string[];
  failures: readonly string[];
  passed: boolean;
}>;

export function summarizeCase(
  outcomes: readonly SampleOutcome[],
  options: { maxP95LatencyMs?: number } = {},
): CaseSummary {
  const count = outcomes.length;
  const rate = (predicate: (outcome: SampleOutcome) => boolean) =>
    count === 0 ? 0 : outcomes.filter(predicate).length / count;
  const errors: Record<string, number> = {};
  for (const outcome of outcomes)
    if (outcome.errorCode)
      errors[outcome.errorCode] = (errors[outcome.errorCode] ?? 0) + 1;
  const tokens = outcomes
    .map((outcome) => outcome.totalTokens)
    .filter((value): value is number => value !== null);
  const latencies = outcomes.map((outcome) => outcome.latencyMs);
  const summary = {
    samples: count,
    firstPassValidRate: rate((outcome) => outcome.firstPassValid),
    afterRepairValidRate: rate(
      (outcome) => outcome.firstPassValid || outcome.validAfterRepair,
    ),
    repairAttempts: outcomes.filter((outcome) => outcome.repairAttempted)
      .length,
    prohibitedWordViolations: outcomes.reduce(
      (total, outcome) => total + outcome.prohibitedWordHits.length,
      0,
    ),
    unsupportedClaimFlags: outcomes.reduce(
      (total, outcome) => total + outcome.unsupportedClaimHits.length,
      0,
    ),
    errors,
    latencyP50Ms: percentile(latencies, 50),
    latencyP95Ms: percentile(latencies, 95),
    flaggedTerms: [
      ...new Set(
        outcomes.flatMap((outcome) => [
          ...outcome.prohibitedWordHits,
          ...outcome.unsupportedClaimHits,
        ]),
      ),
    ].sort(),
    averageTotalTokens:
      tokens.length === 0
        ? null
        : Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length),
  };
  const failures: string[] = [];
  if (count === 0) failures.push("no samples");
  if (summary.firstPassValidRate < EVALUATION_THRESHOLDS.firstPassValidRate)
    failures.push(
      `first-pass valid ${(summary.firstPassValidRate * 100).toFixed(0)}% < ${EVALUATION_THRESHOLDS.firstPassValidRate * 100}%`,
    );
  if (summary.afterRepairValidRate < EVALUATION_THRESHOLDS.afterRepairValidRate)
    failures.push(
      `valid after repair ${(summary.afterRepairValidRate * 100).toFixed(0)}% < ${EVALUATION_THRESHOLDS.afterRepairValidRate * 100}%`,
    );
  if (summary.prohibitedWordViolations > 0)
    failures.push(
      `${summary.prohibitedWordViolations} prohibited-word hits (${[...new Set(outcomes.flatMap((outcome) => outcome.prohibitedWordHits))].join(", ")})`,
    );
  if (summary.unsupportedClaimFlags > 0)
    failures.push(
      `${summary.unsupportedClaimFlags} unsupported-claim flags (${[...new Set(outcomes.flatMap((outcome) => outcome.unsupportedClaimHits))].join(", ")})`,
    );
  if (
    options.maxP95LatencyMs !== undefined &&
    summary.latencyP95Ms !== null &&
    summary.latencyP95Ms > options.maxP95LatencyMs
  )
    failures.push(
      `p95 latency ${summary.latencyP95Ms} ms > ${options.maxP95LatencyMs} ms`,
    );
  return { ...summary, failures, passed: failures.length === 0 };
}
