import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRobotsPolicy } from "./robots";

describe("marketing indexing policy", () => {
  it("disallows every crawler in staging even if indexing is requested", () => {
    expect(
      createRobotsPolicy({
        appEnv: "staging",
        indexingEnabled: true,
        applicationUrl: "https://staging.example.test",
      }),
    ).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("requires the explicit production indexing gate", () => {
    const disabled = createRobotsPolicy({
      appEnv: "production",
      indexingEnabled: false,
      applicationUrl: "https://example.test",
    });
    const enabled = createRobotsPolicy({
      appEnv: "production",
      indexingEnabled: true,
      applicationUrl: "https://example.test",
    });

    expect(disabled).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(enabled).toMatchObject({
      sitemap: "https://example.test/sitemap.xml",
    });
  });
});
