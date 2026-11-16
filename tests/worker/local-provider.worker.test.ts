import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";
import { BrandProfileSchema } from "../../src/domain/brand-profile/brand-profile-schema";
import { MockProvider } from "../../src/server/ai/providers/mock-provider";
import { validBrief } from "../fixtures/phase-2";

vi.mock("server-only", () => ({}));

// ADR-070 end to end: a REAL job recorded as LOCAL runs through the real
// executor, gateway, router and Ollama adapter against a fake Ollama server.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

let server: Server;
const seen: { model: string; format: unknown; think: unknown }[] = [];
const saved = { ...process.env };

beforeAll(async () => {
  const profile = (
    await new MockProvider().generateStructured(
      {
        input: validBrief,
        requestId: "local-provider-fixture",
        model: "fixture",
        promptVersion: "1.2.0",
        schemaVersion: "1.0",
        timeoutMs: 10_000,
      },
      BrandProfileSchema,
    )
  ).data;
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      const body = JSON.parse(raw) as {
        model: string;
        format: unknown;
        think: unknown;
      };
      seen.push({ model: body.model, format: body.format, think: body.think });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          message: { content: JSON.stringify(profile) },
          prompt_eval_count: 1200,
          eval_count: 800,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  Object.assign(process.env, {
    AI_PROVIDER_DEFAULT: "LOCAL",
    AI_REAL_GENERATION_ENABLED: "true",
    AI_FAKE_OPENAI_ENABLED: "false",
    AI_COST_TRACKING_ENABLED: "true",
    AI_OLLAMA_BASE_URL: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    AI_OLLAMA_MODEL: "gemma4:12b-it-qat",
    AI_OLLAMA_STRUCTURED_MODE: "native_schema",
  });
  await prisma.user.upsert({
    where: { id: "local-provider-owner" },
    update: {},
    create: {
      id: "local-provider-owner",
      email: "local-provider@test.invalid",
    },
  });
});

afterAll(async () => {
  process.env = { ...saved };
  await prisma.project.deleteMany({
    where: { userId: "local-provider-owner" },
  });
  await prisma.user.deleteMany({ where: { id: "local-provider-owner" } });
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

describe("LOCAL generation provider (ADR-070)", () => {
  it("creates REAL jobs recorded as LOCAL from the environment", async () => {
    const { getNewJobGenerationConfiguration } =
      await import("../../src/server/ai/job-configuration");
    expect(
      getNewJobGenerationConfiguration({
        promptKey: "brand_profile.brand_profile.generation",
      }),
    ).toMatchObject({ mode: "REAL", provider: "LOCAL" });
  });

  it("runs a Brand Profile job on the local model and records LOCAL usage at zero cost", async () => {
    await prisma.project.create({
      data: {
        id: "local-provider-project",
        userId: "local-provider-owner",
        name: "UrbanStride",
        brandName: "UrbanStride",
        type: "E-commerce",
        status: "ACTIVE",
        brief: {
          create: { schemaVersion: "1.0", revision: 1, data: validBrief },
        },
        generationJobs: {
          create: {
            scopeType: "BRAND_PROFILE",
            scopeId: "local-provider-project",
            module: "BRAND_PROFILE",
            status: "QUEUED",
            mode: "REAL",
            provider: "LOCAL",
            idempotencyKey: "brand-profile:local",
            request: { briefRevision: 1, briefSnapshot: validBrief },
            steps: {
              create: [
                {
                  key: "prepare",
                  label: "Preparing project context",
                  ordinal: 0,
                },
                {
                  key: "generate",
                  label: "Generating Brand Profile",
                  ordinal: 1,
                },
                { key: "validate", label: "Validating profile", ordinal: 2 },
                { key: "save", label: "Saving profile", ordinal: 3 },
              ],
            },
          },
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);

    const job = await prisma.generationJob.findFirstOrThrow({
      where: { projectId: "local-provider-project" },
    });
    expect(job).toMatchObject({
      status: "COMPLETED",
      mode: "REAL",
      provider: "LOCAL",
      runtimeKey: "ollama",
      modelId: "gemma4:12b-it-qat",
      modelRef: "ollama/gemma4:12b-it-qat",
      providerKind: "local",
      structuredMode: "native_schema",
      fallbackUsed: false,
    });
    expect(seen.at(-1)).toMatchObject({
      model: "gemma4:12b-it-qat",
      think: false,
    });
    expect(seen.at(-1)!.format).toBeTypeOf("object");

    const usage = await prisma.generationUsage.findMany({
      where: { generationJobId: job.id },
    });
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({
      provider: "LOCAL",
      totalTokens: 2000,
      currency: "EUR",
    });
    expect(usage[0]!.estimatedCostMinorUnits).toBe(BigInt(0));

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "local-provider-project" },
      include: { currentBrandProfileVersion: true },
    });
    expect(project.currentBrandProfileVersion).not.toBeNull();
  });
});
