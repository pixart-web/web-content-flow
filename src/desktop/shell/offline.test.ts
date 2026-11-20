import { describe, expect, it } from "vitest";

import { isLoopbackHost, isLoopbackUrl } from "./offline";

describe("offline check (LF-21)", () => {
  it("accepts only this computer", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("127.10.0.4")).toBe(true);
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("::1")).toBe(true);
    expect(isLoopbackHost("10.0.0.2")).toBe(false);
    expect(isLoopbackHost("127.0.0.1.example.com")).toBe(false);
    expect(isLoopbackHost("example.com")).toBe(false);
  });

  it("checks window URLs", () => {
    expect(isLoopbackUrl("http://127.0.0.1:47831/app")).toBe(true);
    expect(isLoopbackUrl("ws://localhost:47831/_next/hmr")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:11434/api/tags")).toBe(true);
    expect(isLoopbackUrl("https://fonts.googleapis.com/css")).toBe(false);
    expect(isLoopbackUrl("http://127.0.0.1@evil.example/")).toBe(false);
    expect(isLoopbackUrl("file:///etc/passwd")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
});
