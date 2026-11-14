import { describe, expect, it } from "vitest";

import {
  desktopTokenMatches,
  isLocalModePath,
  localModeDecision,
} from "./app-mode";

const token = "t".repeat(64);

describe("local mode request policy (L1)", () => {
  it("compares the desktop token exactly", () => {
    expect(desktopTokenMatches(token, token)).toBe(true);
    expect(desktopTokenMatches(token, `${token}x`)).toBe(false);
    expect(desktopTokenMatches(token, "short")).toBe(false);
    expect(desktopTokenMatches(token, null)).toBe(false);
  });

  it("rejects requests without the token, except liveness", () => {
    expect(
      localModeDecision({
        pathname: "/app",
        expectedToken: token,
        providedToken: null,
      }),
    ).toEqual({ action: "reject" });
    expect(
      localModeDecision({
        pathname: "/api/projects/p1/generation-jobs/j1",
        expectedToken: token,
        providedToken: "wrong",
      }),
    ).toEqual({ action: "reject" });
    expect(
      localModeDecision({
        pathname: "/health/live",
        expectedToken: token,
        providedToken: null,
      }),
    ).toEqual({ action: "next" });
  });

  it("serves app, auth, legal and health paths and redirects marketing pages", () => {
    for (const path of [
      "/app",
      "/app/projects/p1",
      "/sign-in",
      "/reset-password",
      "/health/ready",
      "/legal/terms",
      "/help",
    ])
      expect(isLocalModePath(path)).toBe(true);
    for (const path of ["/", "/pricing", "/product/website", "/applications"])
      expect(isLocalModePath(path)).toBe(false);
    expect(
      localModeDecision({
        pathname: "/pricing",
        expectedToken: token,
        providedToken: token,
      }),
    ).toEqual({ action: "redirect", location: "/app" });
  });

  it("skips the token check when no token is configured (development)", () => {
    expect(
      localModeDecision({
        pathname: "/app",
        expectedToken: undefined,
        providedToken: null,
      }),
    ).toEqual({ action: "next" });
  });
});
