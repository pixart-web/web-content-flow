import "server-only";

import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");
const enabledFromEnv = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");
const integerFromEnv = (minimum: number, maximum: number, fallback: number) =>
  z.coerce.number().int().min(minimum).max(maximum).default(fallback);
// Blank values such as `OPENAI_API_KEY=` in .env.example mean "not set".
const optionalSecretFromEnv = (minimum: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimum).optional(),
  );

const optionalUrlFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
const optionalTextFromEnv = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).max(maximum).optional(),
  );

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXT_PUBLIC_APP_URL: z.url(),
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    DATABASE_ENVIRONMENT: z
      .enum(["local", "test", "staging", "production"])
      .default("local"),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.url(),
    APP_ENV: z
      .enum(["local", "test", "staging", "production"])
      .default("local"),
    // L1 (ADR L-1): "server" is the hosted/private-server app; "local" is the
    // desktop edition on the user's computer (loopback only, no email needed).
    APP_MODE: z.enum(["server", "local"]).default("server"),
    // Per-launch secret the desktop shell sends on every request (LF-03).
    DESKTOP_TOKEN: optionalSecretFromEnv(32),
    // Held only by the desktop shell's main process, never by the window:
    // authorizes local administration such as the owner password reset after
    // macOS authentication (decision 2026-11-14).
    DESKTOP_ADMIN_TOKEN: optionalSecretFromEnv(32),
    ROLLOUT_STATE: z
      .enum(["INTERNAL", "INVITE_ONLY", "PUBLIC", "MAINTENANCE"])
      .default("INTERNAL"),
    PUBLIC_REGISTRATION_ENABLED: enabledFromEnv,
    EMAIL_VERIFICATION_REQUIRED: booleanFromEnv,
    EXPORTS_ENABLED: enabledFromEnv,
    PROJECT_PACKAGE_EXPORT_ENABLED: enabledFromEnv,
    ACCOUNT_DELETION_ENABLED: booleanFromEnv,
    PUBLIC_PRICING_ENABLED: enabledFromEnv,
    MARKETING_INDEXING_ENABLED: booleanFromEnv,
    MARKETING_CAPTURE_MODE: booleanFromEnv,
    EMAIL_PROVIDER: z.enum(["MOCK", "RESEND", "SMTP"]).default("MOCK"),
    RESEND_API_KEY: optionalSecretFromEnv(20),
    SMTP_HOST: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(3).max(253).optional(),
    ),
    SMTP_PORT: integerFromEnv(1, 65_535, 587),
    SMTP_SECURE: booleanFromEnv,
    SMTP_USER: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).max(320).optional(),
    ),
    SMTP_PASSWORD: optionalSecretFromEnv(8),
    EMAIL_FROM: z.string().email().default("noreply@webcontentflow.local"),
    SUPPORT_EMAIL: z.string().email().default("support@webcontentflow.local"),
    LEGAL_TERMS_VERSION: z.string().min(1).max(40).default("draft-2026-07"),
    LEGAL_PRIVACY_VERSION: z.string().min(1).max(40).default("draft-2026-07"),
    EXPORT_RETENTION_HOURS: integerFromEnv(1, 168, 24),
    EXPORT_MAX_BYTES: integerFromEnv(10_000, 20_000_000, 2_000_000),
    RATE_LIMIT_SECRET: optionalSecretFromEnv(32),
    AI_PROVIDER_DEFAULT: z.enum(["MOCK", "OPENAI"]).default("MOCK"),
    AI_REAL_GENERATION_ENABLED: booleanFromEnv,
    AI_FAKE_OPENAI_ENABLED: booleanFromEnv,
    OPENAI_API_KEY: optionalSecretFromEnv(20),
    OPENAI_MODEL_STANDARD: z.string().min(2).max(100).default("gpt-5.6-terra"),
    OPENAI_MODEL_PREMIUM: z.string().min(2).max(100).default("gpt-5.6-sol"),
    OPENAI_MODEL_REPAIR: z.string().min(2).max(100).default("gpt-5.6-luna"),
    // Phase C: optional local/self-hosted runtimes. Registered for evaluation
    // only (ADR-077); default policies never route to them.
    AI_OLLAMA_BASE_URL: optionalUrlFromEnv,
    AI_OLLAMA_MODEL: optionalTextFromEnv(200),
    // Some models/engines reject Ollama's `format` (e.g. qwen3.5 on Ollama
    // 0.40: "structured output is unavailable"); use "prompted" for them.
    AI_OLLAMA_STRUCTURED_MODE: z
      .enum(["native_schema", "json_mode", "prompted"])
      .default("native_schema"),
    // Thinking models default to reasoning first, which spends the output
    // budget before the JSON; generation disables it unless set to true.
    AI_OLLAMA_THINK: booleanFromEnv,
    AI_OPENAI_COMPATIBLE_BASE_URL: optionalUrlFromEnv,
    AI_OPENAI_COMPATIBLE_MODEL: optionalTextFromEnv(200),
    AI_OPENAI_COMPATIBLE_API_KEY: optionalSecretFromEnv(8),
    AI_OPENAI_COMPATIBLE_STRUCTURED_MODE: z
      .enum(["native_schema", "json_mode", "prompted"])
      .default("json_mode"),
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
    const applicationUrl = new URL(value.NEXT_PUBLIC_APP_URL);
    const localOrigin =
      applicationUrl.hostname === "localhost" ||
      applicationUrl.hostname === "127.0.0.1";
    const localMode = value.APP_MODE === "local";
    if (localMode) {
      for (const key of ["NEXT_PUBLIC_APP_URL", "AUTH_URL"] as const) {
        const url = new URL(value[key]);
        if (
          !["127.0.0.1", "localhost"].includes(url.hostname) ||
          url.protocol !== "http:"
        )
          context.addIssue({
            code: "custom",
            path: [key],
            message: "Local mode serves the app on http://127.0.0.1 only.",
          });
      }
      if (!["local", "test"].includes(value.APP_ENV))
        context.addIssue({
          code: "custom",
          path: ["APP_ENV"],
          message: "Local mode runs with APP_ENV=local.",
        });
      if (value.MARKETING_INDEXING_ENABLED)
        context.addIssue({
          code: "custom",
          path: ["MARKETING_INDEXING_ENABLED"],
          message: "Local mode is never indexed.",
        });
      if (
        value.DESKTOP_ADMIN_TOKEN &&
        value.DESKTOP_ADMIN_TOKEN === value.DESKTOP_TOKEN
      )
        context.addIssue({
          code: "custom",
          path: ["DESKTOP_ADMIN_TOKEN"],
          message: "The admin token must differ from the window token.",
        });
      // The token is generated per launch, so it does not exist at build
      // time; at runtime the proxy also fails closed without it.
      if (
        value.NODE_ENV === "production" &&
        !value.DESKTOP_TOKEN &&
        process.env.NEXT_PHASE !== "phase-production-build"
      )
        context.addIssue({
          code: "custom",
          path: ["DESKTOP_TOKEN"],
          message: "Local mode requires the desktop shell token.",
        });
    }
    if (
      value.NODE_ENV === "production" &&
      applicationUrl.protocol !== "https:" &&
      !localMode
    )
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "Production application URLs must use HTTPS.",
      });
    if (
      value.NODE_ENV !== "production" &&
      applicationUrl.protocol !== "https:" &&
      !(localOrigin && applicationUrl.protocol === "http:")
    )
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "Only HTTPS or documented local HTTP origins are allowed.",
      });
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
    if (value.EMAIL_PROVIDER === "RESEND" && !value.RESEND_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required for real transactional email.",
      });
    for (const [url, model, prefix] of [
      [value.AI_OLLAMA_BASE_URL, value.AI_OLLAMA_MODEL, "AI_OLLAMA"],
      [
        value.AI_OPENAI_COMPATIBLE_BASE_URL,
        value.AI_OPENAI_COMPATIBLE_MODEL,
        "AI_OPENAI_COMPATIBLE",
      ],
    ] as const)
      if (Boolean(url) !== Boolean(model))
        context.addIssue({
          code: "custom",
          path: [`${prefix}_BASE_URL`],
          message: `${prefix}_BASE_URL and ${prefix}_MODEL must be set together.`,
        });
    if (
      value.EMAIL_PROVIDER === "SMTP" &&
      (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASSWORD)
    )
      context.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message:
          "SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required for SMTP email.",
      });
    if (
      value.EMAIL_PROVIDER === "SMTP" &&
      value.SMTP_SECURE !== (value.SMTP_PORT === 465)
    )
      context.addIssue({
        code: "custom",
        path: ["SMTP_SECURE"],
        message:
          "Use SMTP_SECURE=true with port 465 (implicit TLS) and false with STARTTLS ports such as 587.",
      });
    // Local mode needs no email: MOCK means "no outgoing mail" there.
    if (
      value.NODE_ENV === "production" &&
      value.EMAIL_PROVIDER === "MOCK" &&
      !localMode
    )
      context.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "Production requires a real transactional email provider.",
      });
    if (value.NODE_ENV === "production" && !value.RATE_LIMIT_SECRET)
      context.addIssue({
        code: "custom",
        path: ["RATE_LIMIT_SECRET"],
        message: "Production requires RATE_LIMIT_SECRET.",
      });
    if (
      value.MARKETING_CAPTURE_MODE &&
      (value.NODE_ENV === "production" ||
        !["local", "test"].includes(value.APP_ENV))
    )
      context.addIssue({
        code: "custom",
        path: ["MARKETING_CAPTURE_MODE"],
        message:
          "Marketing capture mode is restricted to local and test runtimes.",
      });
    if (
      ["staging", "production"].includes(value.APP_ENV) &&
      value.DATABASE_ENVIRONMENT !== value.APP_ENV
    )
      context.addIssue({
        code: "custom",
        path: ["DATABASE_ENVIRONMENT"],
        message:
          "The database environment marker must match the deployed application environment.",
      });
    if (
      value.APP_ENV === "staging" &&
      (value.PUBLIC_REGISTRATION_ENABLED ||
        value.MARKETING_INDEXING_ENABLED ||
        value.AI_REAL_GENERATION_ENABLED ||
        value.MARKETING_CAPTURE_MODE)
    )
      context.addIssue({
        code: "custom",
        path: ["APP_ENV"],
        message:
          "Staging requires registration, indexing, real AI, and capture mode to remain disabled.",
      });
    if (
      value.MARKETING_CAPTURE_MODE &&
      (value.PUBLIC_REGISTRATION_ENABLED || value.MARKETING_INDEXING_ENABLED)
    )
      context.addIssue({
        code: "custom",
        path: ["MARKETING_CAPTURE_MODE"],
        message:
          "Capture mode requires public registration and indexing to remain disabled.",
      });
    if (
      value.MARKETING_CAPTURE_MODE &&
      (value.AI_PROVIDER_DEFAULT !== "MOCK" ||
        value.AI_REAL_GENERATION_ENABLED ||
        value.EMAIL_PROVIDER !== "MOCK")
    )
      context.addIssue({
        code: "custom",
        path: ["MARKETING_CAPTURE_MODE"],
        message:
          "Capture mode requires mock AI, disabled real generation, and mock email.",
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
    DATABASE_ENVIRONMENT: process.env.DATABASE_ENVIRONMENT,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    APP_ENV: process.env.APP_ENV,
    APP_MODE: process.env.APP_MODE,
    DESKTOP_TOKEN: process.env.DESKTOP_TOKEN,
    DESKTOP_ADMIN_TOKEN: process.env.DESKTOP_ADMIN_TOKEN,
    ROLLOUT_STATE: process.env.ROLLOUT_STATE,
    PUBLIC_REGISTRATION_ENABLED: process.env.PUBLIC_REGISTRATION_ENABLED,
    EMAIL_VERIFICATION_REQUIRED: process.env.EMAIL_VERIFICATION_REQUIRED,
    EXPORTS_ENABLED: process.env.EXPORTS_ENABLED,
    PROJECT_PACKAGE_EXPORT_ENABLED: process.env.PROJECT_PACKAGE_EXPORT_ENABLED,
    ACCOUNT_DELETION_ENABLED: process.env.ACCOUNT_DELETION_ENABLED,
    PUBLIC_PRICING_ENABLED: process.env.PUBLIC_PRICING_ENABLED,
    MARKETING_INDEXING_ENABLED: process.env.MARKETING_INDEXING_ENABLED,
    MARKETING_CAPTURE_MODE: process.env.MARKETING_CAPTURE_MODE,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    LEGAL_TERMS_VERSION: process.env.LEGAL_TERMS_VERSION,
    LEGAL_PRIVACY_VERSION: process.env.LEGAL_PRIVACY_VERSION,
    EXPORT_RETENTION_HOURS: process.env.EXPORT_RETENTION_HOURS,
    EXPORT_MAX_BYTES: process.env.EXPORT_MAX_BYTES,
    RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
    AI_PROVIDER_DEFAULT: process.env.AI_PROVIDER_DEFAULT,
    AI_REAL_GENERATION_ENABLED: process.env.AI_REAL_GENERATION_ENABLED,
    AI_FAKE_OPENAI_ENABLED: process.env.AI_FAKE_OPENAI_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_STANDARD: process.env.OPENAI_MODEL_STANDARD,
    OPENAI_MODEL_PREMIUM: process.env.OPENAI_MODEL_PREMIUM,
    OPENAI_MODEL_REPAIR: process.env.OPENAI_MODEL_REPAIR,
    AI_OLLAMA_BASE_URL: process.env.AI_OLLAMA_BASE_URL,
    AI_OLLAMA_MODEL: process.env.AI_OLLAMA_MODEL,
    AI_OLLAMA_STRUCTURED_MODE: process.env.AI_OLLAMA_STRUCTURED_MODE,
    AI_OLLAMA_THINK: process.env.AI_OLLAMA_THINK,
    AI_OPENAI_COMPATIBLE_BASE_URL: process.env.AI_OPENAI_COMPATIBLE_BASE_URL,
    AI_OPENAI_COMPATIBLE_MODEL: process.env.AI_OPENAI_COMPATIBLE_MODEL,
    AI_OPENAI_COMPATIBLE_API_KEY: process.env.AI_OPENAI_COMPATIBLE_API_KEY,
    AI_OPENAI_COMPATIBLE_STRUCTURED_MODE:
      process.env.AI_OPENAI_COMPATIBLE_STRUCTURED_MODE,
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
