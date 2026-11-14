import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { OllamaProvider } from "@/server/ai/providers/ollama-provider";
import {
  createDeterministicAdsSnapshot,
  type AdsItemRequest,
} from "@/workers/handlers/ads-handler";
import {
  createDeterministicCopySnapshot,
  type CopyItemRequest,
} from "@/workers/handlers/copy-handler";
import {
  createDeterministicSocialSnapshot,
  type SocialItemRequest,
} from "@/workers/handlers/social-handler";
import {
  createDeterministicVideoSnapshot,
  type VideoItemRequest,
} from "@/workers/handlers/video-handler";
import {
  createDeterministicWebsitePage,
  type WebsitePageRequest,
} from "@/workers/handlers/website-handler";

import { buildEvaluationCases, type EvaluationCase } from "./cases";
import { renderEvaluationMarkdown, runEvaluation } from "./harness";

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
  }
  server = undefined;
});

// Valid outputs per prompt key, produced by the project's own deterministic
// generators, so the fake runtime answers like a perfectly compliant model.
function validOutputs(cases: readonly EvaluationCase[]) {
  const outputs = new Map<string, unknown>();
  for (const testCase of cases) {
    const context = testCase.context as {
      request?: unknown;
      brandProfile?: unknown;
    };
    if (testCase.id === "brand_profile") {
      const brand = (
        cases.find((c) => c.id !== "brand_profile")!.context as {
          brandProfile: unknown;
        }
      ).brandProfile;
      outputs.set(testCase.promptKey, BrandProfileSchema.parse(brand));
      continue;
    }
    const brand = BrandProfileSchema.parse(context.brandProfile);
    const jobId = `evaluation-${testCase.id}`;
    const moduleKey = testCase.id.split(".")[0];
    const output =
      moduleKey === "copy"
        ? createDeterministicCopySnapshot(
            context.request as CopyItemRequest,
            brand,
            jobId,
          )
        : moduleKey === "website"
          ? createDeterministicWebsitePage(
              context.request as WebsitePageRequest,
              brand,
              jobId,
            )
          : moduleKey === "social"
            ? createDeterministicSocialSnapshot(
                context.request as SocialItemRequest,
                brand,
                jobId,
              )
            : moduleKey === "ads"
              ? createDeterministicAdsSnapshot(
                  context.request as AdsItemRequest,
                  brand,
                  jobId,
                )
              : createDeterministicVideoSnapshot(
                  context.request as VideoItemRequest,
                  brand,
                  jobId,
                );
    outputs.set(testCase.promptKey, testCase.schema.parse(output));
  }
  return outputs;
}

async function fakeOllama(
  answer: (task: string, isRepair: boolean, attempt: number) => string,
) {
  let lastTask = "";
  const attempts = new Map<string, number>();
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      const body = JSON.parse(raw) as {
        messages: { role: string; content: string }[];
      };
      const user = JSON.parse(body.messages[1]!.content) as { task: string };
      const isRepair = user.task.startsWith("Repair");
      if (!isRepair) lastTask = user.task;
      const attempt = (attempts.get(lastTask) ?? 0) + 1;
      attempts.set(lastTask, attempt);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          message: { content: answer(lastTask, isRepair, attempt) },
          prompt_eval_count: 100,
          eval_count: 50,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return new OllamaProvider({
    baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
  });
}

describe("evaluation suite (C-04)", () => {
  it("passes every case against a compliant runtime", async () => {
    const cases = await buildEvaluationCases();
    expect(cases.map((c) => c.id)).toEqual([
      "brand_profile",
      "copy.marketing_email",
      "copy.product_description",
      "copy.faq_document",
      "website.home",
      "social.instagram_post",
      "ads.meta_ad",
      "video.reel_script",
    ]);
    const outputs = validOutputs(cases);
    const adapter = await fakeOllama((task) =>
      JSON.stringify(outputs.get(task)),
    );
    const report = await runEvaluation({
      adapter,
      runtimeKey: "ollama",
      model: "fake-model",
      cases,
      samplesPerCase: 2,
      timeoutMs: 5_000,
      hardware: "test runner",
      now: () => new Date("2026-11-14T00:00:00.000Z"),
    });
    expect(report.passed).toBe(true);
    for (const result of report.cases)
      expect(result.summary).toMatchObject({
        samples: 2,
        firstPassValidRate: 1,
        prohibitedWordViolations: 0,
        unsupportedClaimFlags: 0,
        averageTotalTokens: 150,
      });
    expect(renderEvaluationMarkdown(report)).toContain("Result: **PASS**");
  });

  it("counts structural repair and brand violations, and fails with reasons", async () => {
    const cases = await buildEvaluationCases();
    const outputs = validOutputs(cases);
    const forbidden = cases[0]!.wordsToAvoid[0]!;
    const adapter = await fakeOllama((task, isRepair) => {
      const output = outputs.get(task) as Record<string, unknown>;
      if (task === "copy.marketing_email.generation" && !isRepair)
        return "not json";
      if (task === "copy.faq_document.generation")
        return JSON.stringify({ ...output, title: `${forbidden} FAQ` });
      return JSON.stringify(output);
    });
    const report = await runEvaluation({
      adapter,
      runtimeKey: "ollama",
      model: "fake-model",
      cases,
      samplesPerCase: 1,
      timeoutMs: 5_000,
    });
    const byId = Object.fromEntries(report.cases.map((c) => [c.id, c.summary]));
    expect(byId["copy.marketing_email"]).toMatchObject({
      firstPassValidRate: 0,
      afterRepairValidRate: 1,
      repairAttempts: 1,
      passed: false,
    });
    expect(byId["copy.faq_document"]).toMatchObject({
      prohibitedWordViolations: 1,
      passed: false,
    });
    expect(byId["brand_profile"]!.passed).toBe(true);
    expect(report.passed).toBe(false);
    const markdown = renderEvaluationMarkdown(report);
    expect(markdown).toContain("Result: **FAIL**");
    expect(markdown).toContain("first-pass valid 0% < 90%");
  });
});
