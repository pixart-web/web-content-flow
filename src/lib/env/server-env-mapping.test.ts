import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerEnv, serverEnvSchema } from "./server";

// getServerEnv() lists each variable explicitly; a key added to the schema but
// not to that list is silently ignored at runtime. This guards the mapping.
describe("getServerEnv mapping", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("reads every schema key from process.env", () => {
    const keys = Object.keys(serverEnvSchema.shape);
    const parse = vi
      .spyOn(serverEnvSchema, "parse")
      .mockImplementation((input) => input as never);
    const seen = getServerEnv() as unknown as Record<string, unknown>;
    parse.mockRestore();
    expect(keys.filter((key) => !(key in seen))).toEqual([]);
  });
});
