import { describe, expect, it } from "vitest";

import { assertContextBudget } from "./generation-context";

describe("generation context budgeting", () => {
  it("rejects oversized context without truncating authoritative data", () => {
    const context = {
      schemaVersion: "1.0" as const,
      briefRevision: 1,
      brief: {},
      brandProfileVersionId: "profile-version",
      brandProfile: {},
      outputLanguage: "English",
      moduleRequest: { body: "x".repeat(1_000) },
      sourceContent: [],
    };

    expect(() => assertContextBudget(context as never, 10)).toThrowError(
      "REQUEST_TOO_LARGE",
    );
  });
});
