import "server-only";

import {
  RateLimitError,
  enforceRateLimit,
  hashRateLimitSubject,
} from "@/server/security/rate-limit";

// Applies to user-initiated actions that enqueue generation work (generate,
// regenerate, retry). Worker fan-out of child jobs is not affected. The quota
// reservation still bounds real-AI tokens; this bounds job volume, including
// mock-mode jobs, per account.
export const GENERATION_RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

export type GenerationRateLimited = {
  ok: false;
  error: { code: "RATE_LIMITED"; message: string };
};

export async function checkGenerationRateLimit(
  userId: string,
): Promise<GenerationRateLimited | null> {
  try {
    await enforceRateLimit({
      action: "generation-enqueue",
      subjectHash: hashRateLimitSubject(`user:${userId}`),
      ...GENERATION_RATE_LIMIT,
    });
    return null;
  } catch (error: unknown) {
    if (!(error instanceof RateLimitError)) throw error;
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many generation requests. Try again in ${error.retryAfterSeconds} seconds.`,
      },
    };
  }
}
