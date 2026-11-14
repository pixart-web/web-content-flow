import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseClientEnv } from "./client";
import { parseServerEnv } from "./server";

describe("environment validation", () => {
  it("accepts valid foundational environment values", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        DATABASE_URL:
          "postgresql://web_content_flow:web_content_flow@localhost:5432/web_content_flow",
        AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        AUTH_URL: "http://localhost:3000",
      }),
    ).toMatchObject({
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL:
        "postgresql://web_content_flow:web_content_flow@localhost:5432/web_content_flow",
      AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      AUTH_URL: "http://localhost:3000",
    });
  });

  it("treats blank optional secrets from .env.example as unset", () => {
    const env = parseServerEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      AUTH_URL: "http://localhost:3000",
      RESEND_API_KEY: "",
      RATE_LIMIT_SECRET: "",
      OPENAI_API_KEY: "",
    });

    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.RATE_LIMIT_SECRET).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });

  it("still requires a key when a blank secret's feature is enabled", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        AUTH_URL: "http://localhost:3000",
        EMAIL_PROVIDER: "RESEND",
        RESEND_API_KEY: "",
      }),
    ).toThrow(/RESEND_API_KEY is required/);
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        AUTH_URL: "http://localhost:3000",
        AI_REAL_GENERATION_ENABLED: "true",
        OPENAI_API_KEY: "",
      }),
    ).toThrow(/OPENAI_API_KEY is required/);
  });

  it("rejects invalid public URLs", () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" }),
    ).toThrow();
  });

  it("rejects capture mode in deployed environments", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        APP_ENV: "staging",
        DATABASE_ENVIRONMENT: "staging",
        NEXT_PUBLIC_APP_URL: "https://staging.example.test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        AUTH_URL: "https://staging.example.test",
        EMAIL_PROVIDER: "RESEND",
        RESEND_API_KEY: "test-provider-key-not-a-real-secret",
        RATE_LIMIT_SECRET: "test-rate-limit-secret-at-least-32-characters",
        PUBLIC_REGISTRATION_ENABLED: "false",
        MARKETING_CAPTURE_MODE: "true",
      }),
    ).toThrow();
  });

  it("rejects staging paired with a production database marker", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        APP_ENV: "staging",
        DATABASE_ENVIRONMENT: "production",
        NEXT_PUBLIC_APP_URL: "https://staging.example.test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        AUTH_URL: "https://staging.example.test",
        EMAIL_PROVIDER: "RESEND",
        RESEND_API_KEY: "test-provider-key-not-a-real-secret",
        RATE_LIMIT_SECRET: "test-rate-limit-secret-at-least-32-characters",
        PUBLIC_REGISTRATION_ENABLED: "false",
      }),
    ).toThrow(/database environment marker/i);
  });

  it("requires SMTP credentials and a TLS mode that matches the port", () => {
    const base = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      AUTH_URL: "http://localhost:3000",
      EMAIL_PROVIDER: "SMTP",
    };
    expect(() => parseServerEnv(base)).toThrow(/SMTP_HOST, SMTP_USER/);
    const configured = {
      ...base,
      SMTP_HOST: "mail.example.test",
      SMTP_USER: "noreply@example.test",
      SMTP_PASSWORD: "test-password-not-real",
    };
    expect(parseServerEnv(configured)).toMatchObject({
      SMTP_PORT: 587,
      SMTP_SECURE: false,
    });
    expect(() => parseServerEnv({ ...configured, SMTP_PORT: "465" })).toThrow(
      /SMTP_SECURE=true with port 465/,
    );
    expect(
      parseServerEnv({ ...configured, SMTP_PORT: "465", SMTP_SECURE: "true" }),
    ).toMatchObject({ SMTP_PORT: 465, SMTP_SECURE: true });
  });
});
