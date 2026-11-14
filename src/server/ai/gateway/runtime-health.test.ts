import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeOllamaModel, probeRuntime } from "./runtime-health";

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
  }
  server = undefined;
});

async function fakeRuntime(
  handler: (url: string, auth: string | undefined) => [number, unknown] | null,
) {
  server = createServer((request, response) => {
    const answer = handler(request.url ?? "", request.headers.authorization);
    if (answer === null) return; // never answers: exercises the timeout
    response.writeHead(answer[0], { "Content-Type": "application/json" });
    response.end(JSON.stringify(answer[1]));
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("runtime health probe (C-03)", () => {
  it("normalizes untagged Ollama names to :latest", () => {
    expect(normalizeOllamaModel("gemma4")).toBe("gemma4:latest");
    expect(normalizeOllamaModel("qwen3.5:4b")).toBe("qwen3.5:4b");
  });

  it("reports ok when Ollama serves the configured model", async () => {
    const baseUrl = await fakeRuntime((url) =>
      url === "/api/tags"
        ? [
            200,
            {
              models: [
                { name: "gemma4:12b-it-qat" },
                { name: "llama3:latest" },
              ],
            },
          ]
        : [404, {}],
    );
    const ok = await probeRuntime({
      runtimeKey: "ollama",
      baseUrl,
      model: "gemma4:12b-it-qat",
    });
    expect(ok).toMatchObject({
      status: "ok",
      availableModels: ["gemma4:12b-it-qat", "llama3:latest"],
    });
    expect(ok.latencyMs).toBeGreaterThanOrEqual(0);
    const untagged = await probeRuntime({
      runtimeKey: "ollama",
      baseUrl,
      model: "llama3",
    });
    expect(untagged.status).toBe("ok");
  });

  it("reports model_missing when the model was never pulled", async () => {
    const baseUrl = await fakeRuntime(() => [
      200,
      { models: [{ name: "qwen3.5:4b" }] },
    ]);
    const health = await probeRuntime({
      runtimeKey: "ollama",
      baseUrl,
      model: "gemma4:12b-it-qat",
    });
    expect(health).toMatchObject({
      status: "model_missing",
      availableModels: ["qwen3.5:4b"],
    });
  });

  it("lists OpenAI-compatible models with the bearer key", async () => {
    const seen: (string | undefined)[] = [];
    const baseUrl = await fakeRuntime((url, auth) => {
      seen.push(auth);
      return url === "/v1/models"
        ? [200, { data: [{ id: "mlx-community/Qwen3-8B-4bit" }] }]
        : [404, {}];
    });
    const health = await probeRuntime({
      runtimeKey: "openai-compatible",
      baseUrl,
      model: "mlx-community/Qwen3-8B-4bit",
      apiKey: "test-key-123",
    });
    expect(health.status).toBe("ok");
    expect(seen).toEqual(["Bearer test-key-123"]);
  });

  it("reports unreachable on HTTP errors, timeouts and closed ports", async () => {
    const failing = await fakeRuntime(() => [500, {}]);
    expect(
      await probeRuntime({
        runtimeKey: "ollama",
        baseUrl: failing,
        model: "m",
      }),
    ).toMatchObject({ status: "unreachable", detail: "HTTP 500" });
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));

    const silent = await fakeRuntime(() => null);
    expect(
      await probeRuntime({
        runtimeKey: "ollama",
        baseUrl: silent,
        model: "m",
        timeoutMs: 50,
      }),
    ).toMatchObject({ status: "unreachable", detail: "timeout" });
    server!.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
    server = undefined;

    expect(
      await probeRuntime({
        runtimeKey: "ollama",
        baseUrl: "http://127.0.0.1:1",
        model: "m",
      }),
    ).toMatchObject({ status: "unreachable" });
  });

  it("reports not_configured without a base URL or model", async () => {
    expect(
      await probeRuntime({
        runtimeKey: "openai-compatible",
        baseUrl: undefined,
        model: "m",
      }),
    ).toMatchObject({ status: "not_configured", latencyMs: null });
  });
});
