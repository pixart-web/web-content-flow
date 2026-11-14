// C-04: pure scoring for the AI evaluation suite. Acceptance thresholds come
// from docs/technical/47-execution-plan-and-backlog.md §5.2.

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

// Scored text excludes application-owned provenance, the brand's own word
// lists (a Brand Profile legitimately lists its words to avoid) and editorial
// `notes`, where models restate the rules ("avoid terms like 'magic'") rather
// than use the words in deliverable copy. Applies at any depth.
const unscoredKeys = new Set([
  "provenance",
  "wordsToAvoid",
  "wordsToUse",
  "notes",
]);

function generatedText(output: unknown) {
  return (
    JSON.stringify(output, (key, value: unknown) =>
      unscoredKeys.has(key) ? undefined : value,
    ) ?? ""
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

// Heuristic for invented facts (the Brand Authority instructions forbid made-up
// statistics, awards, rankings, URLs and product attributes). A match only
// counts when the same phrase is absent from the supplied context.
// URLs and bare domains: the instructions forbid inventing destinations.
const urlPattern =
  /\bhttps?:\/\/[^\s"'<>)]+|\bwww\.[^\s"'<>)]+|\b[a-z0-9-]+\.(?:com|net|org|io|co|pt|eu|shop|store)(?:\/[^\s"'<>)]*)?/giu;

// Product attributes a model tends to invent (materials, technologies, comfort
// tech, sustainability, commercial promises). Tuned to the footwear fixtures;
// extend it with each new evaluation domain.
const productAttributeTerms = [
  "breathable",
  "waterproof",
  "water-resistant",
  "durable",
  "ergonomic",
  "memory foam",
  "cushioned",
  "cushioning",
  "anti-slip",
  "non-slip",
  "slip-resistant",
  "orthopedic",
  "orthopaedic",
  "arch support",
  "shock absorption",
  "shock-absorbing",
  "flexible sole",
  "flexible soles",
  "lightweight",
  "recycled",
  "sustainable",
  "eco-friendly",
  "vegan",
  "organic",
  "handmade",
  "hand-crafted",
  "leather",
  "suede",
  "rubber sole",
  "patented",
  "warranty",
  "free shipping",
  "free returns",
  "money-back",
];

const claimPatterns = [
  urlPattern,
  /\b\d{1,3}(?:[.,]\d+)?\s?%/giu,
  /\b(?:award[- ]winning|award|certified|certification|accredited)\b/giu,
  /(?:#\s?1\b|\bnumber one\b|\bbest[- ]selling\b|\bmarket[- ]leading\b)/giu,
  /\b\d[\d,.]*\s?(?:customers|users|reviews|stars|countries)\b/giu,
];

export function unsupportedClaimHits(output: unknown, context: unknown) {
  const text = generatedText(output);
  const contextText = JSON.stringify(context).toLocaleLowerCase();
  const hits = new Set<string>();
  for (const pattern of claimPatterns)
    for (const match of text.matchAll(pattern)) {
      const phrase = match[0].trim();
      if (!contextText.includes(phrase.toLocaleLowerCase())) hits.add(phrase);
    }
  const lowered = text.toLocaleLowerCase();
  for (const term of productAttributeTerms)
    if (
      new RegExp(`(^|[^\\p{L}])${escapeRegExp(term)}($|[^\\p{L}])`, "u").test(
        lowered,
      ) &&
      !contextText.includes(term)
    )
      hits.add(term);
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
