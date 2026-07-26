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

  it("rejects invalid public URLs", () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" }),
    ).toThrow();
  });
});
