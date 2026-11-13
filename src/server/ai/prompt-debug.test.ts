import { afterEach, describe, expect, it, vi } from "vitest";

import { debugResolvedPrompt } from "./prompt-debug";

vi.mock("server-only", () => ({}));

const prompt = {
  jobId: "job_1",
  promptKey: "copy.test",
  promptVersion: "1.0.0",
  model: "gpt-test",
  purpose: "ITEM_GENERATION",
  systemInstructions: "system",
  userMessage: "user",
};

describe("debugResolvedPrompt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prints the resolved prompt when enabled outside production", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    debugResolvedPrompt(
      { AI_PROMPT_DEBUG_ENABLED: true, NODE_ENV: "development" },
      prompt,
    );
    expect(JSON.parse(String(debug.mock.calls[0]?.[0]))).toMatchObject({
      event: "ai.prompt.debug",
      userMessage: "user",
    });
  });

  it("stays silent when disabled or in production", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    debugResolvedPrompt(
      { AI_PROMPT_DEBUG_ENABLED: false, NODE_ENV: "development" },
      prompt,
    );
    debugResolvedPrompt(
      { AI_PROMPT_DEBUG_ENABLED: true, NODE_ENV: "production" },
      prompt,
    );
    expect(debug).not.toHaveBeenCalled();
  });
});
