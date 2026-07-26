import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("password reset tokens", () => {
  it("hashes tokens deterministically without retaining the raw value", async () => {
    const { hashResetToken } = await import("./password-recovery");
    const raw = "synthetic-one-time-reset-token";
    const digest = hashResetToken(raw);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(raw);
    expect(hashResetToken(raw)).toBe(digest);
  });
});
