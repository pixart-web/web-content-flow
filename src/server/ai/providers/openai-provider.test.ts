import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { OpenAIProvider } from "./openai-provider";

vi.mock("server-only", () => ({}));

const Output = z.object({ value: z.string() }).strict();

function request(signal?: AbortSignal) {
  return {
    input: {},
    requestId: "job_test",
    model: "gpt-test",
    promptVersion: "1.0.0",
    schemaVersion: "1.0",
    timeoutMs: 30_000,
    ...(signal ? { signal } : {}),
  };
}

function providerWithHangingCall() {
  let receivedSignal: AbortSignal | undefined;
  const parse = vi.fn(
    (_body: unknown, options: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        receivedSignal = options.signal;
        options.signal.addEventListener("abort", () => {
          reject(new OpenAI.APIUserAbortError());
        });
      }),
  );
  const client = { responses: { parse } } as unknown as OpenAI;
  return {
    provider: new OpenAIProvider({ apiKey: "unused", client }),
    parse,
    signal: () => receivedSignal,
  };
}

describe("OpenAIProvider cancellation", () => {
  it("aborts the in-flight request when the caller signal aborts", async () => {
    const { provider, signal } = providerWithHangingCall();
    const controller = new AbortController();
    const pending = provider.generateStructured(
      request(controller.signal),
      Output,
    );
    await vi.waitFor(() => expect(signal()).toBeDefined());
    controller.abort();
    await expect(pending).rejects.toMatchObject({
      code: "CANCELLED",
      retryable: false,
    });
    expect(signal()?.aborted).toBe(true);
  });

  it("reports its own timeout as a retryable TIMEOUT", async () => {
    vi.useFakeTimers();
    try {
      const { provider } = providerWithHangingCall();
      const pending = provider.generateStructured(request(), Output);
      const assertion = expect(pending).rejects.toMatchObject({
        code: "TIMEOUT",
        retryable: true,
      });
      await vi.advanceTimersByTimeAsync(30_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
