import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ getPrisma: vi.fn() }));

import { sessionCookiePolicy } from "./session";

describe("session cookie policy", () => {
  it("uses the __Secure- cookie only on https, matching Auth.js", () => {
    expect(sessionCookiePolicy("https://app.webcontentflow.com")).toEqual({
      name: "__Secure-authjs.session-token",
      secure: true,
    });
    // Desktop edition: production build served on loopback http.
    expect(sessionCookiePolicy("http://127.0.0.1:47831")).toEqual({
      name: "authjs.session-token",
      secure: false,
    });
    expect(sessionCookiePolicy(undefined).secure).toBe(false);
  });
});
