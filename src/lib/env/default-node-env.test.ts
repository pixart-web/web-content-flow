import { describe, expect, it } from "vitest";

import { defaultNodeEnvForLocalProcess } from "./default-node-env";

describe("defaultNodeEnvForLocalProcess", () => {
  it("keeps an explicit NODE_ENV", () => {
    expect(
      defaultNodeEnvForLocalProcess({ NODE_ENV: "test", APP_ENV: "staging" }),
    ).toBe("test");
  });

  it("defaults local runs to development", () => {
    expect(defaultNodeEnvForLocalProcess({})).toBe("development");
    expect(defaultNodeEnvForLocalProcess({ APP_ENV: "local" })).toBe(
      "development",
    );
  });

  it("never guesses for deployed environments", () => {
    expect(defaultNodeEnvForLocalProcess({ APP_ENV: "staging" })).toBe(
      undefined,
    );
    expect(defaultNodeEnvForLocalProcess({ APP_ENV: "production" })).toBe(
      undefined,
    );
  });
});
