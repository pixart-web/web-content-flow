import { describe, expect, it } from "vitest";

import { passwordResetTemplate } from "./templates";

describe("transactional email templates", () => {
  it("renders versioned safe absolute reset links without tracking", () => {
    const template = passwordResetTemplate({
      resetUrl: "https://app.example.test/reset-password?token=synthetic",
      expiresMinutes: 30,
    });
    expect(template.key).toBe("auth.password-reset@1.0.0");
    expect(template.text).toContain("expires in 30 minutes");
    expect(template.html).not.toContain("pixel");
    expect(template.html).not.toContain("<script");
  });

  it("rejects non-HTTP reset protocols", () => {
    expect(() =>
      passwordResetTemplate({
        resetUrl: "javascript:alert(1)",
        expiresMinutes: 30,
      }),
    ).toThrow();
  });

  it.each(["localhost", "127.0.0.1"])(
    "accepts documented local reset host %s",
    (host) => {
      expect(() =>
        passwordResetTemplate({
          resetUrl: `http://${host}:3000/reset-password?token=synthetic`,
          expiresMinutes: 30,
        }),
      ).not.toThrow();
    },
  );

  it("rejects an arbitrary HTTP origin", () => {
    expect(() =>
      passwordResetTemplate({
        resetUrl: "http://example.test/reset-password?token=synthetic",
        expiresMinutes: 30,
      }),
    ).toThrow();
  });
});
