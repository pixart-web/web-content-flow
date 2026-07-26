import "server-only";

import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");
const integerFromEnv = (minimum: number, maximum: number, fallback: number) =>
  z.coerce.number().int().min(minimum).max(maximum).default(fallback);

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXT_PUBLIC_APP_URL: z.url(),
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.url(),
    AI_PROVIDER_DEFAULT: z.enum(["MOCK", "OPENAI"]).default("MOCK"),
    AI_REAL_GENERATION_ENABLED: booleanFromEnv,
    AI_FAKE_OPENAI_ENABLED: booleanFromEnv,
    OPENAI_API_KEY: z.string().min(20).optional(),
    OPENAI_MODEL_STANDARD: z.string().min(2).max(100).default("gpt-5.6-terra"),
    OPENAI_MODEL_PREMIUM: z.string().min(2).max(100).default("gpt-5.6-sol"),
    OPENAI_MODEL_REPAIR: z.string().min(2).max(100).default("gpt-5.6-luna"),
    AI_REQUEST_TIMEOUT_MS: integerFromEnv(10_000, 180_000, 60_000),
    AI_MAX_RETRIES: integerFromEnv(0, 3, 2),
    AI_MAX_CONCURRENT_REQUESTS: integerFromEnv(1, 16, 4),
    AI_MAX_ACTIVE_PROJECT_JOBS: integerFromEnv(1, 8, 2),
    AI_MAX_REQUEST_INPUT_TOKENS: integerFromEnv(1_000, 1_000_000, 120_000),
    AI_MAX_REQUEST_OUTPUT_TOKENS: integerFromEnv(256, 128_000, 12_000),
    AI_DAILY_PROJECT_TOKEN_LIMIT: integerFromEnv(1_000, 100_000_000, 1_000_000),
    AI_MONTHLY_PROJECT_TOKEN_LIMIT: integerFromEnv(
      1_000,
      1_000_000_000,
      10_000_000,
    ),
    AI_DAILY_ACCOUNT_TOKEN_LIMIT: integerFromEnv(1_000, 100_000_000, 2_000_000),
    AI_COST_TRACKING_ENABLED: booleanFromEnv,
    AI_PROMPT_DEBUG_ENABLED: booleanFromEnv,
  })
  .superRefine((value, context) => {
    if (
      value.AI_REAL_GENERATION_ENABLED &&
      !value.AI_FAKE_OPENAI_ENABLED &&
      !value.OPENAI_API_KEY
    )
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required when real generation is enabled.",
      });
    if (value.NODE_ENV === "production" && value.AI_FAKE_OPENAI_ENABLED)
      context.addIssue({
        code: "custom",
        path: ["AI_FAKE_OPENAI_ENABLED"],
        message: "The fake OpenAI transport is not allowed in production.",
      });
    if (value.NODE_ENV === "production" && value.AI_PROMPT_DEBUG_ENABLED)
      context.addIssue({
        code: "custom",
        path: ["AI_PROMPT_DEBUG_ENABLED"],
        message: "Prompt debugging is not allowed in production.",
      });
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: unknown): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AI_PROVIDER_DEFAULT: process.env.AI_PROVIDER_DEFAULT,
    AI_REAL_GENERATION_ENABLED: process.env.AI_REAL_GENERATION_ENABLED,
    AI_FAKE_OPENAI_ENABLED: process.env.AI_FAKE_OPENAI_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_STANDARD: process.env.OPENAI_MODEL_STANDARD,
    OPENAI_MODEL_PREMIUM: process.env.OPENAI_MODEL_PREMIUM,
    OPENAI_MODEL_REPAIR: process.env.OPENAI_MODEL_REPAIR,
    AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
    AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
    AI_MAX_CONCURRENT_REQUESTS: process.env.AI_MAX_CONCURRENT_REQUESTS,
    AI_MAX_ACTIVE_PROJECT_JOBS: process.env.AI_MAX_ACTIVE_PROJECT_JOBS,
    AI_MAX_REQUEST_INPUT_TOKENS: process.env.AI_MAX_REQUEST_INPUT_TOKENS,
    AI_MAX_REQUEST_OUTPUT_TOKENS: process.env.AI_MAX_REQUEST_OUTPUT_TOKENS,
    AI_DAILY_PROJECT_TOKEN_LIMIT: process.env.AI_DAILY_PROJECT_TOKEN_LIMIT,
    AI_MONTHLY_PROJECT_TOKEN_LIMIT: process.env.AI_MONTHLY_PROJECT_TOKEN_LIMIT,
    AI_DAILY_ACCOUNT_TOKEN_LIMIT: process.env.AI_DAILY_ACCOUNT_TOKEN_LIMIT,
    AI_COST_TRACKING_ENABLED: process.env.AI_COST_TRACKING_ENABLED,
    AI_PROMPT_DEBUG_ENABLED: process.env.AI_PROMPT_DEBUG_ENABLED,
  });
}
