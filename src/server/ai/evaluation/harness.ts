import "server-only";

import {
  buildStructuralRepairMessage,
  STRUCTURAL_REPAIR_INSTRUCTIONS,
} from "@/ai/prompts/structural-repair";
import { ProviderError, type AiProvider } from "@/server/ai/ai-provider";

import { EVALUATION_SUITE_VERSION, type EvaluationCase } from "./cases";
import {
  EVALUATION_THRESHOLDS,
  prohibitedWordHits,
  summarizeCase,
  unsupportedClaimHits,
  type CaseSummary,
  type SampleOutcome,
} from "./metrics";

// C-04 / ADR-077: runs fixed cases against one runtime+model, sequentially
// (local hardware usually serves one request at a time), and scores them.
// Prompt and output text never leave this process except inside the scoring.

export type EvaluationReport = Readonly<{
  suiteVersion: string;
  generatedAt: string;
  runtimeKey: string;
  model: string;
  hardware: string | null;
  samplesPerCase: number;
  thresholds: typeof EVALUATION_THRESHOLDS & { maxP95LatencyMs: number | null };
  cases: readonly { id: string; promptKey: string; summary: CaseSummary }[];
  passed: boolean;
}>;

async function runSample(
  adapter: AiProvider,
  testCase: EvaluationCase,
  options: { model: string; timeoutMs: number; sample: number },
): Promise<SampleOutcome> {
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
    promptVersion: "1.0.0",
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
  return {
    firstPassValid,
    repairAttempted,
    validAfterRepair,
    errorCode,
    latencyMs: Math.round(performance.now() - startedAt),
    totalTokens: tokens,
    prohibitedWordHits:
      output === null ? [] : prohibitedWordHits(output, testCase.wordsToAvoid),
    unsupportedClaimHits:
      output === null ? [] : unsupportedClaimHits(output, testCase.context),
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
  now?: () => Date;
}): Promise<EvaluationReport> {
  const results: EvaluationReport["cases"][number][] = [];
  for (const testCase of input.cases) {
    const outcomes: SampleOutcome[] = [];
    for (let sample = 1; sample <= input.samplesPerCase; sample += 1)
      outcomes.push(
        await runSample(input.adapter, testCase, {
          model: input.model,
          timeoutMs: input.timeoutMs,
          sample,
        }),
      );
    results.push({
      id: testCase.id,
      promptKey: testCase.promptKey,
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
  const rows = report.cases.map(({ id, summary }) =>
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
      summary.failures.join("; ") || "—",
    ].join(" | "),
  );
  return [
    `# AI evaluation — ${report.runtimeKey}/${report.model}`,
    "",
    `- Result: **${report.passed ? "PASS" : "FAIL"}**`,
    `- Suite ${report.suiteVersion}, ${report.samplesPerCase} samples per case, ${report.generatedAt}`,
    `- Hardware: ${report.hardware ?? "not recorded"}`,
    `- Thresholds: first-pass valid ≥ ${percent(report.thresholds.firstPassValidRate)}, valid after repair ≥ ${percent(report.thresholds.afterRepairValidRate)}, 0 prohibited words, 0 unsupported-claim flags${report.thresholds.maxP95LatencyMs === null ? "" : `, p95 ≤ ${report.thresholds.maxP95LatencyMs} ms`}`,
    "- Unsupported-claim flags are a heuristic (numbers, awards, rankings absent from the context); review flagged outputs manually.",
    "",
    "| Case | Result | First-pass valid | Valid after repair | Prohibited words | Claim flags | p50 ms | p95 ms | Avg tokens | Failures |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
}
