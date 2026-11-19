import { CURRENT_PROMPT_VERSION } from "@/ai/prompts/registry";
import "server-only";

import {
  buildClaimRevisionMessage,
  claimRevisionInstructions,
  type ClaimRevisionMode,
} from "@/ai/prompts/claim-revision";
import {
  buildStructuralRepairMessage,
  STRUCTURAL_REPAIR_INSTRUCTIONS,
} from "@/ai/prompts/structural-repair";
import { ProviderError, type AiProvider } from "@/server/ai/ai-provider";

import {
  EVALUATION_SUITE_VERSION,
  type EvaluationCase,
  type EvaluationLanguage,
} from "./cases";
import {
  EVALUATION_THRESHOLDS,
  heldOutClaimHits,
  prohibitedWordHits,
  summarizeCase,
  unsupportedClaimHits,
  type CaseSummary,
  type SampleOutcome,
} from "./metrics";

// C-04 / ADR-077: runs fixed cases against one runtime+model, sequentially
// (local hardware usually serves one request at a time), and scores them.
// Prompt and output text never leave this process except inside the scoring.

// One generated sample for human reading (--save-samples): the first output
// and, when the claim revision ran, the revised one with what each flagged.
export type EvaluationSampleRecord = Readonly<{
  caseId: string;
  sample: number;
  firstOutput: unknown;
  firstFlags: readonly string[];
  revisedOutput: unknown;
  remainingFlags: readonly string[];
  heldOut: readonly string[];
}>;

export type EvaluationReport = Readonly<{
  suiteVersion: string;
  language: EvaluationLanguage;
  claimRevisionMode: ClaimRevisionMode | null;
  generatedAt: string;
  runtimeKey: string;
  model: string;
  hardware: string | null;
  samplesPerCase: number;
  thresholds: typeof EVALUATION_THRESHOLDS & { maxP95LatencyMs: number | null };
  cases: readonly {
    id: string;
    promptKey: string;
    summary: CaseSummary;
    // Average count of the client's facts used (--with-knowledge cases).
    factsUsedAverage?: number;
    // Held-out synonyms (measurement only) and, with --claim-revision, how
    // many samples were revised and the detector flags before revising.
    heldOutClaimFlags?: number;
    heldOutTerms?: readonly string[];
    claimRevision?: { revisedSamples: number; flagsBeforeRevision: number };
  }[];
  passed: boolean;
}>;

async function runSample(
  adapter: AiProvider,
  testCase: EvaluationCase,
  options: {
    model: string;
    timeoutMs: number;
    sample: number;
    claimRevision?: ClaimRevisionMode;
    onSample?: (record: EvaluationSampleRecord) => void;
  },
): Promise<
  SampleOutcome & {
    factsUsed: number | null;
    heldOut: readonly string[];
    revised: boolean;
    flagsBeforeRevision: number;
  }
> {
  const requestId = `evaluation-${testCase.id}-${options.sample}`;
  const startedAt = performance.now();
  let tokens: number | null = null;
  const addTokens = (value: number | undefined) => {
    if (value !== undefined) tokens = (tokens ?? 0) + value;
  };
  const base = {
    requestId,
    model: options.model,
    modelTier: "STANDARD" as const,
    promptKey: testCase.promptKey,
    promptVersion: CURRENT_PROMPT_VERSION,
    schemaVersion: "1.0",
    schemaName: testCase.promptKey.replaceAll(".", "_"),
    maximumOutputTokens: testCase.maximumOutputTokens,
    timeoutMs: options.timeoutMs,
  };
  let output: unknown = null;
  let firstPassValid = false;
  let repairAttempted = false;
  let validAfterRepair = false;
  let errorCode: string | null = null;
  try {
    const result = await adapter.generateStructured(
      {
        ...base,
        input: testCase.context,
        systemInstructions: testCase.systemInstructions,
        userMessage: testCase.userMessage,
      },
      testCase.schema,
    );
    addTokens(result.usage.totalTokens);
    output = result.data;
    firstPassValid = true;
  } catch (error: unknown) {
    errorCode = error instanceof ProviderError ? error.code : "UNKNOWN";
    if (
      error instanceof ProviderError &&
      error.code === "SCHEMA_VALIDATION_FAILED" &&
      testCase.repair === "STRUCTURE_ONCE"
    ) {
      repairAttempted = true;
      try {
        const repaired = await adapter.generateStructured(
          {
            ...base,
            requestId: `${requestId}-repair`,
            modelTier: "REPAIR",
            schemaName: `${base.schemaName}_repair`,
            input: {},
            systemInstructions: STRUCTURAL_REPAIR_INSTRUCTIONS,
            userMessage: buildStructuralRepairMessage({
              rejectedOutput: error.rejectedOutput ?? null,
              validationIssues: error.validationIssues ?? [],
              trustedConstraints: testCase.safetyNotes,
            }),
          },
          testCase.schema,
        );
        addTokens(repaired.usage.totalTokens);
        output = repaired.data;
        validAfterRepair = true;
        errorCode = null;
      } catch (repairError: unknown) {
        errorCode =
          repairError instanceof ProviderError ? repairError.code : "UNKNOWN";
      }
    }
  }
  // B5 hypothesis 1: one revision when the detector flags the output of a
  // case that has client knowledge.
  let revised = false;
  let flagsBeforeRevision = 0;
  const firstOutput = output;
  const clientKnowledge = (testCase.context as { clientKnowledge?: unknown })
    .clientKnowledge;
  if (output !== null && options.claimRevision && clientKnowledge) {
    const before = unsupportedClaimHits(output, testCase.context);
    flagsBeforeRevision = before.length;
    if (before.length > 0 || options.claimRevision === "grounded") {
      try {
        const revision = await adapter.generateStructured(
          {
            ...base,
            requestId: `${requestId}-claims`,
            schemaName: `${base.schemaName}_claims`,
            input: {},
            systemInstructions: claimRevisionInstructions(
              options.claimRevision,
            ),
            userMessage: buildClaimRevisionMessage({
              priorOutput: output,
              unsupportedTerms: before,
              clientKnowledge,
              mode: options.claimRevision,
            }),
          },
          testCase.schema,
        );
        addTokens(revision.usage.totalTokens);
        output = revision.data;
        revised = true;
      } catch {
        // Keep the first output; its flags still count.
      }
    }
  }
  const heldOut =
    output === null ? [] : heldOutClaimHits(output, testCase.context);
  const remaining =
    output === null ? [] : unsupportedClaimHits(output, testCase.context);
  options.onSample?.({
    caseId: testCase.id,
    sample: options.sample,
    firstOutput,
    firstFlags:
      firstOutput === null
        ? []
        : unsupportedClaimHits(firstOutput, testCase.context),
    revisedOutput: revised ? output : null,
    remainingFlags: remaining,
    heldOut,
  });
  return {
    revised,
    flagsBeforeRevision,
    heldOut,
    firstPassValid,
    repairAttempted,
    validAfterRepair,
    errorCode,
    latencyMs: Math.round(performance.now() - startedAt),
    totalTokens: tokens,
    prohibitedWordHits:
      output === null ? [] : prohibitedWordHits(output, testCase.wordsToAvoid),
    unsupportedClaimHits: remaining,
    factsUsed:
      output === null || !testCase.expectedFacts
        ? null
        : testCase.expectedFacts.filter((fact) =>
            JSON.stringify(output).toLowerCase().includes(fact.toLowerCase()),
          ).length,
  };
}

export async function runEvaluation(input: {
  adapter: AiProvider;
  runtimeKey: string;
  model: string;
  cases: readonly EvaluationCase[];
  samplesPerCase: number;
  timeoutMs: number;
  maxP95LatencyMs?: number;
  hardware?: string;
  claimRevision?: ClaimRevisionMode;
  language?: EvaluationLanguage;
  onSample?: (record: EvaluationSampleRecord) => void;
  now?: () => Date;
}): Promise<EvaluationReport> {
  const results: EvaluationReport["cases"][number][] = [];
  for (const testCase of input.cases) {
    const outcomes: Awaited<ReturnType<typeof runSample>>[] = [];
    for (let sample = 1; sample <= input.samplesPerCase; sample += 1)
      outcomes.push(
        await runSample(input.adapter, testCase, {
          model: input.model,
          timeoutMs: input.timeoutMs,
          sample,
          ...(input.claimRevision
            ? { claimRevision: input.claimRevision }
            : {}),
          ...(input.onSample ? { onSample: input.onSample } : {}),
        }),
      );
    const facts = outcomes
      .map((outcome) => outcome.factsUsed)
      .filter((value): value is number => value !== null);
    const heldOut = outcomes.flatMap((outcome) => outcome.heldOut);
    results.push({
      id: testCase.id,
      promptKey: testCase.promptKey,
      heldOutClaimFlags: heldOut.length,
      heldOutTerms: [...new Set(heldOut)].sort(),
      ...(input.claimRevision
        ? {
            claimRevision: {
              revisedSamples: outcomes.filter((outcome) => outcome.revised)
                .length,
              flagsBeforeRevision: outcomes.reduce(
                (total, outcome) => total + outcome.flagsBeforeRevision,
                0,
              ),
            },
          }
        : {}),
      ...(facts.length > 0
        ? {
            factsUsedAverage:
              Math.round(
                (facts.reduce((a, b) => a + b, 0) / facts.length) * 10,
              ) / 10,
          }
        : {}),
      summary: summarizeCase(
        outcomes,
        input.maxP95LatencyMs === undefined
          ? {}
          : { maxP95LatencyMs: input.maxP95LatencyMs },
      ),
    });
  }
  return {
    suiteVersion: EVALUATION_SUITE_VERSION,
    language: input.language ?? "en",
    claimRevisionMode: input.claimRevision ?? null,
    generatedAt: (input.now?.() ?? new Date()).toISOString(),
    runtimeKey: input.runtimeKey,
    model: input.model,
    hardware: input.hardware ?? null,
    samplesPerCase: input.samplesPerCase,
    thresholds: {
      ...EVALUATION_THRESHOLDS,
      maxP95LatencyMs: input.maxP95LatencyMs ?? null,
    },
    cases: results,
    passed: results.every((result) => result.summary.passed),
  };
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function renderEvaluationMarkdown(report: EvaluationReport) {
  const rows = report.cases.map(({ id, summary, factsUsedAverage }) =>
    [
      id,
      summary.passed ? "PASS" : "FAIL",
      percent(summary.firstPassValidRate),
      percent(summary.afterRepairValidRate),
      summary.prohibitedWordViolations,
      summary.unsupportedClaimFlags,
      summary.latencyP50Ms ?? "—",
      summary.latencyP95Ms ?? "—",
      summary.averageTotalTokens ?? "—",
      factsUsedAverage ?? "—",
      summary.failures.join("; ") || "—",
    ].join(" | "),
  );
  return [
    `# AI evaluation — ${report.runtimeKey}/${report.model}`,
    "",
    `- Result: **${report.passed ? "PASS" : "FAIL"}**`,
    `- Suite ${report.suiteVersion} (${report.language}${report.claimRevisionMode ? `, ${report.claimRevisionMode} claim revision` : ""}), ${report.samplesPerCase} samples per case, ${report.generatedAt}`,
    `- Hardware: ${report.hardware ?? "not recorded"}`,
    `- Thresholds: first-pass valid ≥ ${percent(report.thresholds.firstPassValidRate)}, valid after repair ≥ ${percent(report.thresholds.afterRepairValidRate)}, 0 prohibited words, 0 unsupported-claim flags${report.thresholds.maxP95LatencyMs === null ? "" : `, p95 ≤ ${report.thresholds.maxP95LatencyMs} ms`}`,
    "- Unsupported-claim flags are a heuristic (numbers, awards, rankings, URLs and product attributes absent from the context); review flagged outputs manually.",
    "",
    "| Case | Result | First-pass valid | Valid after repair | Prohibited words | Claim flags | p50 ms | p95 ms | Avg tokens | Client facts used | Failures |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
}
