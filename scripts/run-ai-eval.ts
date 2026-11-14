import "./local-node-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, platform, totalmem } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { getServerEnv } from "../src/lib/env/server";
import { buildEvaluationCases } from "../src/server/ai/evaluation/cases";
import {
  renderEvaluationMarkdown,
  runEvaluation,
} from "../src/server/ai/evaluation/harness";
import { createRuntimeAdapter } from "../src/server/ai/gateway/gateway";
import { providerKindForUrl } from "../src/server/ai/gateway/model-registry";

// Usage:
//   pnpm eval:ai --runtime ollama [--model qwen3:14b] [--samples 5]
//   pnpm eval:ai --runtime openai-compatible --cases copy.marketing_email
//   pnpm eval:ai --runtime openai --allow-cloud      (spends provider credit)
// Reports are written to eval-reports/ (git-ignored). Exit code 1 = FAIL.

const { values } = parseArgs({
  options: {
    runtime: { type: "string" },
    model: { type: "string" },
    samples: { type: "string", default: "5" },
    cases: { type: "string" },
    "timeout-ms": { type: "string", default: "180000" },
    "max-p95-ms": { type: "string" },
    hardware: { type: "string" },
    "allow-cloud": { type: "boolean", default: false },
    out: { type: "string", default: "eval-reports" },
  },
});

const env = getServerEnv();
const runtimeKey = values.runtime;
const runtimes: Record<
  string,
  { model: string | undefined; baseUrl?: string | undefined }
> = {
  ollama: { model: env.AI_OLLAMA_MODEL, baseUrl: env.AI_OLLAMA_BASE_URL },
  "openai-compatible": {
    model: env.AI_OPENAI_COMPATIBLE_MODEL,
    baseUrl: env.AI_OPENAI_COMPATIBLE_BASE_URL,
  },
  openai: { model: env.OPENAI_MODEL_STANDARD },
};
if (!runtimeKey || !runtimes[runtimeKey])
  throw new Error(
    `--runtime must be one of: ${Object.keys(runtimes).join(", ")}`,
  );
if (runtimeKey === "openai" && !values["allow-cloud"])
  throw new Error(
    "Evaluating the OpenAI cloud runtime spends credit; pass --allow-cloud.",
  );
const model = values.model ?? runtimes[runtimeKey]!.model;
if (!model)
  throw new Error(`No model configured for ${runtimeKey}; pass --model.`);
const samplesPerCase = Number(values.samples);
if (!Number.isInteger(samplesPerCase) || samplesPerCase < 1)
  throw new Error("--samples must be a positive integer.");

const baseUrl = runtimes[runtimeKey]!.baseUrl;
const hardware =
  values.hardware ??
  (baseUrl && providerKindForUrl(baseUrl) === "local"
    ? `${cpus()[0]?.model ?? "unknown CPU"}, ${Math.round(totalmem() / 2 ** 30)} GB, ${platform()}`
    : undefined);

// Narrowed copies for use inside main().
const selectedRuntime: string = runtimeKey;
const selectedModel: string = model;

async function main() {
  const selected = values.cases?.split(",").map((id) => id.trim());
  const cases = (await buildEvaluationCases()).filter(
    (testCase) => !selected || selected.includes(testCase.id),
  );
  if (cases.length === 0) throw new Error("No evaluation cases selected.");

  const report = await runEvaluation({
    adapter: createRuntimeAdapter(selectedRuntime, env),
    runtimeKey: selectedRuntime,
    model: selectedModel,
    cases,
    samplesPerCase,
    timeoutMs: Number(values["timeout-ms"]),
    ...(values["max-p95-ms"]
      ? { maxP95LatencyMs: Number(values["max-p95-ms"]) }
      : {}),
    ...(hardware ? { hardware } : {}),
  });

  mkdirSync(values.out, { recursive: true });
  const stem = join(
    values.out,
    `${report.generatedAt.replaceAll(":", "-")}-${selectedRuntime}-${selectedModel.replace(/[^A-Za-z0-9._-]/g, "_")}`,
  );
  writeFileSync(`${stem}.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${stem}.md`, renderEvaluationMarkdown(report));
  console.warn(`${report.passed ? "PASS" : "FAIL"} — report: ${stem}.md`);
  process.exitCode = report.passed ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
