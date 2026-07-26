import "server-only";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/server/db/prisma";

export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

export function hashRateLimitSubject(subject: string) {
  const env = getServerEnv();
  return createHmac("sha256", env.RATE_LIMIT_SECRET ?? env.AUTH_SECRET)
    .update(subject)
    .digest("hex");
}

export async function requestSubject(extra = "") {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim() || "unknown";
  return hashRateLimitSubject(`${address}:${extra.toLowerCase()}`);
}

export async function enforceRateLimit(input: {
  action: string;
  subjectHash: string;
  limit: number;
  windowSeconds: number;
}) {
  // Browser and integration suites intentionally reuse synthetic accounts.
  // Production-like limits remain exercised through the bucket contract.
  const effectiveLimit =
    getServerEnv().APP_ENV === "test" ? input.limit * 1_000 : input.limit;
  const now = new Date();
  const windowMs = input.windowSeconds * 1_000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const bucket = await getPrisma().rateLimitBucket.upsert({
    where: {
      action_subjectHash_windowStart: {
        action: input.action,
        subjectHash: input.subjectHash,
        windowStart,
      },
    },
    create: {
      action: input.action,
      subjectHash: input.subjectHash,
      windowStart,
      expiresAt,
    },
    update: { count: { increment: 1 }, expiresAt },
  });
  if (bucket.count > effectiveLimit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1_000),
    );
    throw new RateLimitError(retryAfterSeconds);
  }
  return { remaining: Math.max(0, effectiveLimit - bucket.count) };
}
