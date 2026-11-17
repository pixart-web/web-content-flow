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
// infer from the client's facts with words outside productAttributeTerms
// (synonyms of "lightweight", "sustainable", "durable", "breathable"). It
// shows whether a revision removes the claim or only swaps the word.
const heldOutAttributeTerms = [
  "featherweight",
  "featherlight",
  "light as",
  "lightness",
  "light on your feet",
  "eco",
  "environmentally",
  "planet",
  "earth-friendly",
  "green choice",
  "long-lasting",
  "hard-wearing",
  "built to last",
  "airy",
  "ventilated",
  "plush",
  "premium",
];

export function heldOutClaimHits(output: unknown, context: unknown) {
  const lowered = generatedText(output).toLocaleLowerCase();
  const contextText = JSON.stringify(context).toLocaleLowerCase();
  return heldOutAttributeTerms.filter(
    (term) =>
      new RegExp(`(^|[^\\p{L}])${escapeRegExp(term)}($|[^\\p{L}])`, "u").test(
        lowered,
      ) && !contextText.includes(term),
  );
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
