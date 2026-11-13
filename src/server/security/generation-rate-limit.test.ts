import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const enforceRateLimit = vi.fn();

vi.mock("@/server/security/rate-limit", () => {
  class RateLimitError extends Error {
    constructor(readonly retryAfterSeconds: number) {
      super("RATE_LIMITED");
    }
  }
  return {
    RateLimitError,
    enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
    hashRateLimitSubject: (subject: string) => `hash:${subject}`,
  };
});

async function load() {
  const helper = await import("./generation-rate-limit");
  const limiter = await import("@/server/security/rate-limit");
  return { ...helper, RateLimitError: limiter.RateLimitError };
}

describe("checkGenerationRateLimit", () => {
  beforeEach(() => {
    enforceRateLimit.mockReset();
  });

  it("allows a request within the per-user bucket", async () => {
    const { checkGenerationRateLimit, GENERATION_RATE_LIMIT } = await load();
    enforceRateLimit.mockResolvedValue({ remaining: 29 });
    await expect(checkGenerationRateLimit("user_1")).resolves.toBeNull();
    expect(enforceRateLimit).toHaveBeenCalledWith({
      action: "generation-enqueue",
      subjectHash: "hash:user:user_1",
      ...GENERATION_RATE_LIMIT,
    });
  });

  it("returns a safe RATE_LIMITED result when the bucket is full", async () => {
    const { checkGenerationRateLimit, RateLimitError } = await load();
    enforceRateLimit.mockImplementation(async () => {
      throw new RateLimitError(42);
    });
    await expect(checkGenerationRateLimit("user_1")).resolves.toEqual({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many generation requests. Try again in 42 seconds.",
      },
    });
  });

  it("does not hide unexpected limiter failures", async () => {
    const { checkGenerationRateLimit } = await load();
    enforceRateLimit.mockImplementation(async () => {
      throw new Error("database unavailable");
    });
    await expect(checkGenerationRateLimit("user_1")).rejects.toThrow(
      "database unavailable",
    );
  });
});
