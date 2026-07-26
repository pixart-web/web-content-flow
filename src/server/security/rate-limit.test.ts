import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-characters");
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
});

describe("rate-limit identities", () => {
  it("uses a one-way stable keyed digest", async () => {
    const { hashRateLimitSubject } = await import("./rate-limit");
    const first = hashRateLimitSubject("person@example.test");
    expect(first).toHaveLength(64);
    expect(first).toBe(hashRateLimitSubject("person@example.test"));
    expect(first).not.toContain("person@example.test");
  });
});
