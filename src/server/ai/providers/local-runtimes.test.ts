import { createServer, type IncomingMessage, type Server } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { OllamaProvider } from "./ollama-provider";
import { OpenAICompatibleProvider } from "./openai-compatible-provider";

const Output = z.object({ headline: z.string(), points: z.array(z.string()) });
const valid = { headline: "City-ready trainers", points: ["light", "grippy"] };

type Reply = {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  delayMs?: number;
};

let server: Server | undefined;
let lastRequest:
  | {
      url: string;
      headers: IncomingMessage["headers"];
      body: Record<string, unknown>;
    }
  | undefined;

async function runtime(reply: Reply) {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      lastRequest = {
        url: request.url ?? "",
        headers: request.headers,
        body: JSON.parse(raw) as Record<string, unknown>,
      };
      const send = () => {
        response.writeHead(reply.status ?? 200, {
          "Content-Type": "application/json",
          ...reply.headers,
        });
        response.end(
          typeof reply.body === "string"
            ? reply.body
            : JSON.stringify(reply.body),
        );
      };
      if (reply.delayMs) setTimeout(send, reply.delayMs);
      else send();
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

afterEach(async () => {
  lastRequest = undefined;
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
  }
  server = undefined;
});

const request = (overrides: Record<string, unknown> = {}) => ({
  input: {},
  requestId: "job_local",
  model: "local-model",
  modelTier: "STANDARD" as const,
  promptVersion: "1.0.0",
  schemaVersion: "1.0",
  schemaName: "social_post",
  systemInstructions: "Brand rules.",
  userMessage: "Write a post.",
  maximumOutputTokens: 800,
  timeoutMs: 5_000,
  ...overrides,
});

const compatReply = (content: string, extra: Record<string, unknown> = {}) => ({
  id: "cmpl-1",
  choices: [{ message: { content }, finish_reason: "stop" }],
  usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
  ...extra,
});

describe("OpenAICompatibleProvider (C-02)", () => {
  it("sends a chat completion with a JSON-schema response format and validates the result", async () => {
    const baseUrl = await runtime({ body: compatReply(JSON.stringify(valid)) });
    const provider = new OpenAICompatibleProvider({
      baseUrl,
      apiKey: "test-key-not-real",
      structuredMode: "native_schema",
    });
    const result = await provider.generateStructured(request(), Output);
    expect(result).toMatchObject({
      data: valid,
      provider: "openai-compatible",
      model: "local-model",
      usage: {
        inputTokens: 120,
        outputTokens: 40,
        totalTokens: 160,
        usageSource: "PROVIDER_REPORTED",
      },
    });
    expect(lastRequest?.url).toBe("/v1/chat/completions");
    expect(lastRequest?.headers.authorization).toBe("Bearer test-key-not-real");
    expect(lastRequest?.body).toMatchObject({
      model: "local-model",
      max_tokens: 800,
      response_format: {
        type: "json_schema",
        json_schema: { name: "social_post", strict: true },
      },
    });
  });

  it("uses json_object plus schema instructions in json_mode, and strips fences", async () => {
    const baseUrl = await runtime({
      body: compatReply("```json\n" + JSON.stringify(valid) + "\n```"),
    });
    const provider = new OpenAICompatibleProvider({
      baseUrl,
      structuredMode: "json_mode",
    });
    await expect(
      provider.generateStructured(request(), Output),
    ).resolves.toMatchObject({ data: valid });
    const messages = lastRequest?.body.messages as {
      role: string;
      content: string;
    }[];
    expect(lastRequest?.body.response_format).toEqual({ type: "json_object" });
    expect(messages[0]!.content).toContain("JSON Schema");
    expect(lastRequest?.headers.authorization).toBeUndefined();
  });

  it("sends no response_format in prompted mode", async () => {
    const baseUrl = await runtime({ body: compatReply(JSON.stringify(valid)) });
    await new OpenAICompatibleProvider({
      baseUrl,
      structuredMode: "prompted",
    }).generateStructured(request(), Output);
    expect(lastRequest?.body.response_format).toBeUndefined();
  });

  it.each([
    ["not json at all", "Output is not valid JSON."],
    [JSON.stringify({ headline: 3 }), "headline"],
  ])(
    "rejects invalid output %s with repair details",
    async (content, issue) => {
      const baseUrl = await runtime({ body: compatReply(content) });
      const failure = new OpenAICompatibleProvider({
        baseUrl,
        structuredMode: "json_mode",
      }).generateStructured(request(), Output);
      await expect(failure).rejects.toMatchObject({
        code: "SCHEMA_VALIDATION_FAILED",
        retryable: false,
      });
      await failure.catch(
        (error: { validationIssues?: string[]; rejectedOutput?: unknown }) => {
          expect(error.validationIssues?.join(" ")).toContain(issue);
          expect(error.rejectedOutput).toBeDefined();
        },
      );
    },
  );

  it("treats truncation and refusals as non-retryable", async () => {
    let baseUrl = await runtime({
      body: {
        choices: [
          { message: { content: '{"headline":' }, finish_reason: "length" },
        ],
      },
    });
    await expect(
      new OpenAICompatibleProvider({
        baseUrl,
        structuredMode: "json_mode",
      }).generateStructured(request(), Output),
    ).rejects.toMatchObject({ code: "SCHEMA_VALIDATION_FAILED" });
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
    baseUrl = await runtime({
      body: { choices: [{ message: { content: null, refusal: "no" } }] },
    });
    await expect(
      new OpenAICompatibleProvider({
        baseUrl,
        structuredMode: "json_mode",
      }).generateStructured(request(), Output),
    ).rejects.toMatchObject({ code: "CONTENT_REFUSED", retryable: false });
  });

  it("reports missing usage as UNAVAILABLE", async () => {
    const baseUrl = await runtime({
      body: { choices: [{ message: { content: JSON.stringify(valid) } }] },
    });
    const result = await new OpenAICompatibleProvider({
      baseUrl,
      structuredMode: "json_mode",
    }).generateStructured(request(), Output);
    expect(result.usage).toEqual({ usageSource: "UNAVAILABLE" });
  });
});

describe("OllamaProvider (C-03)", () => {
  it("calls /api/chat with the JSON Schema as format and maps token counts", async () => {
    const baseUrl = await runtime({
      body: {
        message: { content: JSON.stringify(valid) },
        done_reason: "stop",
        prompt_eval_count: 90,
        eval_count: 30,
      },
    });
    const result = await new OllamaProvider({ baseUrl }).generateStructured(
      request(),
      Output,
    );
    expect(result).toMatchObject({
      data: valid,
      provider: "ollama",
      usage: {
        inputTokens: 90,
        outputTokens: 30,
        totalTokens: 120,
        usageSource: "PROVIDER_REPORTED",
      },
    });
    expect(lastRequest?.url).toBe("/api/chat");
    expect(lastRequest?.body).toMatchObject({
      model: "local-model",
      stream: false,
      format: { type: "object", required: ["headline", "points"] },
      options: { num_predict: 800 },
    });
  });

  it("disables thinking by default and supports json and prompted modes", async () => {
    const reply = {
      body: { message: { content: JSON.stringify(valid) }, eval_count: 5 },
    };
    let baseUrl = await runtime(reply);
    await new OllamaProvider({ baseUrl }).generateStructured(request(), Output);
    expect(lastRequest?.body.think).toBe(false);
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
    baseUrl = await runtime(reply);
    await new OllamaProvider({
      baseUrl,
      structuredMode: "json_mode",
    }).generateStructured(request(), Output);
    expect(lastRequest?.body.format).toBe("json");
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
    baseUrl = await runtime(reply);
    await new OllamaProvider({
      baseUrl,
      structuredMode: "prompted",
      think: true,
    }).generateStructured(request(), Output);
    expect(lastRequest?.body.format).toBeUndefined();
    expect(lastRequest?.body.think).toBe(true);
    const messages = lastRequest?.body.messages as { content: string }[];
    expect(messages[0]!.content).toContain("JSON Schema");
  });

  it("maps a missing model to UNSUPPORTED_MODEL", async () => {
    const baseUrl = await runtime({
      status: 404,
      body: { error: "model not found" },
    });
    await expect(
      new OllamaProvider({ baseUrl }).generateStructured(request(), Output),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_MODEL",
      retryable: false,
    });
  });
});

describe("shared HTTP failure handling", () => {
  const providers = (baseUrl: string) => [
    new OllamaProvider({ baseUrl }),
    new OpenAICompatibleProvider({ baseUrl, structuredMode: "json_mode" }),
  ];

  it.each([
    [429, { "Retry-After": "7" }, "RATE_LIMITED", true, 7_000],
    [503, {}, "PROVIDER_UNAVAILABLE", true, undefined],
    [500, {}, "PROVIDER_SERVER_ERROR", true, undefined],
    [401, {}, "AUTHENTICATION_FAILED", false, undefined],
    [400, {}, "INVALID_PROVIDER_RESPONSE", false, undefined],
  ])("HTTP %i → %s", async (status, headers, code, retryable, retryAfterMs) => {
    const baseUrl = await runtime({ status, headers, body: { error: "x" } });
    for (const provider of providers(baseUrl))
      await expect(
        provider.generateStructured(request(), Output),
      ).rejects.toMatchObject({
        code,
        retryable,
        ...(retryAfterMs ? { retryAfterMs } : {}),
      });
  });

  it("classifies its own timeout as retryable TIMEOUT", async () => {
    const baseUrl = await runtime({ delayMs: 2_000, body: {} });
    for (const provider of providers(baseUrl))
      await expect(
        provider.generateStructured(request({ timeoutMs: 100 }), Output),
      ).rejects.toMatchObject({
        code: "TIMEOUT",
        retryable: true,
      });
  });

  it("classifies a caller abort (lost lease) as CANCELLED", async () => {
    const baseUrl = await runtime({ delayMs: 2_000, body: {} });
    for (const provider of providers(baseUrl)) {
      const controller = new AbortController();
      const pending = provider.generateStructured(
        request({ signal: controller.signal }),
        Output,
      );
      setTimeout(() => controller.abort(), 50);
      await expect(pending).rejects.toMatchObject({
        code: "CANCELLED",
        retryable: false,
      });
    }
  });

  it("classifies an unreachable runtime as retryable TRANSIENT_NETWORK", async () => {
    const baseUrl = await runtime({ body: {} });
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
    server = undefined;
    for (const provider of providers(baseUrl))
      await expect(
        provider.generateStructured(request(), Output),
      ).rejects.toMatchObject({
        code: "TRANSIENT_NETWORK",
        retryable: true,
      });
  });
});
